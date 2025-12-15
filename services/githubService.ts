import { RepositoryNode } from '../types';

/**
 * Fetches the pre-analyzed ecosystem data from the static JSON file.
 * This file is updated daily via GitHub Actions.
 */
export async function fetchEcosystemData(): Promise<{ repos: RepositoryNode[], timestamp: string }> {
  // We use a cache-busting parameter to ensure we get the latest version if the user has the tab open
  // although Vercel's deployment URLs usually handle this, it's safer for development/updates.
  try {
    const response = await fetch(`/data.json?t=${new Date().getTime()}`);
    
    if (!response.ok) {
       // Fallback for local development if data.json hasn't been generated yet
       if (process.env.NODE_ENV === 'development') {
         console.warn("data.json not found. Please run 'node scripts/fetch-data.mjs' locally.");
         return { repos: [], timestamp: new Date().toISOString() };
       }
       throw new Error(`Failed to load data: ${response.status}`);
    }

    const data = await response.json();
    return {
      repos: data.repos || [],
      timestamp: data.timestamp
    };
  } catch (error) {
    console.error("Error loading ecosystem data:", error);
    throw error;
  }
}