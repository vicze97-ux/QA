import * as fs from 'fs';
import * as path from 'path';

/**
 * Locator Health Monitor
 *
 * Tracks which locators fail and which fallback strategies succeed across a test run.
 *
 * Parallel-worker safety: each worker process writes to its own PID-scoped temp file
 * (.locator-health-data-<pid>.json). saveReport() merges all worker files into a single
 * final report and cleans up the temp files. This eliminates the JSON-corruption race
 * condition that occurred when all workers wrote to the same file simultaneously.
 */
export class LocatorHealthMonitor {
  private static instance: LocatorHealthMonitor;
  private healthData: Map<string, LocatorHealth>;
  private readonly reportPath: string;
  private readonly tempDataPath: string;

  private constructor() {
    this.healthData = new Map();
    this.reportPath = path.join(process.cwd(), 'test-results', 'locator-health-report.json');
    // Per-PID file — unique per worker process, eliminates write conflicts.
    this.tempDataPath = path.join(
      process.cwd(),
      'test-results',
      `.locator-health-data-${process.pid}.json`
    );
    this.loadTempData();
  }

  static getInstance(): LocatorHealthMonitor {
    if (!LocatorHealthMonitor.instance) {
      LocatorHealthMonitor.instance = new LocatorHealthMonitor();
    }
    return LocatorHealthMonitor.instance;
  }

  recordAttempt(
    elementDescription: string,
    strategyIndex: number,
    strategyDescription: string,
    success: boolean,
    errorMessage?: string
  ): void {
    if (!this.healthData.has(elementDescription)) {
      this.healthData.set(elementDescription, {
        elementDescription,
        totalAttempts: 0,
        successfulAttempts: 0,
        failedAttempts: 0,
        strategies: [],
        lastUpdated: new Date().toISOString(),
      });
    }

    const health = this.healthData.get(elementDescription)!;
    health.totalAttempts++;
    if (success) health.successfulAttempts++;
    else health.failedAttempts++;

    let strategy = health.strategies.find(s => s.index === strategyIndex);
    if (!strategy) {
      strategy = { index: strategyIndex, description: strategyDescription, successCount: 0, failureCount: 0, lastError: null };
      health.strategies.push(strategy);
    }

    if (success) strategy.successCount++;
    else { strategy.failureCount++; strategy.lastError = errorMessage ?? 'Unknown error'; }

    health.lastUpdated = new Date().toISOString();
    this.saveTempData();
  }

  getElementHealth(elementDescription: string): LocatorHealth | undefined {
    return this.healthData.get(elementDescription);
  }

  getProblematicElements(): LocatorHealth[] {
    return Array.from(this.healthData.values()).filter(h => {
      const primary = h.strategies.find(s => s.index === 0);
      return primary && primary.failureCount > 0;
    });
  }

