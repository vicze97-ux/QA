import * as fs from 'fs';
import { TestCaseConfig, TestStep } from './TestCaseTemplateGenerator';

export class TestCaseParser {
  static parseFromFile(filePath: string): TestCaseConfig {
    return this.parseFromMarkdown(fs.readFileSync(filePath, 'utf-8'));
  }

  static parseFromMarkdown(content: string): TestCaseConfig {
    const lines = content.split('\n');
    const config: Partial<TestCaseConfig> = {
      testSteps: [], expectedResults: [], preconditions: [], testData: [], notes: [],
    };

    let currentSection = '';
    let inTable = false;

    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;

      if (t.includes('Test Case ID'))           { currentSection = 'testCaseId'; continue; }
      if (t.startsWith('## Title') || t.startsWith('## Objective')) { currentSection = 'title'; continue; }
      if (t.startsWith('## Preconditions'))     { currentSection = 'preconditions'; continue; }
      if (t.startsWith('## Test Data'))         { currentSection = 'testData'; inTable = false; continue; }
      if (t.startsWith('## Test Steps') || t.startsWith('## Steps')) { currentSection = 'testSteps'; inTable = false; continue; }
      if (t.startsWith('## Expected'))          { currentSection = 'expectedResults'; continue; }
      if (t.startsWith('## Notes') || t.startsWith('## Comments')) { currentSection = 'notes'; continue; }
      if (t.startsWith('##'))                   { currentSection = ''; continue; }

      switch (currentSection) {
        case 'testCaseId':
          if (t.match(/TC-[A-Z]+-\d+/)) config.testCaseId = t.match(/TC-[A-Z]+-\d+/)![0];
          break;
        case 'title':
          if (!t.startsWith('#') && !t.startsWith('**') && !t.startsWith('---')) config.title = t;
          break;
        case 'preconditions':
          if (t.startsWith('-') || t.startsWith('*')) config.preconditions!.push(t.replace(/^[-*]\s*/, ''));
          else if (t.toLowerCase() !== 'none' && t.toLowerCase() !== 'none.') config.preconditions!.push(t);
          break;
        case 'testData':
          if (t.startsWith('|')) {
            if (!inTable) { inTable = true; break; }
            if (t.includes('---')) break;
            const vals = t.split('|').map(v => v.trim()).filter(v => v);
            if (vals.length >= 3) config.testData!.push({ identifier: vals[0], value: vals[1], purpose: vals[2] });
          } else { inTable = false; }
          break;
        case 'testSteps':
          if (t.startsWith('|')) {
            if (!inTable) { inTable = true; break; }
            if (t.includes('---')) break;
            const vals = t.split('|').map(v => v.trim()).filter(v => v);
            if (vals.length >= 2) {
              const ai = vals[0].match(/^\d+$/) ? 1 : 0;
              config.testSteps!.push({
                action: vals[ai].replace(/\([a-zA-Z-]+\)/, '').trim(),
                playwrightTag: vals[ai + 1]?.includes('(') ? vals[ai + 1] : `(${vals[ai + 1] || 'action'})`,
              });
            }
          } else if (t.match(/^\d+\./)) {
            const m = t.match(/^\d+\.\s*(.+)$/)!;
            let action = m[1];
            const tag = action.match(/\([a-zA-Z-]+\)/)?.[0] || this.inferTag(action);
            action = action.replace(/\([a-zA-Z-]+\)/, '').trim();
            config.testSteps!.push({ action, playwrightTag: tag });
          } else { inTable = false; }
          break;
        case 'expectedResults':
          if (t.match(/^\d+\./)) config.expectedResults!.push(t.replace(/^\d+\.\s*/, ''));
          else if (t.startsWith('-') || t.startsWith('*')) config.expectedResults!.push(t.replace(/^[-*]\s*/, ''));
          break;
        case 'notes':
          if (t.startsWith('-') || t.startsWith('*')) config.notes!.push(t.replace(/^[-*]\s*/, ''));
          else if (!t.startsWith('#')) config.notes!.push(t);
          break;
      }
    }

