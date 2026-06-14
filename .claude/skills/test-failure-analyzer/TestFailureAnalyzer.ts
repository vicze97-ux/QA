import * as fs from 'fs';
import * as path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FailureCategory =
  | 'BUG'           // Real application defect
  | 'LOCATOR'       // Element not found / selector stale
  | 'TIMING'        // Timeout waiting for condition
  | 'ASSERTION'     // Wrong expected value in the test itself
  | 'ENVIRONMENT'   // Network, missing env var, app not running
  | 'TEST_DATA'     // Missing or corrupt test data / fixtures
  | 'UNKNOWN';

export interface FailureLocation {
  file: string;
  line: number;
  column: number;
  snippet?: string;
}

export interface AnalysisResult {
  testTitle: string;
  category: FailureCategory;
  isBug: boolean;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  summary: string;
  why: string;
  where: FailureLocation | null;
  rawError: string;
  suggestions: string[];
}

// ─── Heuristic patterns ───────────────────────────────────────────────────────

const PATTERNS: Array<{ pattern: RegExp; category: FailureCategory; confidence: 'HIGH' | 'MEDIUM' | 'LOW' }> = [
  // Locator / selector issues
  { pattern: /locator\..*resolves to \d+ elements/i,       category: 'LOCATOR',     confidence: 'HIGH' },
  { pattern: /strict mode violation/i,                      category: 'LOCATOR',     confidence: 'HIGH' },
  { pattern: /waiting for locator/i,                        category: 'LOCATOR',     confidence: 'HIGH' },
  { pattern: /element is not attached/i,                    category: 'LOCATOR',     confidence: 'HIGH' },
  { pattern: /unable to find element/i,                     category: 'LOCATOR',     confidence: 'HIGH' },
  { pattern: /no element found/i,                           category: 'LOCATOR',     confidence: 'HIGH' },
  // Timing / timeout
  { pattern: /timeout \d+ms exceeded/i,                     category: 'TIMING',      confidence: 'HIGH' },
  { pattern: /page\.waitFor/i,                              category: 'TIMING',      confidence: 'MEDIUM' },
  { pattern: /waiting for.*to be visible/i,                 category: 'TIMING',      confidence: 'HIGH' },
  { pattern: /waiting for.*to be enabled/i,                 category: 'TIMING',      confidence: 'HIGH' },
  // Environment
  { pattern: /err_connection_refused/i,                     category: 'ENVIRONMENT', confidence: 'HIGH' },
  { pattern: /net::err/i,                                   category: 'ENVIRONMENT', confidence: 'HIGH' },
  { pattern: /econnrefused/i,                               category: 'ENVIRONMENT', confidence: 'HIGH' },
  { pattern: /process\.env\.\w+ is (undefined|null)/i,      category: 'ENVIRONMENT', confidence: 'HIGH' },
  { pattern: /cannot find module/i,                         category: 'ENVIRONMENT', confidence: 'HIGH' },
  // Assertion failures that look like wrong expected value (test code smell)
  { pattern: /expect\(received\)\.toBe\(expected\)/i,       category: 'ASSERTION',   confidence: 'MEDIUM' },
  { pattern: /expect\(received\)\.toEqual\(expected\)/i,    category: 'ASSERTION',   confidence: 'MEDIUM' },
  { pattern: /expected.*received/i,                         category: 'ASSERTION',   confidence: 'LOW' },
  // Test data
  { pattern: /no such file or directory/i,                  category: 'TEST_DATA',   confidence: 'HIGH' },
  { pattern: /sqlite.*no such table/i,                      category: 'TEST_DATA',   confidence: 'HIGH' },
  { pattern: /fixture.*not found/i,                         category: 'TEST_DATA',   confidence: 'HIGH' },
];

