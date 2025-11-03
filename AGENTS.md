# Agent Guidelines for Flow Research Repository

## Build/Lint/Test Commands
- **Lint**: `markdownlint "**/*.md"` (catches formatting issues)
- **Test single file**: `markdownlint "research/filename.md"`
- **Check TODOs**: `rg -n "TODO" research` (ensure no scaffolding remains)
- **Full validation**: Run lint + TODO check before PRs

## Code Style Guidelines (for future code additions)
- **Imports**: Group by stdlib, third-party, local; sort alphabetically
- **Formatting**: Use Prettier/black for consistent formatting
- **Types**: Strict TypeScript types; avoid `any`; prefer interfaces over types
- **Naming**: camelCase for variables/functions, PascalCase for classes/components
- **Error Handling**: Use try/catch with specific error types; log context
- **Documentation**: JSDoc/TSDoc for public APIs; inline comments only for complex logic

## Markdown Style Guidelines
- **Headings**: Standard Markdown (# ## ###); sentence case titles
- **Paragraphs**: 3-5 sentences max; bold sparingly for emphasis
- **Citations**: Inline immediately after statements: `[source](url)`
- **File Names**: lowercase_with_underscores; follow `<agent>_metalearning-guide-to-modern-tech.md` pattern

## Development Workflow
- Start with outline for new agent briefs; share in PR description for feedback
- Add citations immediately when drafting; use TODO placeholders for gaps
- Self-review: verify flow, remove redundancy, confirm audience fit
- Run validation commands before commits
