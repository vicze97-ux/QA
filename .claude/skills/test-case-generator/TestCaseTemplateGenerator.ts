import * as fs from 'fs';
import * as path from 'path';

export class TestCaseTemplateGenerator {
  private outputDir: string;

  constructor(outputDir: string = path.join(process.cwd(), 'test-cases')) {
    this.outputDir = outputDir;
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  generateTestCase(config: TestCaseConfig): string {
    const s: string[] = [];

    s.push('---');
    s.push(`module: ${config.module || 'General'}`);
    s.push(`priority: ${config.priority || 'Medium'}`);
    s.push(`author: ${config.author || 'Test Team'}`);
    s.push(`created: ${new Date().toISOString().split('T')[0]}`);
    s.push('---', '', `# ${config.title}`, '');

    s.push('## Test Case ID', `**${config.testCaseId}**`, '');

    s.push('## Title / Objective', config.title, '');

    s.push('## Preconditions');
    if (config.preconditions?.length) {
      config.preconditions.forEach(p => s.push(`- ${p}`));
    } else {
      s.push('None.');
    }
    s.push('');

    s.push('## Test Data');
    if (config.testData?.length) {
      s.push('| Identifier | Value | Purpose |');
      s.push('|------------|-------|---------|');
      config.testData.forEach(d => s.push(`| ${d.identifier} | ${d.value} | ${d.purpose} |`));
    } else {
      s.push('None required.');
    }
    s.push('');

    s.push('## Test Steps');
    s.push('| Step # | Action | Playwright Tag |');
    s.push('|--------|--------|----------------|');
    config.testSteps.forEach((step, i) =>
      s.push(`| ${i + 1} | ${step.action} | ${step.playwrightTag} |`)
    );
    s.push('');

    s.push('## Expected Results');
    config.expectedResults.forEach((r, i) => s.push(`${i + 1}. ${r}`));
    s.push('');

    if (config.notes?.length) {
      s.push('## Notes / Comments');
      config.notes.forEach(n => s.push(`- ${n}`));
      s.push('');
    }

    return s.join('\n');
  }

  saveTestCase(config: TestCaseConfig, filename?: string): string {
    const content = this.generateTestCase(config);
    const filePath = path.join(this.outputDir, filename || `${config.testCaseId}.md`);
    fs.writeFileSync(filePath, content);
    console.log(`Test case saved: ${filePath}`);
    return filePath;
  }

  generateBlankTemplate(testCaseId: string, module: string): string {
    return this.generateTestCase({
      testCaseId,
      module,
      title: '[Enter test objective here]',
      preconditions: ['[Enter precondition or "None"]'],
      testSteps: [{ action: '[Enter action with element name]', playwrightTag: '(action)' }],
      expectedResults: ['[Enter expected visible outcome]'],
    });
  }

  saveBlankTemplate(testCaseId: string, module: string): string {
    const content = this.generateBlankTemplate(testCaseId, module);
    const filePath = path.join(this.outputDir, `${testCaseId}_template.md`);
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  validateTestCase(config: TestCaseConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.testCaseId.match(/^TC-[A-Z]+-\d+$/)) {
      errors.push('Test Case ID must follow format: TC-<MODULE>-<NUMBER>');
    }
    if (!config.title || config.title.length < 10) {
      errors.push('Title must be descriptive and at least 10 characters');
    }
    if (!config.testSteps?.length) {
      errors.push('At least one test step is required');
    }

    const approvedVerbs = ['enter', 'clear', 'check', 'uncheck', 'select', 'click',
      'double-click', 'right-click', 'hover', 'press', 'upload', 'drag', 'scroll'];

    config.testSteps.forEach((step, i) => {
      if (!step.playwrightTag.match(/^\([a-zA-Z-]+\)$/)) {
        errors.push(`Step ${i + 1}: Playwright tag must be in format (action)`);
      }
      if (!approvedVerbs.some(v => step.action.toLowerCase().startsWith(v))) {
        warnings.push(`Step ${i + 1}: Consider starting with an approved verb`);
      }
    });

    if (config.expectedResults.length !== config.testSteps.length) {
      warnings.push('Number of expected results should match number of test steps');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}

export interface TestCaseConfig {
  testCaseId: string;
  module?: string;
  priority?: 'High' | 'Medium' | 'Low';
  author?: string;
  title: string;
  preconditions?: string[];
  testData?: TestData[];
  testSteps: TestStep[];
  expectedResults: string[];
  notes?: string[];
}

export interface TestData {
  identifier: string;
  value: string;
  purpose: string;
}

export interface TestStep {
  action: string;
  playwrightTag: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const PlaywrightActions = {
  fill: 'Text input',
  check: 'Check a checkbox',
  uncheck: 'Uncheck a checkbox',
  setChecked: 'Set checkbox state',
  selectOption: 'Select dropdown option',
  click: 'Click element',
  dblclick: 'Double-click element',
  'right-click': 'Right-click element',
  hover: 'Hover over element',
  press: 'Press a key',
  setInputFiles: 'Upload file(s)',
  dragTo: 'Drag element to target',
  scrollIntoView: 'Scroll element into view',
};
