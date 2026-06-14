import * as fs from 'fs';
import * as path from 'path';

const CAMPAIGN_DIR = process.env.CAMPAIGN_DIR ?? '';
const SNAPSHOT_FILE = path.join(process.cwd(), 'test-results', '.canvas-snapshot.json');

export default async function globalTeardown() {
  cleanupCanvases();
  cleanupEvents();
}

function cleanupCanvases(): void {
  if (!fs.existsSync(SNAPSHOT_FILE)) {
    console.warn('[teardown] No snapshot file found — skipping canvas cleanup.');
    return;
  }

  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf-8')) as {
    canvases: string[];
    latestEventTs: string | null;
  };

  if (!CAMPAIGN_DIR) {
    console.warn('[teardown] CAMPAIGN_DIR is not set — skipping canvas file cleanup.');
    fs.rmSync(SNAPSHOT_FILE);
    return;
  }

  const canvasDir = path.join(CAMPAIGN_DIR, 'canvases');
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
  fs.rmSync(SNAPSHOT_FILE);

  cleanupEvents(snapshot.latestEventTs);
}

function cleanupEvents(cutoff?: string | null): void {
  if (!CAMPAIGN_DIR) return;

  const nodeVersion = process.version; // e.g. "v22.5.0"
  const [major, minor] = nodeVersion.slice(1).split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 5)) {
    console.warn(
      `[teardown] WARNING: event cleanup requires Node.js >=22.5 (node:sqlite). ` +
      `Current: ${nodeVersion}. Skipping — test events may remain in events.sqlite.`
    );
    return;
  }

  const eventsDb = path.join(CAMPAIGN_DIR, 'events.sqlite');
  let purged = 0;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(eventsDb);
    const result = cutoff
      ? db.prepare('DELETE FROM events WHERE timestamp > ?').run(cutoff)
      : db.prepare('DELETE FROM events').run();
    purged = (result as { changes: number }).changes;
    db.close();
  } catch (err: any) {
    console.warn(`[teardown] Event cleanup failed: ${err?.message ?? err}`);
  }
  console.log(`[teardown] Purged ${purged} test event(s) from events.sqlite.`);
}
