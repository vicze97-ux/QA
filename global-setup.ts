import * as fs from 'fs';
import * as path from 'path';

const CAMPAIGN_DIR = process.env.CAMPAIGN_DIR ?? 'C:/Users/three/demtol/campaigns/example';
const SNAPSHOT_FILE = path.join(process.cwd(), 'test-results', '.canvas-snapshot.json');

export default async function globalSetup() {
  const canvasDir = path.join(CAMPAIGN_DIR, 'canvases');
  const eventsDb = path.join(CAMPAIGN_DIR, 'events.sqlite');

  const existingCanvases = fs.existsSync(canvasDir)
    ? fs.readdirSync(canvasDir).filter(f => f.endsWith('.json'))
    : [];

  // Record the most recent event timestamp so teardown only clears events from this run
  let latestEventTs: string | null = null;
  try {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(eventsDb, { readonly: true });
    const row = db.prepare('SELECT MAX(timestamp) as ts FROM events').get() as { ts: string | null };
    latestEventTs = row?.ts ?? null;
    db.close();
  } catch {
    // events.sqlite may not have the expected schema — skip
  }

  const snapshot = { canvases: existingCanvases, latestEventTs };
  fs.mkdirSync(path.dirname(SNAPSHOT_FILE), { recursive: true });
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2));

  console.log(`[setup] Snapshotted ${existingCanvases.length} existing canvas(es).`);
}
