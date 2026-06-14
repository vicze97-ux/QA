import * as fs from 'fs';
import * as path from 'path';

const CAMPAIGN_DIR = process.env.CAMPAIGN_DIR ?? 'C:/Users/three/demtol/campaigns/example';
const SNAPSHOT_FILE = path.join(process.cwd(), 'test-results', '.canvas-snapshot.json');

export default async function globalTeardown() {
  if (!fs.existsSync(SNAPSHOT_FILE)) {
    console.warn('[teardown] No snapshot file found — skipping cleanup.');
    return;
  }

  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf-8')) as {
    canvases: string[];
    latestEventTs: string | null;
  };

  const canvasDir = path.join(CAMPAIGN_DIR, 'canvases');
  const eventsDb = path.join(CAMPAIGN_DIR, 'events.sqlite');

  // Delete canvas files created during the test run
  let deleted = 0;
  if (fs.existsSync(canvasDir)) {
    const current = fs.readdirSync(canvasDir).filter(f => f.endsWith('.json'));
    for (const file of current) {
      if (!snapshot.canvases.includes(file)) {
        fs.rmSync(path.join(canvasDir, file));
        deleted++;
      }
    }
  }
  console.log(`[teardown] Deleted ${deleted} test canvas file(s).`);

  // Purge events created during the test run
  let purged = 0;
  try {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(eventsDb);
    const cutoff = snapshot.latestEventTs;
    const result = cutoff
      ? db.prepare('DELETE FROM events WHERE timestamp > ?').run(cutoff)
      : db.prepare('DELETE FROM events').run();
    purged = (result as { changes: number }).changes;
    db.close();
  } catch {
    // Skip if schema differs or db locked
  }
  console.log(`[teardown] Purged ${purged} test event(s) from events.sqlite.`);

  // Remove snapshot
  fs.rmSync(SNAPSHOT_FILE);
}
