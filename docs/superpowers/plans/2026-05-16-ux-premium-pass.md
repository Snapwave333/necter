# UX Premium Pass — Cinematic AI Workstation

## Goal
Transform Necter from "minimal cyber" to "cinematic AI workstation" — Apple/Linear/Vercel depth without the border addiction.

## Design Philosophy
Borders → Depth. Contrast through blur, transparency, glow, shadow, and spacing — not lines.

---

## 1. globals.css — Depth System (HIGH IMPACT, do first)

### New CSS Variables
```css
/* Depth layers — replace border-based separation */
--depth-1: 0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04);
--depth-2: 0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06);
--depth-3: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08);

/* Atmospheric surfaces — very subtle gradients instead of flat #181818 */
--surface-glass: rgba(255,255,255,0.03);
--surface-elevated: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);

/* Edge glow (chromatic lighting) */
--edge-cyan: rgba(6, 182, 212, 0.15);
--edge-violet: rgba(139, 92, 246, 0.10);

/* Rename border variable to "separator" semantics */
--color-separator: rgba(255,255,255,0.07);
--color-separator-subtle: rgba(255,255,255,0.04);
```

### Replace `.card` class
```css
/* OLD */
.card { @apply bg-surface rounded-2xl shadow-card border border-border-subtle; }
/* NEW */
.card {
  background: var(--surface-elevated);
  border-radius: 16px;
  box-shadow: var(--depth-1);
  backdrop-filter: blur(12px);
}
```

### Replace `.message-user` bubble
```css
/* OLD */
.message-user { @apply bg-surface rounded-[1.5rem] border border-border; }
/* NEW */
.message-user {
  background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%);
  border-radius: 1.5rem;
  box-shadow: var(--depth-1);
  border: 1px solid var(--color-separator-subtle);
}
```

### Add `.message-assistant` (new)
```css
.message-assistant {
  background: linear-gradient(135deg, rgba(6,182,212,0.06) 0%, rgba(6,182,212,0.02) 100%);
  border-radius: 1.25rem 1.25rem 1.25rem 0.25rem;
  box-shadow: var(--depth-1);
  border: 1px solid var(--color-separator-subtle);
}
```

### Replace `.btn-secondary` border
```css
/* OLD */
.btn-secondary { @apply bg-surface border border-border hover:bg-surface-hover; }
/* NEW */
.btn-secondary {
  background: var(--surface-glass);
  border: 1px solid var(--color-separator);
  backdrop-filter: blur(8px);
}
.btn-secondary:hover {
  background: rgba(255,255,255,0.06);
  box-shadow: var(--depth-1);
}
```

### Add edge glow utility classes
```css
.edge-glow-cyan { box-shadow: inset 0 1px 0 var(--edge-cyan), var(--depth-1); }
.edge-glow-violet { box-shadow: inset 0 1px 0 var(--edge-violet), var(--depth-1); }
```

### Update `.input` focus state
```css
/* Remove border on focus, use glow ring */
.input:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-accent-muted), var(--depth-1);
  border-color: transparent;
}
```

### Add `.thinking-pulse` keyframe
```css
/* Streaming cognition animation */
@keyframes thinkingPulse {
  0%, 100% { opacity: 0.4; transform: scale(0.97); }
  50% { opacity: 1; transform: scale(1.02); }
}
.streaming-dot {
  animation: thinkingPulse 1.4s ease-in-out infinite;
}
.streaming-dot:nth-child(2) { animation-delay: 0.2s; }
.streaming-dot:nth-child(3) { animation-delay: 0.4s; }
```

### Add atmospheric background extension
```css
/* Extend app-shell gradient to be more present */
.app-shell::before {
  opacity: 1; /* was 0.72, too subtle */
  /* Add violet edge glow */
  background:
    linear-gradient(120deg, rgba(6,182,212,0.08) 0%, transparent 30%),
    linear-gradient(240deg, rgba(139,92,246,0.06) 0%, transparent 30%),
    linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 25%);
}
```

---

## 2. ContextPanel — AI Cockpit Redesign

### Replace percentage text with radial meter
In the token/context section, replace `31%` text with an SVG radial gauge:
```tsx
// Replace:
<span className="text-2xl font-display font-bold">{percentage.toFixed(0)}%</span>
// With: inline SVG donut chart, 48px, cyan arc on dark track
```

### Glass tint for panel
```tsx
<div className="bg-surface/70 backdrop-blur-xl border-l border-border-subtle ...">
  {/* Glass effect + left edge cyan glow */}
```

### Active model card glow
When a connector is active (status=working), add:
```tsx
<div className={`rounded-xl transition-all duration-500 ${
  activeConnector ? 'shadow-[0_0_20px_rgba(6,182,212,0.25)] border border-accent/30' : 'border border-border-subtle'
}`}>
```

