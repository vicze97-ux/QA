import * as fs from 'fs';
import * as path from 'path';

const CAMPAIGN_DIR = process.env.CAMPAIGN_DIR ?? '';

/**
 * Deletes canvas JSON files whose `data.name` matches any of the given names.
 * Used in test-level afterEach hooks as a redundant guard alongside globalTeardown.
 * No-ops silently if CAMPAIGN_DIR is unset or the canvas directory doesn't exist.
 */
export function deleteCanvasByName(names: string[]): void {
  if (!CAMPAIGN_DIR) return;
  const canvasDir = path.join(CAMPAIGN_DIR, 'canvases');
  if (!fs.existsSync(canvasDir)) return;

  const nameSet = new Set(names);
  for (const file of fs.readdirSync(canvasDir).filter(f => f.endsWith('.json'))) {
    const full = path.join(canvasDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(full, 'utf-8'));
      const name: string = data?.data?.name ?? '';
      if (nameSet.has(name)) fs.rmSync(full);
    } catch {
      // corrupt or locked file — skip
    }
  }
}
