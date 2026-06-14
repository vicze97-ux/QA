// Single canonical BasePage for this project.
// Re-exports the skill implementation so all page objects get heal() automatically
// regardless of whether they live in pages/ or reference the skill directly.
export { BasePage } from '../.claude/skills/page-object-model/BasePage';
