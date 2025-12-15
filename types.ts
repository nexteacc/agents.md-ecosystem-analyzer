export interface RepositoryNode {
  nameWithOwner: string;
  url: string;
  description: string | null;
  stargazerCount: number;
  forkCount: number;
  watchers: {
    totalCount: number;
  };
  issues: {
    totalCount: number;
  };
  pullRequests: {
    totalCount: number;
  };
  primaryLanguage: {
    name: string;
    color?: string;
  } | null;
  repositoryTopics: {
    nodes: {
      topic: {
        name: string;
      };
    }[];
  };
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  isFork: boolean;
  licenseInfo: {
    name: string;
    spdxId?: string;
  } | null;
}

export interface SearchResponse {
  data: {
    search: {
      repositoryCount: number;
      edges: {
        node: RepositoryNode;
      }[];
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
    };
  };
  errors?: { message: string }[];
}

export interface AnalysisStats {
  totalRepos: number;
  totalStars: number;
  totalForks: number;
  avgStars: number;
  topLanguages: { name: string; count: number; color?: string }[];
  topTopics: { name: string; count: number }[];
  licenseDistribution: { name: string; count: number }[];
}