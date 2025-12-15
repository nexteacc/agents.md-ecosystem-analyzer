import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * DEPRECATED
 * 
 * We have migrated to a "Git Scraping" architecture.
 * Data is now fetched via GitHub Actions (scripts/fetch-data.mjs)
 * and served statically from /public/data.json.
 * 
 * This prevents timeouts for large datasets and ensures better performance.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(404).json({ 
    error: 'API deprecated. Please fetch /data.json instead.',
    migration_note: 'The ecosystem analysis is now generated statically via GitHub Actions.' 
  });
}
