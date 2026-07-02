# Main Menu UI Polish Design

**Date:** 2026-07-02
**Scope:** MainMenu.tsx + index.css — subtle polish keeping brutalist/cyberpunk style
**Approach:** Polish Subtle — keep layout, refine spacing/typography/effects

## Summary

Comprehensive polish of the Main Menu screen focusing on:
- Background cleanup (reduce visual noise)
- Typography & spacing consistency
- Button visual hierarchy
- Input simplification
- Loading screen enhancement

## Changes

### 1. Background Cleanup

**Goal:** Reduce background layers from 9 to 5 for cleaner visual.

| Keep | Why |
|------|-----|
| Breathing grid (32x32) | Core cyberpunk identity |
| Static noise (opacity 0.04) | Subtle texture |
| 1 rotating crosshair | Visual interest (bottom-right) |
| 15 floating particles | Depth (reduce from 20) |
| 4 corner labels | Technical feel, raise to 9px |

| Remove | Why |
|--------|-----|
| 3 scan beams | Visual noise, competes with crosshair |
| Vertical scan line | Duplicates scan beams |
| SVG technical lines (4 lines + 4 circles) | Nearly invisible, wastes DOM |

**Files:** `MainMenu.tsx` (background section ~lines 361-431)

### 2. Typography & Spacing

**Goal:** Improve readability and visual hierarchy.

| Element | Before | After | Reason |
|---------|--------|-------|--------|
| Badge "EST. CONNECTION" | 9px | 11px | Nearly invisible before |
| Description paragraph | 12px (xs) | 14px (sm) | Hard to read on dark bg |
| Button spacing | space-y-4 (16px) | space-y-3 (12px) | Group buttons tighter |
| Input badge label | 9px | 10px | Slightly more visible |
| Input font size | 3xl-5xl | 2xl-4xl | More balanced with title |

**Files:** `MainMenu.tsx`

### 3. Button Redesign — 3 Tier System

**Goal:** Create clear visual hierarchy between ONLINE / LAN / BOT buttons.

**Tier 1 — ONLINE (Primary):**
- Border: `border-brand` (#FF4500)
- Brutalist shadow: `4px 4px 0px var(--color-brand)`
- Hover: `translate(2px, 2px)` + shadow shrinks
- Icon: `weight="fill"` for emphasis
- Label: `font-black` (900)

**Tier 2 — LAN (Secondary):**
- Border: `border-border-theme` (keep)
- Brutalist shadow: `4px 4px 0px var(--color-border)`
- Hover: same pattern
- Label: `font-bold` (700)

**Tier 3 — BOT (Tertiary):**
- Border: `border-emerald-theme`
- Brutalist shadow: `4px 4px 0px var(--color-emerald-theme)`
- Hover: same pattern
- Add "VS CPU" badge

**Common changes:**
- Padding: `py-4` → `py-5`
- Border-radius: `rounded-lg` → `rounded-md` (more brutalist)
- Remove `btn-shimmer` class (no gradient overlay)
- Remove `btn-shimmer` CSS from index.css

**Files:** `MainMenu.tsx` (buttonDefs + button rendering), `index.css` (remove .btn-shimmer)

### 4. Username Input Simplification

**Goal:** Remove complex custom cursor overlay, use native input.

**Before:**
```tsx
<input className="caret-transparent placeholder-transparent" />
<span className="pointer-events-none absolute">
  {name || <span>{placeholder}</span>}
  {isFocused && <span className="terminal-cursor" />}
</span>
```

**After:**
```tsx
<input
  className="bg-surface border-border-theme text-text-theme
             font-mono font-bold text-2xl sm:text-3xl md:text-4xl
             uppercase tracking-wider p-4 focus:outline-none
             focus:border-brand rounded-md transition-colors"
  placeholder="INPUT_NAME"
/>
```

**Changes:**
- Remove `caret-transparent` — use native caret
- Remove custom cursor `<span>` overlay entirely
- Remove `pulse-glow` animation from container
- Change container `rounded-xl` → `rounded-md`
- Change container `bg-input-theme` → `bg-surface`
- Change container `p-5 sm:p-8` → `p-4 sm:p-6`

**Files:** `MainMenu.tsx` (input section ~lines 490-516)

### 5. Loading Screen Enhancement

**Goal:** Add subtle decorative elements without overcomplicating.

**Additions:**
1. **Corner brackets** around ROULETTE title (4 L-shaped corners, zinc-500, subtle)
2. **Decorative dashed lines** below progress section (2 horizontal, opacity 0.1)
3. **Progress bar**: 2px → 1px height, add subtle glow on leading edge

**Keep unchanged:**
- "SYSTEM INITIALIZATION" label
- "ROULETTE" title (size, animation)
- Status text progression
- Percentage display
- "CLICK TO START" blinking animation

**Files:** `MainMenu.tsx` (loading screen section ~lines 298-358)

## Files to Modify

1. `client/src/components/MainMenu.tsx` — All 5 changes
2. `client/src/index.css` — Remove `.btn-shimmer` class, remove `scan-beam`/`scan-beam-slow`/`scan-vertical` animations if no longer used

## Verification

After each change:
1. `cd client && npm run typecheck` — ensure no TypeScript errors
2. Visual check: run `npm run dev` and verify Main Menu renders correctly
3. Test: loading screen → main menu → modals (LAN, Bot) all work
4. Test: responsive at 375px, 768px, 1024px, 1440px widths
