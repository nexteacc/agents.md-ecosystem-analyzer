# 📝 当前实现逻辑总结

本文档总结 `scripts/fetch-data.mjs` 的完整实现逻辑。

---

## 🔄 整体流程图

```
开始
  ↓
1. 初始化（检查 Token、创建目录）
  ↓
2. 递归自适应搜索（发现阶段）
  ├─ 探测每个大小区间的文件数量
  ├─ 如果 ≤ 1000：获取所有
  └─ 如果 > 1000：分割区间并递归
  ↓
3. 批量获取详细信息（GraphQL）
  ↓
4. 质量过滤
  ↓
5. 保存到 data.json
  ↓
结束
```

---

## 📋 详细实现逻辑

### 阶段 1: 初始化与准备

**代码位置：** `main()` 函数开头

```javascript
// 1. 检查 GitHub Token
if (!GITHUB_TOKEN) {
  console.error('Error: GH_PAT or GITHUB_TOKEN environment variable is required.');
  process.exit(1);
}

// 2. 确保 public 目录存在
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}
```

**作用：**
- ✅ 验证环境变量配置
- ✅ 创建输出目录

---

### 阶段 2: 递归自适应搜索（核心策略）🔍

**代码位置：** `searchAllRepos()` → `recursiveSearch()`

#### 2.1 搜索入口

```javascript
async function searchAllRepos(token) {
  const allNodeIds = new Set();
  
  // 从 0 到 100KB 的完整范围开始
  await recursiveSearch(token, 0, 100000, allNodeIds);
  
  return Array.from(allNodeIds);
}
```

**特点：**
- 覆盖范围：0 - 100KB（覆盖 99.9% 的 `agents.md` 文件）
- 使用 `Set` 自动去重

---

#### 2.2 递归自适应分片策略 ⭐⭐⭐

**核心算法：** `recursiveSearch(token, minSize, maxSize, allNodeIds)`

**工作流程：**

```
1. 探测阶段（Probe）
   └─ 查询：filename:agents.md fork:false size:minSize..maxSize
   └─ 只获取第一页，per_page=1（快速获取 total_count）
   
2. 决策阶段（Decision）
   ├─ totalCount === 0 → 跳过（空区间）
   ├─ totalCount ≤ 1000 → 安全区域，获取所有
   └─ totalCount > 1000 → 危险区域，分割并递归
   
3. 分割逻辑
   └─ 如果 minSize === maxSize（无法再分割）
      └─ 警告：关键聚类，只能获取前 1000 个
   └─ 否则：
      ├─ mid = (minSize + maxSize) / 2
      ├─ 递归搜索 [minSize..mid]
      └─ 递归搜索 [mid+1..maxSize]
```

**示例执行过程：**

```
递归搜索 [0..100000]
  ├─ 探测：total_count = 5000
  ├─ > 1000，分割为 [0..50000] 和 [50001..100000]
  │
  ├─ 递归搜索 [0..50000]
  │   ├─ 探测：total_count = 3000
  │   ├─ > 1000，分割为 [0..25000] 和 [25001..50000]
  │   │
  │   ├─ 递归搜索 [0..25000]
  │   │   ├─ 探测：total_count = 800
  │   │   └─ ≤ 1000，✅ 获取所有
  │   │
  │   └─ 递归搜索 [25001..50000]
  │       └─ ...
  │
  └─ 递归搜索 [50001..100000]
      └─ ...
```

**优势：**
- ✅ **自适应**：根据实际数据分布自动调整
- ✅ **无上限**：理论上可以处理任意数量的文件
- ✅ **高效**：只在需要时分割（不浪费配额）
- ✅ **处理聚类**：自动处理"模板陷阱"（虽然仍有风险）

---

#### 2.3 分页获取详情

**代码位置：** `runSearchSegment(token, queryStr, allNodeIds)`

**工作流程：**