  /**
   * Merge all worker temp files, write the final report, then delete temp files.
   * Call this only from globalTeardown — it runs in a single process after all workers finish.
   */
  saveReport(): void {
    const merged = this.mergeWorkerFiles();

    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalElements: merged.size,
        problematicElements: countProblematic(merged),
        healthyElements: merged.size - countProblematic(merged),
      },
      elements: Array.from(merged.values()).map(h => ({
        ...h,
        healthScore: this.calculateHealthScore(h),
        recommendation: this.getRecommendation(h),
      })),
    };

    const dir = path.dirname(this.reportPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.reportPath, JSON.stringify(report, null, 2));
    console.log(`Locator health report saved to: ${this.reportPath}`);

    this.deleteAllTempFiles();
  }

  printSummary(): void {
    const problematic = this.getProblematicElements();
    console.log('\n===== LOCATOR HEALTH SUMMARY =====');
    console.log(`Total elements monitored: ${this.healthData.size}`);
    console.log(`Healthy elements: ${this.healthData.size - problematic.length}`);
    console.log(`Problematic elements: ${problematic.length}`);
    if (problematic.length > 0) {
      console.log('\nElements needing attention:');
      problematic.forEach(h => {
        console.log(`  - ${h.elementDescription} (Health: ${this.calculateHealthScore(h)}%)`);
        console.log(`    Primary strategy failures: ${h.strategies[0]?.failureCount ?? 0}`);
        console.log(`    Recommendation: ${this.getRecommendation(h)}`);
      });
    }
    console.log('=====================================\n');
  }

  // ── private helpers ────────────────────────────────────────────────────────

  private loadTempData(): void {
    try {
      if (fs.existsSync(this.tempDataPath)) {
        const data = JSON.parse(fs.readFileSync(this.tempDataPath, 'utf-8'));
        this.healthData = new Map(Object.entries(data));
      }
    } catch {
      // corrupt or missing — start fresh
    }
  }

  private saveTempData(): void {
    try {
      const dir = path.dirname(this.tempDataPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.tempDataPath, JSON.stringify(Object.fromEntries(this.healthData), null, 2));
    } catch {
      // best-effort
    }
  }

  /**
   * Collect all .locator-health-data-<pid>.json files in test-results/ and merge
   * their health entries. Entries for the same element are summed across workers.
   */
  private mergeWorkerFiles(): Map<string, LocatorHealth> {
    const dir = path.dirname(this.tempDataPath);
    const merged: Map<string, LocatorHealth> = new Map(this.healthData);

    if (!fs.existsSync(dir)) return merged;

    for (const file of fs.readdirSync(dir)) {
      if (!file.match(/^\.locator-health-data-\d+\.json$/)) continue;
      const full = path.join(dir, file);
      // skip own file — already loaded into this.healthData
      if (full === this.tempDataPath) continue;
      try {
        const entries: Record<string, LocatorHealth> = JSON.parse(fs.readFileSync(full, 'utf-8'));
        for (const [key, incoming] of Object.entries(entries)) {
          const existing = merged.get(key);
          if (!existing) {
            merged.set(key, incoming);
          } else {
            existing.totalAttempts += incoming.totalAttempts;
            existing.successfulAttempts += incoming.successfulAttempts;
            existing.failedAttempts += incoming.failedAttempts;
            for (const inStrat of incoming.strategies) {
              const exStrat = existing.strategies.find(s => s.index === inStrat.index);
              if (!exStrat) {
                existing.strategies.push({ ...inStrat });
              } else {
                exStrat.successCount += inStrat.successCount;
                exStrat.failureCount += inStrat.failureCount;
                if (inStrat.lastError) exStrat.lastError = inStrat.lastError;
              }
            }
          }
        }
      } catch {
        // corrupt worker file — skip
      }
    }

    return merged;
  }

  private deleteAllTempFiles(): void {
    const dir = path.dirname(this.tempDataPath);
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir)) {
      if (!file.match(/^\.locator-health-data-\d+\.json$/)) continue;
      try { fs.unlinkSync(path.join(dir, file)); } catch { /* skip */ }
    }
  }

  private calculateHealthScore(health: LocatorHealth): number {
    if (health.totalAttempts === 0) return 100;
    const primary = health.strategies.find(s => s.index === 0);
    if (!primary) return 0;
    const total = primary.successCount + primary.failureCount;
    return total === 0 ? 100 : Math.round((primary.successCount / total) * 100);
  }

  private getRecommendation(health: LocatorHealth): string {
    const score = this.calculateHealthScore(health);
    if (score === 100) return 'Healthy - No action needed';
    if (score >= 80) return 'Monitor - Primary locator occasionally fails';
    if (score >= 50) return 'Update Recommended - Consider updating primary locator';
    return 'Critical - Primary locator frequently fails, update immediately';
  }
}

function countProblematic(data: Map<string, LocatorHealth>): number {
  return Array.from(data.values()).filter(h => {
    const p = h.strategies.find(s => s.index === 0);
    return p && p.failureCount > 0;
  }).length;
}

interface LocatorHealth {
  elementDescription: string;
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  strategies: StrategyHealth[];
  lastUpdated: string;
}

interface StrategyHealth {
  index: number;
  description: string;
  successCount: number;
  failureCount: number;
  lastError: string | null;
}