    return config as TestCaseConfig;
  }

  static inferTag(action: string): string {
    const a = action.toLowerCase();
    if (a.includes('enter') || a.includes('type') || a.includes('fill')) return '(fill)';
    if (a.includes('click') || a.includes('press')) return '(click)';
    if (a.includes('select') || a.includes('choose')) return '(selectOption)';
    if (a.includes('check')) return '(check)';
    if (a.includes('upload')) return '(setInputFiles)';
    if (a.includes('hover')) return '(hover)';
    if (a.includes('drag')) return '(dragTo)';
    if (a.includes('scroll')) return '(scrollIntoView)';
    if (a.includes('navigate') || a.includes('go to') || a.includes('open')) return '(goto)';
    return '(action)';
  }

  static suggestImprovements(config: TestCaseConfig): ImprovementSuggestion[] {
    const suggestions: ImprovementSuggestion[] = [];
    const approvedVerbs = ['enter', 'clear', 'check', 'uncheck', 'select', 'click',
      'double-click', 'right-click', 'hover', 'press', 'upload', 'drag', 'scroll'];

    if (!config.testCaseId?.match(/^TC-[A-Z]+-\d+$/)) {
      suggestions.push({ section: 'Test Case ID', issue: 'Format must be TC-<MODULE>-<NUMBER>', suggestion: 'e.g. TC-AUTH-001', severity: 'error' });
    }
    if (!config.title || config.title.length < 10) {
      suggestions.push({ section: 'Title', issue: 'Too short or missing', suggestion: 'Include action, element, and intention (min 10 chars)', severity: 'error' });
    }

    config.testSteps.forEach((step, i) => {
      if (!step.playwrightTag?.match(/^\([a-zA-Z-]+\)$/)) {
        suggestions.push({ section: `Step ${i + 1}`, issue: 'Missing Playwright tag', suggestion: 'Add (fill), (click), etc.', severity: 'error', original: step.action });
      }
      if (!approvedVerbs.some(v => step.action.toLowerCase().startsWith(v))) {
        suggestions.push({ section: `Step ${i + 1}`, issue: 'Does not start with approved verb', suggestion: approvedVerbs.join(', '), severity: 'warning', original: step.action });
      }
      if (step.action.includes(' and ') || step.action.includes(', then')) {
        suggestions.push({ section: `Step ${i + 1}`, issue: 'Combined actions', suggestion: 'Split into separate steps', severity: 'error', original: step.action });
      }
    });

    if (config.expectedResults.length !== config.testSteps.length) {
      suggestions.push({ section: 'Expected Results', issue: `Count (${config.expectedResults.length}) ≠ steps (${config.testSteps.length})`, suggestion: 'One result per step', severity: 'warning' });
    }

    return suggestions;
  }

  static autoFix(config: TestCaseConfig): TestCaseConfig {
    const fixed = { ...config };

    fixed.testSteps = config.testSteps.map(step => {
      let action = step.action.trim();
      let tag = step.playwrightTag || '';
      if (!tag || tag === '(action)') tag = this.inferTag(action);
      action = action.charAt(0).toUpperCase() + action.slice(1);
      return { action, playwrightTag: tag };
    });

    if (!fixed.expectedResults?.length) {
      fixed.expectedResults = fixed.testSteps.map(() => 'The action completes successfully.');
    }

    fixed.preconditions = fixed.preconditions?.filter(p => p && p.toLowerCase() !== 'none' && p.toLowerCase() !== 'none.') || [];
    fixed.notes = fixed.notes?.filter(n => n?.trim()) || [];

    return fixed;
  }

  static convertToStandard(config: TestCaseConfig): TestCaseConfig {
    const fixed = this.autoFix(config);
    if (!fixed.testCaseId) fixed.testCaseId = 'TC-CONVERTED-001';
    if (!fixed.title) fixed.title = 'Converted Test Case';
    return fixed;
  }
}

export interface ImprovementSuggestion {
  section: string;
  issue: string;
  suggestion: string;
  severity: 'error' | 'warning' | 'info';
  original?: string;
  fixed?: string;
}
