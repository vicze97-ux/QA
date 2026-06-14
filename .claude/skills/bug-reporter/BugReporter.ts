import type { AnalysisResult } from '../test-failure-analyzer/TestFailureAnalyzer';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BugDestination = 'sprint' | 'backlog' | 'subtask';

export interface Attachments {
  screenshot?: string;   // absolute path to .png
  video?: string;        // absolute path to .webm
}

export interface BugReportConfig {
  result: AnalysisResult;
  destination: BugDestination;
  parentKey?: string;          // required when destination === 'subtask'
  projectKey: string;
  cloudId: string;
  sprintId?: number;
  functionalityName: string;   // e.g. "Create Functionality" — from spec file name
  expectedBehaviour: string;   // what should have happened (from test case / AC)
  actualBehaviour: string;     // what actually happened (from error / assertion)
  stepsToReproduce?: string[]; // optional override; auto-generated if omitted
  attachments?: Attachments;
}

export interface JiraBugPayload {
  cloudId: string;
  projectKey: string;
  issueTypeName: string;
  summary: string;
  description: string;
  labels: string[];
  priority: string;
  parent?: string;
  additional_fields: Record<string, unknown>;
  attachments?: Attachments;
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export class BugReporter {
  /**
   * Build the Jira payload from an AnalysisResult.
   * Always ask the user for destination before calling this.
   */
  static buildPayload(config: BugReportConfig): JiraBugPayload {
    const {
      result, destination, parentKey, projectKey, cloudId, sprintId,
      functionalityName, expectedBehaviour, actualBehaviour,
      stepsToReproduce, attachments,
    } = config;

    const summary = BugReporter.buildSummary(functionalityName, result);
    const description = BugReporter.buildDescription({
      result, functionalityName, expectedBehaviour, actualBehaviour,
      stepsToReproduce, attachments,
    });
    const priority = BugReporter.mapPriority(result.confidence);
    const labels = ['bug', 'automated-test', result.category.toLowerCase()];
    // Jira only allows Subtask type as a child of Story/Task — Bug (hierarchy 0) cannot be a child
    const issueTypeName = destination === 'subtask' ? 'Subtask' : 'Bug';

    const additional_fields: Record<string, unknown> = {
      priority: { name: priority },
      labels,
    };
    if (destination === 'sprint' && sprintId) {
      additional_fields['customfield_10020'] = sprintId;
    }

    return {
      cloudId, projectKey, issueTypeName, summary, description,
      labels, priority,
      parent: destination === 'subtask' ? parentKey : undefined,
      additional_fields,
      attachments,
    };
  }

  /**
   * Prompt text shown to the user before creating the bug.
   */
  static destinationPrompt(result: AnalysisResult): string {
    return [
      `Bug confirmed: **${result.testTitle}**`,
      ``,
      `Where should this be created in Jira?`,
      ``,
      `1. **Sprint** — active sprint Bug`,
      `2. **Backlog** — backlog Bug`,
      `3. **Subtask** — sub-task under an existing ticket (provide ticket key)`,
    ].join('\n');
  }

  /**
   * Scan Playwright test-results dir for screenshot/video for a given test title.
   * Returns paths if found, undefined otherwise.
   */
  static findAttachments(testResultsDir: string, testTitle: string): Attachments {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const attachments: Attachments = {};

    if (!fs.existsSync(testResultsDir)) return attachments;

    // Playwright names result folders by sanitising the test title
    const sanitised = testTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40);

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name.toLowerCase().includes(sanitised)) {
            // Look for screenshot and video inside
            for (const f of fs.readdirSync(full)) {
              if (f.endsWith('.png') && !attachments.screenshot) attachments.screenshot = path.join(full, f);
              if (f.endsWith('.webm') && !attachments.video) attachments.video = path.join(full, f);
            }
          } else {
            walk(full);
          }
        }
      }
    };

    walk(testResultsDir);
    return attachments;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private static buildSummary(functionalityName: string, result: AnalysisResult): string {
    // Short failure description: first meaningful line of the error, capped at 60 chars
    const shortError = result.why
      .split('\n')
      .map(l => l.trim())
      .find(l => l.length > 0 && !l.startsWith('at ')) ?? result.summary;
    const cap = shortError.length > 60 ? shortError.slice(0, 57) + '…' : shortError;
    return `${functionalityName} — ${cap}`;
  }

  private static buildDescription(opts: {
    result: AnalysisResult;
    functionalityName: string;
    expectedBehaviour: string;
    actualBehaviour: string;
    stepsToReproduce?: string[];
    attachments?: Attachments;
  }): string {
    const { result, functionalityName, expectedBehaviour, actualBehaviour, stepsToReproduce, attachments } = opts;

    const steps = stepsToReproduce ?? [
      'Start the app at `BASE_URL`.',
      `Run: \`npx playwright test --grep "${result.testTitle}"\``,
      'Observe the failure in the terminal / HTML report.',
    ];

    const loc = result.where
      ? `\`${result.where.file}\` line ${result.where.line}`
      : '_location unknown_';

    const sections: string[] = [
      '## Description',
      '',
      `**Functionality:** ${functionalityName}`,
      `**Test:** ${result.testTitle}`,
      `**Failure type:** ${result.category} (confidence: ${result.confidence})`,
      '',
      result.summary,
    ];

    if (result.where?.snippet) {
      sections.push('', `Failing code at ${loc}:`, '', '```typescript', result.where.snippet, '```');
    } else {
      sections.push('', `Detected at: ${loc}`);
    }

    sections.push(
      '',
      '---',
      '',
      '## Steps to Reproduce',
      '',
      ...steps.map((s, i) => `${i + 1}. ${s}`),
      '',
      '---',
      '',
      '## Expected Result',
      '',
      expectedBehaviour,
      '',
      '## Actual Result',
      '',
      actualBehaviour,
      '',
      '---',
    );

    // Attachments
    const hasAttachments = attachments && (attachments.screenshot || attachments.video);
    if (hasAttachments) {
      sections.push('', '## Evidence', '');
      if (attachments!.screenshot) {
        sections.push(`**Screenshot:** \`${attachments!.screenshot}\``);
        sections.push(`!Screenshot|thumbnail!`);
      }
      if (attachments!.video) {
        sections.push(`**Video:** \`${attachments!.video}\``);
      }
      sections.push('');
      sections.push('> _Attach the above files to this ticket after creation._');
      sections.push('');
      sections.push('---');
    }

    sections.push(
      '',
      '_Auto-detected by `test-failure-analyzer` → `bug-reporter`. Verify manually before fixing._',
    );

    return sections.join('\n');
  }

  private static mapPriority(confidence: 'HIGH' | 'MEDIUM' | 'LOW'): string {
    return { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' }[confidence];
  }
}
