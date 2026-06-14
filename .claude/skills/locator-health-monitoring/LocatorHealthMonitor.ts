import * as fs from 'fs';
import * as path from 'path';

/**
 * Locator Health Monitor
 * Tracks which locators fail and which fallback strategies succeed
 * Helps identify patterns and prioritize locator updates
 */
export class LocatorHealthMonitor {
  private static instance: LocatorHealthMonitor;
  private healthData: Map<string, LocatorHealth>;
  private reportPath: string;
  private tempDataPath: string;

  private constructor() {
    this.healthData = new Map();
    this.reportPath = path.join(process.cwd(), 'test-results', 'locator-health-report.json');
    this.tempDataPath = path.join(process.cwd(), 'test-results', '.locator-health-data.json');

    // Load existing data if available (for accumulation across test runs)
    this.loadTempData();
  }

  static getInstance(): LocatorHealthMonitor {
    if (!LocatorHealthMonitor.instance) {
      LocatorHealthMonitor.instance = new LocatorHealthMonitor();
    }
    return LocatorHealthMonitor.instance;
  }

  /**
   * Record a locator attempt
   */
  recordAttempt(
    elementDescription: string,
    strategyIndex: number,
    strategyDescription: string,
    success: boolean,
    errorMessage?: string
  ) {
    if (!this.healthData.has(elementDescription)) {
      this.healthData.set(elementDescription, {
        elementDescription,
        totalAttempts: 0,
        successfulAttempts: 0,
        failedAttempts: 0,
        strategies: [],
        lastUpdated: new Date().toISOString()
      });
    }

    const health = this.healthData.get(elementDescription)!;
    health.totalAttempts++;

    if (success) {
      health.successfulAttempts++;
    } else {
      health.failedAttempts++;
    }

    // Track strategy performance
    let strategy = health.strategies.find(s => s.index === strategyIndex);
    if (!strategy) {
      strategy = {
        index: strategyIndex,
        description: strategyDescription,
        successCount: 0,
        failureCount: 0,
        lastError: null
      };
      health.strategies.push(strategy);
    }

    if (success) {
      strategy.successCount++;
    } else {
      strategy.failureCount++;
      strategy.lastError = errorMessage || 'Unknown error';
    }

    health.lastUpdated = new Date().toISOString();

    // Persist data immediately after recording
    this.saveTempData();
  }

  /**
   * Load temporary data from file (for cross-process persistence)
   */
  private loadTempData() {
    try {
      if (fs.existsSync(this.tempDataPath)) {
        const data = JSON.parse(fs.readFileSync(this.tempDataPath, 'utf-8'));
        this.healthData = new Map(Object.entries(data));
      }
    } catch (error) {
      // Silently fail - temp data is optional
    }
  }

  /**
   * Save temporary data to file (for cross-process persistence)
   */
  private saveTempData() {
    try {
      const dir = path.dirname(this.tempDataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = Object.fromEntries(this.healthData);
      fs.writeFileSync(this.tempDataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      // Silently fail - temp data persistence is best-effort
    }
  }

  /**
   * Get health report for a specific element
   */
  getElementHealth(elementDescription: string): LocatorHealth | undefined {
    return this.healthData.get(elementDescription);
  }

  /**
   * Get all elements with failing primary locators
   */
  getProblematicElements(): LocatorHealth[] {
    return Array.from(this.healthData.values()).filter(health => {
      const primaryStrategy = health.strategies.find(s => s.index === 0);
      return primaryStrategy && primaryStrategy.failureCount > 0;
    });
  }

  /**
   * Save health report to file
   */
  saveReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalElements: this.healthData.size,
        problematicElements: this.getProblematicElements().length,
        healthyElements: this.healthData.size - this.getProblematicElements().length
      },
      elements: Array.from(this.healthData.values()).map(health => ({
        ...health,
        healthScore: this.calculateHealthScore(health),
        recommendation: this.getRecommendation(health)
      }))
    };

    const dir = path.dirname(this.reportPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.reportPath, JSON.stringify(report, null, 2));
    console.log(`Locator health report saved to: ${this.reportPath}`);

    // Clean up temp data file
    try {
      if (fs.existsSync(this.tempDataPath)) {
        fs.unlinkSync(this.tempDataPath);
      }
    } catch (error) {
      // Silently fail - cleanup is optional
    }
  }

  /**
   * Calculate health score (0-100)
   */
  private calculateHealthScore(health: LocatorHealth): number {
    if (health.totalAttempts === 0) return 100;

    const primaryStrategy = health.strategies.find(s => s.index === 0);
    if (!primaryStrategy) return 0;

    const primarySuccessRate = primaryStrategy.successCount /
      (primaryStrategy.successCount + primaryStrategy.failureCount);

    return Math.round(primarySuccessRate * 100);
  }

  /**
   * Get recommendation for improving locator
   */
  private getRecommendation(health: LocatorHealth): string {
    const healthScore = this.calculateHealthScore(health);

    if (healthScore === 100) {
      return 'Healthy - No action needed';
    } else if (healthScore >= 80) {
      return 'Monitor - Primary locator occasionally fails';
    } else if (healthScore >= 50) {
      return 'Update Recommended - Consider updating primary locator';
    } else {
      return 'Critical - Primary locator frequently fails, update immediately';
    }
  }

  /**
   * Print summary to console
   */
  printSummary() {
    const problematic = this.getProblematicElements();

    console.log('\n===== LOCATOR HEALTH SUMMARY =====');
    console.log(`Total elements monitored: ${this.healthData.size}`);
    console.log(`Healthy elements: ${this.healthData.size - problematic.length}`);
    console.log(`Problematic elements: ${problematic.length}`);

    if (problematic.length > 0) {
      console.log('\nElements needing attention:');
      problematic.forEach(health => {
        const score = this.calculateHealthScore(health);
        console.log(`  - ${health.elementDescription} (Health: ${score}%)`);
        console.log(`    Primary strategy failures: ${health.strategies[0]?.failureCount || 0}`);
        console.log(`    Recommendation: ${this.getRecommendation(health)}`);
      });
    }

    console.log('=====================================\n');
  }
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