const BUG_INDICATORS: RegExp[] = [
  /expected.*to be visible.*received.*hidden/i,
  /expected.*to have value.*received/i,
  /expected.*to contain text/i,
  /expected.*to be enabled.*received.*disabled/i,
  /expected.*\d+.*to be greater than/i,
  /toHaveURL/i,
  /toHaveTitle/i,
  // Standard Playwright assertion format: Expected: "x"\nReceived: "y"
  /Expected:\s+".+"\s*\n\s*Received:\s+".*"/is,
  /Expected:\s+\d+\s*\n\s*Received:\s+\d+/is,
  /toBeGreaterThan/i,
  /toHaveCount/i,
];

// ─── Analyzer ─────────────────────────────────────────────────────────────────

export class TestFailureAnalyzer {
  /**
   * Analyze a single test failure from its error message + stack trace.
   */
  static analyze(testTitle: string, rawError: string, projectRoot = process.cwd()): AnalysisResult {
    const category = TestFailureAnalyzer.classify(rawError);
    const where = TestFailureAnalyzer.extractLocation(rawError, projectRoot);
    const isBug = TestFailureAnalyzer.determineIfBug(rawError, category);
    const confidence = TestFailureAnalyzer.classifyConfidence(rawError, category);
    const { summary, why } = TestFailureAnalyzer.buildExplanation(rawError, category, isBug);
    const suggestions = TestFailureAnalyzer.buildSuggestions(category, where);

    return { testTitle, category, isBug, confidence, summary, why, where, rawError, suggestions };
  }

  /**
   * Analyze all failures from a Playwright JSON report.
   */
  static analyzeReport(reportPath: string, projectRoot = process.cwd()): AnalysisResult[] {
    if (!fs.existsSync(reportPath)) {
      throw new Error(`Report not found: ${reportPath}`);
    }
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    const results: AnalysisResult[] = [];

    function walk(suite: any) {
      for (const spec of suite.specs ?? []) {
        for (const test of spec.tests ?? []) {
          for (const result of test.results ?? []) {
            if (result.status === 'failed' || result.status === 'timedOut') {
              const errorMsg = result.error?.message ?? '';
              const stack = result.error?.stack ?? '';
              results.push(TestFailureAnalyzer.analyze(spec.title, `${errorMsg}\n${stack}`, projectRoot));
            }
          }
        }
      }
      for (const child of suite.suites ?? []) walk(child);
    }

    walk(report);
    return results;
  }

