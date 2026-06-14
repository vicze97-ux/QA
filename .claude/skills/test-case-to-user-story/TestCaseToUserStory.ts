import * as fs from 'fs';
import * as path from 'path';

export interface UserStoryConfig {
  module: string;
  actor: string;
  intent: string;
  businessValue: string;
  description?: string;
  acceptanceCriteria: AcceptanceCriterion[];
  testCases: TestCaseRef[];
  labels?: string[];
  priority?: 'High' | 'Medium' | 'Low';
}

export interface AcceptanceCriterion {
  id: string;
  description: string;
  testCaseId: string;
  steps: TestStep[];
  expectedResults: string[];
  actualResults: string[];
}

export interface TestStep {
  number: number;
  action: string;
  playwrightTag: string;
}

export interface TestCaseRef {
  id: string;
  title: string;
  priority: string;
}

export interface JiraStoryPayload {
  summary: string;
  description: string;
  labels: string[];
  priority: string;
}

export class TestCaseToUserStory {
  static parseTestCasesFromDir(dir: string): ParsedTestCase[] {
    if (!fs.existsSync(dir)) return [];
    return (fs.readdirSync(dir) as string[])
      .filter((f: string) => f.endsWith('.md'))
      .sort()
      .map((f: string) => TestCaseToUserStory.parseFile(path.join(dir, f)))
      .filter((tc: ParsedTestCase | null): tc is ParsedTestCase => tc !== null);
  }

  static parseFile(filePath: string): ParsedTestCase | null {
    const raw = fs.readFileSync(filePath, 'utf-8');

    const idMatch = raw.match(/\*\*(TC-[A-Z]+-\d+)\*\*/);
    const titleMatch = raw.match(/## Title \/ Objective\n(.+)/);
    const moduleMatch = raw.match(/^module:\s*(.+)/m);
    const priorityMatch = raw.match(/^priority:\s*(.+)/m);
    if (!idMatch || !titleMatch) return null;

    // Parse test steps table rows: | N | action | (tag) |
    const steps: TestStep[] = [];
    const stepRegex = /^\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(\([a-zA-Z-]+\))\s*\|/gm;
    let m: RegExpExecArray | null;
    while ((m = stepRegex.exec(raw)) !== null) {
      steps.push({ number: parseInt(m[1]), action: m[2].trim(), playwrightTag: m[3].trim() });
    }

    // Parse expected results: lines starting with "N. "
    const expectedResults: string[] = [];
    const erSection = raw.match(/## Expected Results\n([\s\S]*?)(?:\n##|$)/);
    if (erSection) {
      const erLines = erSection[1].match(/^\d+\.\s+(.+)/gm) ?? [];
      erLines.forEach((l: string) => expectedResults.push(l.replace(/^\d+\.\s+/, '').trim()));
    }

    return {
      id: idMatch[1],
      title: titleMatch[1].trim(),
      module: moduleMatch?.[1]?.trim() ?? 'General',
      priority: priorityMatch?.[1]?.trim() ?? 'Medium',
      steps,
      expectedResults,
    };
  }

  static buildConfig(
    testCases: ParsedTestCase[],
    opts: {
      actor: string;
      intent: string;
      businessValue: string;
      description?: string;
      actualResults?: Record<string, string[]>;
      labels?: string[];
      priority?: 'High' | 'Medium' | 'Low';
    }
  ): UserStoryConfig {
    const module = testCases[0]?.module ?? 'General';
    const actualResults = opts.actualResults ?? {};

    const acceptanceCriteria: AcceptanceCriterion[] = testCases.map((tc, i) => ({
      id: `AC-${String(i + 1).padStart(3, '0')}`,
      description: tc.title,
      testCaseId: tc.id,
      steps: tc.steps,
      expectedResults: tc.expectedResults,
      actualResults: actualResults[tc.id] ?? tc.expectedResults.map(() => 'Not yet executed'),
    }));

    return {
      module,
      actor: opts.actor,
      intent: opts.intent,
      businessValue: opts.businessValue,
      description: opts.description,
      acceptanceCriteria,
      testCases: testCases.map(tc => ({ id: tc.id, title: tc.title, priority: tc.priority })),
      labels: opts.labels ?? [],
      priority: opts.priority ?? 'Medium',
    };
  }

  static generateJiraPayload(config: UserStoryConfig): JiraStoryPayload {
    // Summary = functionality name (title-cased module), e.g. "Create Functionality"
    const summary = config.module
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());

    const sections: string[] = [
      '## User Story',
      '',
      `As a **${config.actor}**, I want to **${config.intent}** so that **${config.businessValue}**.`,
    ];

    if (config.description) {
      sections.push('', '## Description', '', config.description);
    }

    sections.push('', '---', '', '## Acceptance Criteria', '');
    config.acceptanceCriteria.forEach(ac => {
      sections.push(`### ${ac.id} — ${ac.description} _(${ac.testCaseId})_`, '');

      // Steps
      sections.push('**Steps to Test**', '');
      sections.push('| Step | Action | Tag |');
      sections.push('|------|--------|-----|');
      ac.steps.forEach(s => sections.push(`| ${s.number} | ${s.action} | ${s.playwrightTag} |`));
      sections.push('');

      // Expected vs Actual
      sections.push('**Expected Results**', '');
      ac.expectedResults.forEach((r, i) => sections.push(`${i + 1}. ${r}`));
      sections.push('');

      sections.push('**Actual Results**', '');
      ac.actualResults.forEach((r, i) => sections.push(`${i + 1}. ${r}`));
      sections.push('');
    });

    // Test coverage summary table
    sections.push('---', '', '## Test Coverage', '');
    sections.push('| Test Case | Description | Priority |');
    sections.push('|-----------|-------------|----------|');
    config.testCases.forEach(tc =>
      sections.push(`| ${tc.id} | ${tc.title} | ${tc.priority} |`)
    );
    sections.push('');
    sections.push(`Automated via \`tests/e2e/${config.module.toLowerCase()}.spec.ts\` (Playwright, Chromium + Firefox).`);

    return {
      summary,
      description: sections.join('\n'),
      labels: config.labels ?? [],
      priority: config.priority ?? 'Medium',
    };
  }

  static saveToFile(config: UserStoryConfig, outputPath: string): void {
    const payload = TestCaseToUserStory.generateJiraPayload(config);
    fs.writeFileSync(outputPath, [`# ${payload.summary}`, '', payload.description].join('\n'));
  }
}

export interface ParsedTestCase {
  id: string;
  title: string;
  module: string;
  priority: string;
  steps: TestStep[];
  expectedResults: string[];
}
