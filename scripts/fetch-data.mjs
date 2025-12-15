import fs from 'fs';
import path from 'path';

const GITHUB_TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN;
const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';
const GITHUB_REST_SEARCH_URL = 'https://api.github.com/search/code';

if (!GITHUB_TOKEN) {
  console.error('Error: GH_PAT or GITHUB_TOKEN environment variable is required.');
  // @ts-ignore
  process.exit(1);
}

const NODES_QUERY = `
  query GetRepositoryDetails($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Repository {
        nameWithOwner
        url
        description
        stargazerCount
        forkCount
        watchers { totalCount }
        issues { totalCount }
        pullRequests { totalCount }
        primaryLanguage { name, color }
        repositoryTopics(first: 10) {
          nodes { topic { name } }
        }
        createdAt
        updatedAt
        isArchived
        isFork
        licenseInfo { name, spdxId }
      }
    }
  }
`;

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Searches specific query segment handling pagination up to 1000 items (API Limit)
 */
async function runSearchSegment(token, queryStr, allNodeIds) {
  let page = 1;
  const perPage = 100;
  let keepFetching = true;

  console.log(`   Running segment: "${queryStr}"`);

  while (keepFetching) {
    // Construct URL with proper encoding
    const q = `filename:agents.md ${queryStr}`;
    const url = `${GITHUB_REST_SEARCH_URL}?q=${encodeURIComponent(q)}&per_page=${perPage}&page=${page}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Agents-MD-Analyzer-Bot'
        },
      });

      if (response.status === 403 || response.status === 429) {
        const resetTime = response.headers.get('x-ratelimit-reset');
        const waitTime = resetTime ? (parseInt(resetTime) * 1000) - Date.now() + 1000 : 60000;
        console.warn(`      ⚠️ Rate limit hit. Waiting ${Math.ceil(waitTime / 1000)}s...`);
        await wait(waitTime);
        continue; // Retry the same page
      }

      if (!response.ok) {
        // 422 usually means "Validation Failed", sometimes happens if page > 10 for broad queries
        if (response.status === 422) {
          console.log('      ℹ️ Search depth limit reached (1000 results) for this segment.');
        } else {
          console.error(`      ❌ Error: ${response.status} ${response.statusText}`);
        }
        break;
      }

      const data = await response.json();
      const items = data.items || [];

      if (items.length === 0) {
        keepFetching = false;
      } else {
        let newItems = 0;
        for (const item of items) {
          if (item.repository?.node_id) {
            if (!allNodeIds.has(item.repository.node_id)) {
              allNodeIds.add(item.repository.node_id);
              newItems++;
            }
          }
        }

        console.log(`      Page ${page}: Found ${items.length} items (${newItems} new unique).`);

        page++;
        // Hard limit by GitHub API
        if (page > 10) {
          console.log('      ℹ️ Segment limit reached (1000 results).');
          keepFetching = false;
        }
      }

      // Polite delay between search requests (30 requests/min limit)
      await wait(3000);

    } catch (e) {
      console.error("      ❌ Network error:", e);
      break;
    }
  }
}

/**
 * RECURSIVE SEARCH STRATEGY (Adaptive Bisection)
 * 
 * Instead of guessing step sizes, we ask GitHub: "How many files in this range?"
 * - If count <= 1000: Fetch them all. (Safe)
 * - If count > 1000: Split range in half and recurse. (Adaptive)
 * 
 * Logic covers 0 to 100KB (covering 99.9% of all agents.md files).
 * This works like a "Daily Full Scan" that scales to millions of files
 * by trading time (more requests) for space (unlimited result capacity).
 */
async function recursiveSearch(token, minSize, maxSize, allNodeIds) {
  const rangeStr = `${minSize}..${maxSize}`;
  const query = `fork:false size:${rangeStr}`;

  // 1. Probe: Get just the count (page 1, per_page 1) to be fast
  const probeUrl = `${GITHUB_REST_SEARCH_URL}?q=${encodeURIComponent(query)}&per_page=1`;

  try {
    const response = await fetch(probeUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Agents-MD-Analyzer-Bot'
      },
    });

    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        // Rate limit handling
        const resetTime = response.headers.get('x-ratelimit-reset');
        const waitTime = resetTime ? (parseInt(resetTime) * 1000) - Date.now() + 1000 : 60000;
        console.warn(`      ⚠️ Rate limit hit. Waiting ${Math.ceil(waitTime / 1000)}s...`);
        await wait(waitTime);
        return recursiveSearch(token, minSize, maxSize, allNodeIds); // Retry
      }
      console.error(`      ❌ Probe Error: ${response.status}`);
      return;
    }

    const data = await response.json();
    const totalCount = data.total_count || 0;

    console.log(`   🔎 Probe ${rangeStr}: ${totalCount} items`);

    // 2. Decision logic
    if (totalCount === 0) {
      return; // Empty range, skip
    }

    if (totalCount <= 1000) {
      // SAFE ZONE: Fetch all items in this range
      console.log(`      ✅ Fetching all ${totalCount} items in range ${rangeStr}...`);
      await runSearchSegment(token, `${query} sort:indexed`, allNodeIds);
    } else {
      // DANGER ZONE: Too many items. Split and recurse.
      if (minSize === maxSize) {
        console.warn(`      ⚠️ Critical clustering: >1000 items at exact size ${minSize} bytes. Fetching top 1000.`);
        // Cannot split further. Best effort: fetch top 1000 sorted by index.
        await runSearchSegment(token, `${query} sort:indexed`, allNodeIds);
        return;
      }

      const mid = Math.floor((minSize + maxSize) / 2);
      console.log(`      ⚡ Split: ${totalCount} > 1000. Bisecting -> [${minSize}..${mid}] & [${mid + 1}..${maxSize}]`);

      await recursiveSearch(token, minSize, mid, allNodeIds);
      await recursiveSearch(token, mid + 1, maxSize, allNodeIds);
    }

  } catch (e) {
    console.error("      ❌ Network error during recursive search:", e);
  }
}

async function searchAllRepos(token) {
  const allNodeIds = new Set();

  console.log(`🔍 Starting Adaptive Recursive Search for "filename:agents.md"...`);
  console.log(`   Scope: 0KB to 100KB (Full Ecosystem Scan)`);

  // Recursively allow the algorithm to find data wherever it is.
  // This handles both "Small Templates" (1KB) and "Huge Configs" (50KB) equally well.
  await recursiveSearch(token, 0, 100000, allNodeIds);

  console.log(`✅ Discovery complete. Total unique repos found: ${allNodeIds.size}`);
  return Array.from(allNodeIds);
}

async function fetchDetailsForNodes(token, ids) {
  // If we have too many IDs, we process them all in batches of 50
  // GraphQL limit is 5000 points per hour.
  // 50 nodes query is ~2 points. 
  // We can handle thousands of repos easily.
  const BATCH_SIZE = 50;
  let allRepos = [];

  if (ids.length === 0) return [];

  console.log(`📦 Fetching details for ${ids.length} repositories using GraphQL...`);

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batchIds = ids.slice(i, i + BATCH_SIZE);

    // Simple progress log
    if (i % 200 === 0) {
      console.log(`   Progress: ${i}/${ids.length} repos...`);
    }

    try {
      const response = await fetch(GITHUB_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Agents-MD-Analyzer-Bot'
        },
        body: JSON.stringify({
          query: NODES_QUERY,
          variables: { ids: batchIds },
        }),
      });

      if (response.status === 403 || response.status === 429) {
        console.warn("⚠️ Rate limit hit during GraphQL fetch. Waiting 60s...");
        await wait(60000);
        i -= BATCH_SIZE; // Retry this batch
        continue;
      }

      if (!response.ok) {
        console.error(`❌ GraphQL Error: ${response.status}`);
        continue;
      }

      const result = await response.json();
      if (result.errors) {
        // Sometimes individual nodes are not found (deleted/private), we just log and skip
        // console.error('GraphQL Partial Errors:', result.errors.length);
      }

      const nodes = result.data?.nodes || [];
      const validNodes = nodes.filter((n) => n && n.nameWithOwner);
      allRepos = [...allRepos, ...validNodes];

      // Delay to be safe with secondary limits
      await wait(300);

    } catch (e) {
      console.error("❌ Batch fetch exception:", e);
    }
  }

  return allRepos;
}

async function main() {
  try {
    // Ensure public directory exists
    // @ts-ignore
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir);
    }

    // 1. Discovery (Sharded)
    const ids = await searchAllRepos(GITHUB_TOKEN);

    if (ids.length === 0) {
      console.warn("⚠️ No repositories found. Skipping update.");
      // Create empty file to avoid frontend errors if it's the first run
      if (!fs.existsSync(path.join(publicDir, 'data.json'))) {
        fs.writeFileSync(path.join(publicDir, 'data.json'), JSON.stringify({
          timestamp: new Date().toISOString(),
          count: 0,
          repos: []
        }));
      }
      return;
    }

    // 2. Enrichment
    const repos = await fetchDetailsForNodes(GITHUB_TOKEN, ids);

    // 3. Filtering & Quality Control
    // We cannot filter by stars in the Search API (GitHub limitation for code search),
    // but we can filter here to keep the dashboard high-quality.
    // Logic: Keep if (Stars > 0) OR (Forks > 0) OR (Created in last 7 days)
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const now = new Date().getTime();

    const highQualityRepos = repos.filter(repo => {
      const hasStars = repo.stargazerCount > 0;
      const hasForks = repo.forkCount > 0;
      const isNew = (now - new Date(repo.createdAt).getTime()) < ONE_WEEK_MS;

      return hasStars || hasForks || isNew;
    });

    // 4. Save to disk
    const output = {
      timestamp: new Date().toISOString(),
      count: highQualityRepos.length,
      repos: highQualityRepos
    };

    const outputPath = path.join(publicDir, 'data.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(`✅ Successfully saved analysis for ${highQualityRepos.length} repos to ${outputPath}`);

  } catch (error) {
    console.error("❌ Fatal error:", error);
    // @ts-ignore
    process.exit(1);
  }
}

main();