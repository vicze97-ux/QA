import * as fs from 'fs';
import * as path from 'path';

const CAMPAIGN_DIR = process.env.CAMPAIGN_DIR ?? 'C:/Users/three/demtol/campaigns/example';
const SNAPSHOT_FILE = path.join(process.cwd(), 'test-results', '.canvas-snapshot.json');

// Canvas names that are known test data — purged on every setup run
const TEST_NAME_PREFIXES = ['Test-', 'AlphaVault', 'BetaShore', 'GammaRidge', 'DeltaFort', 'Ironveil', 'Stormhaven'];

function isTestCanvas(filePath: string): boolean {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const name: string = data?.data?.name ?? '';
    return TEST_NAME_PREFIXES.some(prefix => name.startsWith(prefix));
  } catch {
    return false;
  }
}

export default async function globalSetup() {
  const canvasDir = path.join(CAMPAIGN_DIR, 'canvases');
  const eventsDb = path.join(CAMPAIGN_DIR, 'events.sqlite');

  // Pre-cleanup: remove any leftover test canvases from previous interrupted runs
  let preDeleted = 0;
  if (fs.existsSync(canvasDir)) {
    for (const file of fs.readdirSync(canvasDir).filter(f => f.endsWith('.json'))) {
      const full = path.join(canvasDir, file);
      if (isTestCanvas(full)) {
        fs.rmSync(full);
        preDeleted++;
      }
    }
  }
  if (preDeleted > 0) {
    console.log(`[setup] Pre-cleaned ${preDeleted} leftover test canvas(es).`);
  }

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