  /**
   * Format a single result for console/CI output.
   */
  static format(result: AnalysisResult): string {
    const bugLabel = result.isBug ? '🐛 BUG' : '⚠️  TEST ISSUE';
    const lines: string[] = [
      `┌─ ${bugLabel} [${result.confidence}] — ${result.category}`,
      `│  Test   : ${result.testTitle}`,
      `│  Summary: ${result.summary}`,
      `│  Why    : ${result.why}`,
    ];
    if (result.where) {
      lines.push(`│  Where  : ${result.where.file}:${result.where.line}:${result.where.column}`);
      if (result.where.snippet) lines.push(`│  Snippet: ${result.where.snippet}`);
    }
    if (result.suggestions.length) {
      lines.push('│  Fix    :');
      result.suggestions.forEach(s => lines.push(`│    • ${s}`));
    }
    lines.push('└' + '─'.repeat(60));
    return lines.join('\n');
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private static classify(error: string): FailureCategory {
    for (const { pattern, category } of PATTERNS) {
      if (pattern.test(error)) return category;
    }
    // Assertion failures that show real UI mismatches → potential bugs
    if (/expect\(/.test(error)) return 'ASSERTION';
    return 'UNKNOWN';
  }

  private static determineIfBug(error: string, category: FailureCategory): boolean {
    if (category === 'ENVIRONMENT' || category === 'TEST_DATA') return false;
    if (category === 'LOCATOR') return false;
    if (category === 'TIMING') {
      // Timeout waiting for a visible/enabled element → could be a bug if element should exist
      return /to be visible|to be enabled|to have text/i.test(error);
    }
    if (category === 'ASSERTION') {
      return BUG_INDICATORS.some(p => p.test(error));
    }
    return category === 'BUG' || category === 'UNKNOWN';
  }

  private static classifyConfidence(error: string, category: FailureCategory): 'HIGH' | 'MEDIUM' | 'LOW' {
    const match = PATTERNS.find(p => p.pattern.test(error));
    return match?.confidence ?? 'LOW';
  }

  private static extractLocation(error: string, projectRoot: string): FailureLocation | null {
    // Match stack trace lines: "  at ... (d:/QA/tests/e2e/foo.spec.ts:42:10)"
    const stackLineRe = /at .+?\((.+?\.(?:ts|js|mjs)):(\d+):(\d+)\)/g;
    let match: RegExpExecArray | null;
    while ((match = stackLineRe.exec(error)) !== null) {
      const [, filePath, line, col] = match;
      // Prefer project files over node_modules/playwright internals
      const normalized = filePath.replace(/\\/g, '/');
      if (normalized.includes('node_modules') || normalized.includes('playwright-core')) continue;
      const absPath = path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath);
      const snippet = TestFailureAnalyzer.readSnippet(absPath, parseInt(line));
      return { file: normalized, line: parseInt(line), column: parseInt(col), snippet };
    }
    return null;
  }

  private static readSnippet(filePath: string, lineNumber: number): string | undefined {
    try {
      const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
      return lines[lineNumber - 1]?.trim();
    } catch {
      return undefined;
    }
  }

  private static buildExplanation(
    error: string,
    category: FailureCategory,
    isBug: boolean
  ): { summary: string; why: string } {
    const firstLine = error.split('\n').find(l => l.trim().length > 0) ?? error.slice(0, 120);

    const explanations: Record<FailureCategory, { summary: string; why: string }> = {
      BUG:         { summary: 'Application behaves unexpectedly',        why: firstLine },
      LOCATOR:     { summary: 'Element not found or ambiguous',          why: 'Selector matched 0 or multiple elements. DOM may have changed.' },
      TIMING:      { summary: isBug ? 'Expected UI state never appeared' : 'Operation timed out', why: firstLine },
      ASSERTION:   { summary: isBug ? 'UI value does not match expectation' : 'Test assertion may be wrong', why: firstLine },
      ENVIRONMENT: { summary: 'App or dependency not reachable',         why: firstLine },
      TEST_DATA:   { summary: 'Required file or DB table missing',       why: firstLine },
      UNKNOWN:     { summary: 'Unclassified failure',                    why: firstLine },
    };

    return explanations[category];
  }

  private static buildSuggestions(category: FailureCategory, where: FailureLocation | null): string[] {
    const loc = where ? `${where.file}:${where.line}` : 'the failing test';
    const suggestions: Record<FailureCategory, string[]> = {
      BUG: [
        'Reproduce manually in the browser to confirm.',
        'Check recent commits to the relevant feature code.',
        `Failing assertion at ${loc}.`,
      ],
      LOCATOR: [
        'Run with --debug to inspect the DOM at failure point.',
        'Add a fallback strategy to the SelfHealingLocator.',
        'Check if the element class/attribute changed in a recent deploy.',
      ],
      TIMING: [
        'Increase waitForTimeout or use waitForSelector instead.',
        'Check if the app is slow or the feature is behind a loading state.',
        where ? `Add explicit wait before line ${where.line} in ${where.file}.` : 'Add explicit wait.',
      ],
      ASSERTION: [
        'Verify the expected value matches current app behaviour.',
        'Run the test in headed mode to observe the actual UI state.',
        `Review assertion at ${loc}.`,
      ],
      ENVIRONMENT: [
        'Confirm the app is running at BASE_URL.',
        'Check .env for missing API_URL or API_TOKEN.',
        'Verify network/firewall in CI.',
      ],
      TEST_DATA: [
        'Run globalSetup manually to seed required data.',
        'Check CAMPAIGN_DIR path in .env.',
        'Confirm the SQLite DB schema matches what the test expects.',
      ],
      UNKNOWN: [
        'Read the full stack trace.',
        'Run in headed mode: npx playwright test --headed.',
      ],
    };
    return suggestions[category];
  }
}
