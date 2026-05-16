---
name: open-design
description: Use the bundled Open Design workflow and design-system library to create, critique, and refine polished UI artifacts, prototypes, dashboards, landing pages, decks, and DESIGN.md files.
triggers:
  - 'open design'
  - 'design system'
  - 'prototype'
  - 'landing page'
  - 'dashboard'
  - 'visual direction'
  - 'design critique'
---

# Open Design

This skill integrates the local Open Design design-system workflow into Necter.
It is sourced from `https://github.com/nexu-io/open-design` at commit
`26502ea1246c61114fd2038af9036adb4b80fca2` and is bundled under the Apache-2.0
license included as `LICENSE.Apache-2.0`.

## When To Use

Use this skill when the user asks to design, redesign, prototype, brand, polish,
critique, or document a visual interface. It is especially useful for:

- Creating web/app prototypes from a short brief.
- Producing or updating a `DESIGN.md` source of truth.
- Applying a named design-system style from `design-systems/`.
- Running a design critique before or after implementation.
- Improving a GUI while preserving an intentional design direction.

## Local References

- `design-systems/` contains the bundled Open Design design-system library.
- `references/design-systems.md` explains the 9-section `DESIGN.md` schema.
- `references/skills-protocol.md` describes the Open Design skill protocol.
- `references/architecture.md` documents the upstream Open Design architecture.

Only open the specific design-system files that match the current task. Do not
bulk-load the full library into context.

## Workflow

1. Clarify the target surface: app, page, dashboard, deck, document, or asset.
2. Pick a visual direction from the bundled `design-systems/` library, or create
   a project-specific `DESIGN.md` using the 9-section schema.
3. Treat the selected `DESIGN.md` as the source of truth for color, typography,
   spacing, layout, components, motion, voice, and anti-patterns.
4. Implement the actual artifact or GUI changes in the user's project.
5. Verify the result visually when possible and revise obvious layout, contrast,
   text-fit, or interaction issues.

## Output Bar

- Prefer working code and concrete files over descriptive mockups.
- Preserve the host app's existing framework and component conventions.
- Keep accessibility, responsive behavior, and text fit as first-class checks.
- Cite the selected design-system slug in summaries when it materially shaped
  the result.
