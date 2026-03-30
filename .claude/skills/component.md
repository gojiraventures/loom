---
name: component
description: Create a new React component following the Unraveled.ai design system
user_invocable: true
---

# Create Component

Create a new React component: $ARGUMENTS

## Rules

1. Create at `/src/components/[ComponentName].tsx` (or `/src/components/ui/` for primitives)
2. TypeScript with proper props interface exported
3. Use Tailwind CSS with our CSS variables — never hardcode colors:
   - Backgrounds: `bg-ground`, `bg-ground-light`, `bg-ground-lighter`
   - Text: `text-text-primary`, `text-text-secondary`, `text-text-tertiary`
   - Accents: `text-gold`, `text-teal`, `border-border`
   - Traditions: `var(--color-tradition-biblical)`, etc.
4. Fonts: `font-serif` (Newsreader for headings), `font-sans` (IBM Plex Sans for body), `font-mono` (IBM Plex Mono for labels/data)
5. Use framer-motion for scroll-triggered animations and transitions
6. Mobile-first responsive design
7. "use client" directive only if the component uses hooks or event handlers

## Aesthetic

Swiss International Style meets museum exhibition. Premium, clean, credible.
- Generous whitespace, strong typographic hierarchy
- Labels: `font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary`
- Headings: `font-serif text-2xl` or larger
- Body: `text-sm text-text-secondary leading-relaxed`
- Borders: `border border-border`
- NEVER: conspiracy aesthetics, neon colors, excessive animation, garish gradients