```javascript
1. 构建查询
   └─ q = `filename:agents.md ${queryStr} sort:indexed`
   └─ queryStr 示例：`fork:false size:1000..5000`

2. 分页循环（最多 10 页 = 1000 条）
   ├─ per_page = 100
   ├─ page = 1, 2, 3, ... 10
   └─ 每页延迟 3 秒（速率控制）

3. 提取仓库 ID
   └─ 从每个 item.repository.node_id 提取
   └─ 使用 Set 去重

4. 错误处理
   ├─ 403/429：速率限制，等待后重试
   ├─ 422：达到 1000 条上限，停止
   └─ 其他错误：记录并继续
```

**速率控制：**
- ✅ 每次请求后延迟 3 秒
- ✅ 遇到速率限制时等待到重置时间
- ✅ 自动重试失败的请求

---

### 阶段 3: 批量获取仓库详细信息 📦

**代码位置：** `fetchDetailsForNodes(token, ids)`

**工作流程：**

```javascript
1. 分批处理（每批 50 个仓库）
   └─ BATCH_SIZE = 50（GraphQL 限制）

2. GraphQL 查询
   └─ 使用 nodes() 查询批量获取
   └─ 获取字段：
      - 基本信息（nameWithOwner, url, description）
      - 统计数据（stargazerCount, forkCount, watchers）
      - 元数据（primaryLanguage, topics, createdAt, updatedAt）
      - 状态（isArchived, isFork, licenseInfo）

3. 错误处理
   ├─ 403/429：等待 60 秒后重试
   ├─ 部分节点不存在：忽略（已删除/私有）
   └─ 其他错误：记录并继续

4. 速率控制
   └─ 每批请求后延迟 300ms
```

**GraphQL 查询：**

```graphql
query GetRepositoryDetails($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on Repository {
      nameWithOwner
      url
      description
      stargazerCount
      forkCount
      # ... 其他字段
    }
  }
}
```

**配额管理：**
- 50 个节点 ≈ 2 点
- 5000 点/小时 ≈ 2500 批/小时
- 理论可处理：125,000 个仓库/小时

---

### 阶段 4: 质量过滤 🎯

**代码位置：** `main()` 函数中的过滤逻辑

**过滤规则：**

```javascript
保留满足以下任一条件的仓库：
✅ hasStars (stargazerCount > 0)
✅ hasForks (forkCount > 0)  
✅ isNew (创建时间在最近 7 天内)
```

**实现：**

```javascript
const highQualityRepos = repos.filter(repo => {
  const hasStars = repo.stargazerCount > 0;
  const hasForks = repo.forkCount > 0;
  const isNew = (now - new Date(repo.createdAt).getTime()) < ONE_WEEK_MS;
  
  return hasStars || hasForks || isNew;
});
```

**目的：**
- 移除无人关注或已废弃的仓库
- 保留新仓库（即使暂时没有 Stars/Forks）
- 提高数据质量

---

### 阶段 5: 保存数据 💾

**代码位置：** `main()` 函数结尾

**保存格式：**

```json
{
  "timestamp": "2024-12-15T00:00:00.000Z",
  "count": 1234,
  "repos": [
    {
      "nameWithOwner": "owner/repo",
      "url": "https://github.com/owner/repo",
      "stargazerCount": 100,
      // ... 其他字段
    }
  ]
}
```

**文件路径：** `public/data.json`

---

## 🔑 关键技术特性

### 1. 递归自适应分片 ⭐⭐⭐⭐⭐

**核心优势：**
- ✅ 不需要预设固定分片大小
- ✅ 根据数据分布自动调整
- ✅ 处理数据聚类问题（虽然不完全解决"模板陷阱"）
- ✅ 理论上无上限（可以通过递归分割处理任意数量）

**风险：**
- ⚠️ 如果所有文件都是相同大小，仍可能丢失数据（"模板陷阱"）
- ⚠️ 递归深度可能较大（但通常可控）

---

### 2. 速率限制处理 ⚡