### Connector list items
Remove `border-border` on each item. Use hover background shift + left accent line instead:
```tsx
<div className={`group relative pl-3 py-2 rounded-lg transition-all duration-200 hover:bg-surface-hover cursor-pointer
  ${active ? 'bg-accent/5' : ''}`}>
  {/* Left accent line appears on hover/active */}
  <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-accent transition-all duration-300 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`} />
```

---

## 3. MessageCard — Depth Hierarchy

### Assistant bubble upgrade
In the assistant message branch, apply `.message-assistant` class:
```tsx
<div className="message-assistant px-5 py-4 ...">
```

### Remove border on user message, use depth instead
```tsx
<div className={`message-user ${/* no more border here */}`}>
```

### Reduce border-borders globally in message area
In `ContentBlockView` and sub-components — replace `border-border` with transparent + shadow.

---

## 4. ThinkingBlock — Make Cognition Feel Alive

### Animated streaming indicator
Replace static collapsed preview with animated dots/bars:
```tsx
{!expanded && (
  <div className="flex items-center gap-1.5 flex-1">
    {/* Animated dots */}
    <span className="streaming-dot w-1 h-1 rounded-full bg-mcp" />
    <span className="streaming-dot w-1 h-1 rounded-full bg-mcp/70" />
    <span className="streaming-dot w-1 h-1 rounded-full bg-mcp/40" />
    <span className="text-[11px] text-text-muted/60 truncate italic ml-1">
      {previewNodes}
    </span>
  </div>
)}
```

### Upgrade card feel
```tsx
// Remove border-border, add depth
<div className="rounded-xl overflow-hidden transition-all duration-300
  ${expanded ? 'shadow-[0_0_24px_rgba(168,132,208,0.15)] bg-mcp/5' : 'shadow-depth-1 bg-background/50'}">
```

---

## 5. Sidebar — Visual Anchors

### Session item depth
```tsx
<div className={`
  group relative px-3 py-2.5 rounded-xl cursor-pointer
  transition-all duration-200
  hover:bg-surface-hover
  ${isActive ? 'bg-accent/10 shadow-[0_0_16px_rgba(6,182,212,0.12)]' : ''}
`}>
```

### Remove border on session items. Use hover bg shift + left accent.

### Add AI-state glyph per session (optional, time permitting)
```tsx
// Small inline SVG icon per message role or session type
// Or a tiny model badge
```

---

## 6. Input Bar — The Sacred Portal

### Upgrade focus state
```tsx
<div className={`
  relative rounded-2xl transition-all duration-500
  ${isFocused ? 'shadow-[0_0_0_2px_rgba(6,182,212,0.3),0_0_30px_rgba(6,182,212,0.15)]' : 'shadow-depth-1'}
  bg-surface border border-border-subtle
`}>
```

### Idle breathing animation
Add subtle scale animation when idle (not focused):
```css
@keyframes idleBreath {
  0%, 100% { box-shadow: var(--depth-1); }
  50% { box-shadow: var(--depth-1), 0 0 20px rgba(6,182,212,0.05); }
}
.input-idle { animation: idleBreath 4s ease-in-out infinite; }
```

---

## 7. ContextPanel — Artifacts Section

### Remove raw text listing
Replace with icon cards:
```tsx
// OLD: plain text list of file paths
// NEW: icon + label + type badge + timestamp
<div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface/50 hover:bg-surface transition-all">
  <FileCode2 className="w-4 h-4 text-accent flex-shrink-0" />
  <span className="text-sm text-text-primary flex-1 truncate">{label}</span>
  <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider">{ext}</span>
</div>
```

---

## 8. ChatView Header — Orb + Mute Integration

Add subtle transition on header state changes:
```tsx
<div className="transition-all duration-300 ${isWorking ? 'shadow-[inset_0_-1px_0_rgba(6,182,212,0.2)]' : ''}">
```

---

## Implementation Order

1. **globals.css** — depth system, new variables, class replacements (high impact, affects everything)
2. **MessageCard** — bubble upgrade, assistant depth
3. **ThinkingBlock** — animated dots, depth card
4. **ContextPanel** — glass tint, radial meter, active glow, artifact cards
5. **Sidebar** — session item depth, remove borders
6. **ChatView** — input bar sacred upgrade
7. **Build & verify**

## Constraints
- Do NOT change layout structure (columns, panels)
- Do NOT add new dependencies
- Preserve all existing functionality
- Keep dark theme primary; light theme inherits via CSS variables
- All animations must respect `prefers-reduced-motion`
