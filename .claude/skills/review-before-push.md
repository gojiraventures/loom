---
name: review-before-push
description: Review all uncommitted changes for quality, bugs, design system compliance, and content accuracy before pushing
user_invocable: true
---

# Review Before Push

Review all current changes before pushing. Run `git diff` and `git status`, then check each changed file:

1. **TypeScript** — type errors, missing imports, unused variables
2. **Design system** — using Tailwind CSS variables (not hardcoded colors), correct font classes, proper spacing
3. **Content accuracy** — do hardcoded facts match the source documents in `/docs/`? Are citations correct?
4. **Source citations** — every factual claim has a named source? Links valid?
5. **Accessibility** — alt text on images, semantic HTML, keyboard navigable
6. **SEO** — meta tags on new pages, JSON-LD structured data, OG tags
7. **Mobile** — responsive classes, nothing broken at small widths
8. **Performance** — unnecessarily large imports, missing dynamic imports for heavy components

For each issue found, report:
- File and line number
- Problem description
- Suggested fix
- Severity: MUST FIX | SHOULD FIX | NICE TO HAVE

End with: "Safe to push" or "Fix N issues first" with the must-fix list.
