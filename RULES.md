# Front-End Development Rules

## 1. CSS Rules
1. Never use inline styles (`style={{...}}` or `style="..."`).
2. Never use `<style>` tags inside components.
3. Store all styles in external CSS files.
4. Every page/component must have its own CSS file.
5. Use `className` only for styling.
6. Use modifier classes for dynamic states (`.is-active`, `.is-disabled`, `.is-error`, etc.).
7. Do not generate CSS-in-JS or styled-components.
8. Do not use `!important` unless absolutely necessary.

## 2. Component Rules
1. Keep components small and focused.
2. One component = one responsibility.
3. Extract reusable UI into shared components.
4. Do not duplicate JSX.
5. Use functional components only.

## 3. State Management
1. Keep state as local as possible.
2. Do not create unnecessary global state.
3. Avoid prop drilling when possible.
4. Remove unused state and effects.

## 4. API Rules
1. All API calls must go through a central API service.
2. Never call `fetch()` directly inside UI components.
3. Handle loading, success, and error states.
4. Show user-friendly error messages.

## 5. Forms
1. Validate before submission.
2. Disable submit while saving.
3. Show validation errors clearly.
4. Reset form only after successful submission.

## 6. File Structure
1. One component per file.
2. One CSS file per component/page.
3. Keep folder structure consistent.
4. Remove unused files and imports.

## 7. Code Quality
1. No commented-out code.
2. No dead code.
3. No duplicate logic.
4. Use meaningful variable and function names.
5. Keep functions short and readable.

## 8. UI/UX
1. Maintain consistent spacing.
2. Maintain consistent colors.
3. Maintain consistent typography.
4. Reuse existing UI components.
5. Ensure responsive layouts.
6. Display loading indicators where needed.
7. Display empty states when no data exists.

## 9. Performance
1. Avoid unnecessary re-renders.
2. Memoize only when beneficial.
3. Lazy-load large pages if needed.
4. Avoid unnecessary API requests.

## 10. Accessibility
1. Use semantic HTML.
2. Every input must have a label.
3. Every button must have meaningful text.
4. Keyboard navigation must work.
5. Images must have alt text.

## 11. General Rules
1. Follow the existing project structure.
2. Do not introduce new libraries unless explicitly requested.
3. Do not modify unrelated files.
4. Keep implementations simple and maintainable.
5. Build one feature at a time and ensure it is fully functional before moving to the next.
6. Preserve existing functionality unless a change is explicitly requested.

## CSS Consistency
1. Never duplicate CSS rules.
2. Reuse existing CSS classes whenever possible.
3. Do not create multiple classes that achieve the same styling.
4. Prefer extending existing styles over creating new ones.

## CSS Overrides
1. Do not override existing CSS unless explicitly required.
2. Modify the original class instead of creating conflicting overrides.
3. Avoid increasing selector specificity unnecessarily.
4. Never rely on `!important` except as a last resort.

## Reuse Before Create
1. Before creating a new component, check if one already exists.
2. Before creating a new CSS class, check if an existing class can be reused.
3. Before adding a new utility, check if the project already provides one.
4. Do not duplicate helper functions.

## Avoid Overlapping Logic
1. A feature should have a single implementation.
2. Do not implement the same business logic in multiple components.
3. Shared logic should be extracted into reusable utilities or hooks.
4. Keep a single source of truth for data.

## Naming
1. Do not create classes with similar meanings (e.g., `.btn-primary`, `.primary-btn`, `.button-primary`).
2. Follow the existing naming convention throughout the project.
3. Use descriptive and consistent names.

## Refactoring
1. If new code duplicates existing code, refactor instead of copying.
2. Remove obsolete code after refactoring.
3. Keep the codebase cleaner than before the change.

## General
1. Do not create multiple ways of solving the same problem.
2. Maintain consistency across the entire application.
3. Prefer modifying existing code over adding parallel implementations.

Always inspect the existing codebase before implementing a feature. Reuse existing patterns, components, utilities, CSS classes, and architecture whenever possible. Maintain consistency with the current codebase instead of introducing alternative implementations.

## Before Implementation
1. Inspect the existing codebase before writing any code.
2. Reuse existing components, utilities, hooks, services, and CSS whenever possible.
3. Follow existing patterns instead of introducing new ones.
4. If an existing implementation can be extended, extend it instead of creating a new one.

## Imports
1. Remove unused imports.
2. Do not create circular dependencies.
3. Keep import ordering consistent with the project.

## Error Handling
1. Handle all API failures gracefully.
2. Never leave unhandled promise rejections.
3. Show meaningful error messages to users.
4. Log unexpected errors appropriately.

## TypeScript
1. Do not use `any` unless absolutely necessary.
2. Prefer existing interfaces and types.
3. Keep types centralized when shared.
4. Remove unused types.

## Clean Code
1. No TODOs or placeholder implementations unless explicitly requested.
2. No unused variables, functions, or files.
3. Complete the feature before considering it finished.
4. Ensure the project builds without errors.

## Feature Completion
A feature is complete only when:
1. Backend is implemented.
2. Frontend is implemented.
3. Validation is complete.
4. Error handling is complete.
5. Loading states are implemented.
6. The feature is tested.
7. No regressions are introduced.

Each page should have its own CSS file. Small reusable components should either have their own CSS file or reuse an existing shared stylesheet where appropriate.