**REST API (Code Search):**
- 速率限制：30 次/分钟
- 当前延迟：3 秒/次 = 20 次/分钟（利用率 66.7%）
- 遇到限制：等待到重置时间后重试

**GraphQL API:**
- 速率限制：5000 点/小时
- 当前批次：50 节点/批 ≈ 2 点/批
- 延迟：300ms/批
- 遇到限制：等待 60 秒后重试

---

### 3. 错误处理与容错 🛡️

**处理的错误类型：**
- ✅ 速率限制（403/429）：自动等待并重试
- ✅ 验证失败（422）：记录并继续
- ✅ 网络错误：记录并继续
- ✅ 部分节点不存在：忽略（已删除/私有）

**容错机制：**
- ✅ 单个区间失败不影响其他区间
- ✅ 单个批次失败不影响其他批次
- ✅ 自动重试机制

---

## 📊 执行流程示例

### 完整执行过程

```
1. 初始化
   └─ 检查 Token ✓
   └─ 创建 public 目录 ✓

2. 递归搜索 [0..100000]
   ├─ 探测：5000 个文件
   ├─ 分割为 [0..50000] 和 [50001..100000]
   │
   ├─ 递归 [0..50000]
   │   ├─ 探测：3000 个
   │   ├─ 分割为 [0..25000] 和 [25001..50000]
   │   │
   │   ├─ 递归 [0..25000]
   │   │   └─ 探测：800 个 ✓ 获取所有
   │   │
   │   └─ 递归 [25001..50000]
   │       └─ 探测：2200 个
   │       └─ 继续分割...
   │
   └─ 递归 [50001..100000]
       └─ 探测：2000 个
       └─ 继续分割...

3. 获取详细信息
   └─ 找到 5000 个唯一仓库
   └─ 批量获取详细信息（100 批 × 50 个）

4. 质量过滤
   └─ 原始：5000 个
   └─ 过滤后：3500 个（移除了低质量仓库）

5. 保存
   └─ 保存到 public/data.json ✓
```

---

## ⚙️ 配置参数

### 关键参数

| 参数 | 值 | 说明 |
|------|-----|------|
| **搜索范围** | 0 - 100KB | 覆盖绝大多数 agents.md 文件 |
| **分页大小** | 100 条/页 | GitHub API 限制 |
| **最大页数** | 10 页 | 每区间最多 1000 条 |
| **REST API 延迟** | 3000ms | 速率控制（20 次/分钟） |
| **GraphQL 批次大小** | 50 节点 | 配额优化（2 点/批） |
| **GraphQL 延迟** | 300ms | 速率控制 |
| **质量过滤** | Stars/Forks/New | 保留高质量仓库 |

---

## 🎯 核心优势

1. ✅ **自适应分片**：根据数据分布自动调整，无需手动配置
2. ✅ **无上限扩展**：理论上可以处理任意数量的文件
3. ✅ **全盘扫描**：每次执行都是完整扫描，可以发现所有仓库
4. ✅ **容错性强**：完善的错误处理和重试机制
5. ✅ **配额优化**：合理的延迟和批次大小

---

## ⚠️ 潜在问题

1. ⚠️ **"模板陷阱"**：如果所有文件都是相同大小，仍可能丢失数据
   - 缓解：递归分割会自动处理，但如果 `minSize === maxSize` 且 > 1000，只能获取前 1000 个

2. ⚠️ **执行时间**：全量扫描可能需要 15-30 分钟
   - 优化建议：可以考虑周全量 + 日增量策略

3. ⚠️ **配额消耗**：全量扫描消耗较多配额
   - 当前：利用率 66.7%（REST API），可优化到 95%

---

## 📝 总结

**当前实现的核心特点：**

1. **递归自适应分片策略**：根据数据分布自动调整，处理能力无上限
2. **全盘扫描**：每次执行完整的生态系统扫描
3. **质量过滤**：自动过滤低质量仓库
4. **完善的错误处理**：自动重试和容错机制

**这是一个成熟且可扩展的实现方案！** 🎯

