# Main Menu UI Polish Implementation Plan

> **For agentic workers:** Implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the Main Menu UI — cleaner background, better typography/spacing, button hierarchy, simpler input, enhanced loading screen.

**Architecture:** Modify `MainMenu.tsx` and `index.css` only. Keep brutalist/cyberpunk style. No new files, no new dependencies.

**Tech Stack:** React 19, TailwindCSS v4, Framer Motion

---

### Task 1: Background Cleanup

**Files:**
- Modify: `client/src/components/MainMenu.tsx:361-431` (background section)

- [ ] **Step 1: Remove scan beams and vertical scan line**

In `MainMenu.tsx`, find and DELETE these lines inside the background `<div>`:

```tsx
{/* Multiple scan beams */}
<div className="hidden md:block absolute top-[20%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-theme to-transparent opacity-30 scan-beam pointer-events-none" />
<div className="hidden md:block absolute top-[55%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-theme-muted to-transparent opacity-20 scan-beam-slow pointer-events-none" />
<div className="hidden md:block absolute top-[80%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-theme to-transparent opacity-15 scan-beam pointer-events-none" style={{ animationDelay: '3s' }} />

{/* Vertical scan line */}
<div className="hidden md:block absolute top-0 left-[30%] w-[1px] h-full bg-gradient-to-b from-transparent via-cyan-theme to-transparent opacity-15 scan-vertical pointer-events-none" />
```

- [ ] **Step 2: Remove SVG technical lines**

Find and DELETE this entire block:

```tsx
{/* SVG technical lines */}
<svg className="absolute inset-0 w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
  <line x1="5%" y1="0" x2="5%" y2="100%" stroke="currentColor" strokeWidth="1" strokeDasharray="5,5" className="text-text-theme" />
  <line x1="95%" y1="0" x2="95%" y2="100%" stroke="currentColor" strokeWidth="1" strokeDasharray="5,5" className="text-text-theme" />
  <line x1="0" y1="12%" x2="100%" y2="12%" stroke="currentColor" strokeWidth="1" className="text-text-theme" />
  <line x1="0" y1="88%" x2="100%" y2="88%" stroke="currentColor" strokeWidth="1" className="text-text-theme" />
  <circle cx="5%" cy="12%" r="8" fill="none" stroke="currentColor" strokeWidth="1" className="text-text-theme" />
  <circle cx="95%" cy="12%" r="8" fill="none" stroke="currentColor" strokeWidth="1" className="text-text-theme" />
  <circle cx="5%" cy="88%" r="8" fill="none" stroke="currentColor" strokeWidth="1" className="text-text-theme" />
  <circle cx="95%" cy="88%" r="8" fill="none" stroke="currentColor" strokeWidth="1" className="text-text-theme" />
</svg>
```

- [ ] **Step 3: Reduce particles from 20 to 15**

Find:
```tsx
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
```
Change to:
```tsx
const PARTICLES = Array.from({ length: 15 }, (_, i) => ({
```

- [ ] **Step 4: Raise corner label size from 8px to 9px**

Find the `TypewriterLabel` function at the bottom of MainMenu.tsx. Change:
```tsx
className={`absolute ${pos} font-mono text-[8px] text-text-theme-dim tracking-widest`}
```
To:
```tsx
className={`absolute ${pos} font-mono text-[9px] text-text-theme-dim tracking-widest`}
```

- [ ] **Step 5: Verify — typecheck**

Run: `cd D:\roulette-quiz\client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
cd D:\roulette-quiz
git add client/src/components/MainMenu.tsx
git commit -m "style: clean up MainMenu background — remove scan beams, SVG lines, reduce particles"
```

---

### Task 2: Typography & Spacing

**Files:**
- Modify: `client/src/components/MainMenu.tsx` (title block + right column)

- [ ] **Step 1: Raise badge font size**

Find:
```tsx
className="text-[11px] md:text-[13px] text-zinc-500 tracking-[0.4em] md:tracking-[0.6em] uppercase"
```
Change to:
```tsx
className="text-[11px] md:text-[13px] text-zinc-500 tracking-[0.4em] md:tracking-[0.6em] uppercase py-1 px-3"
```

- [ ] **Step 2: Raise description font size**

Find:
```tsx
className="text-text-theme-muted font-mono text-xs sm:text-sm leading-relaxed max-w-[45ch] uppercase tracking-wider"
```
Change to:
```tsx
className="text-text-theme-muted font-mono text-sm sm:text-base leading-relaxed max-w-[45ch] uppercase tracking-wider mt-4"
```

- [ ] **Step 3: Tighten button spacing**

Find (in the right column, action buttons section):
```tsx
<div className="flex flex-col space-y-4">
```
Change to:
```tsx
<div className="flex flex-col space-y-3">
```

- [ ] **Step 4: Verify — typecheck**

Run: `cd D:\roulette-quiz\client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
cd D:\roulette-quiz
git add client/src/components/MainMenu.tsx
git commit -m "style: improve MainMenu typography — larger badge/description, tighter button spacing"
```

---

### Task 3: Button Redesign — 3 Tier System

**Files:**
- Modify: `client/src/components/MainMenu.tsx` (buttonDefs array + button rendering)
- Modify: `client/src/index.css` (remove .btn-shimmer, .btn-shimmer::after)

- [ ] **Step 1: Update buttonDefs array**

Find and REPLACE the entire `buttonDefs` array:

```tsx
const buttonDefs = [
  { label: 'INITIALIZE ONLINE', icon: Globe, onClick: 'online' as const, tier: 'primary' as const },
  { label: 'LOCAL PROTOCOL // LAN', icon: WifiHigh, onClick: 'lan' as const, tier: 'secondary' as const },
  { label: 'BOT PROTOCOL // VS CPU', icon: Robot, onClick: 'bot' as const, tier: 'tertiary' as const },
];
```

- [ ] **Step 2: Update button rendering**

Find the button mapping section and REPLACE the entire button rendering block:

```tsx
{buttonDefs.map((btn, i) => {
  const Icon = btn.icon;
  const tierStyles = btn.tier === 'primary'
    ? 'border-brand hover:bg-surface-hover hover:border-brand text-text-main'
    : btn.tier === 'tertiary'
      ? 'border-emerald-theme hover:bg-surface-hover hover:border-emerald-theme text-emerald-theme'
      : 'border-border hover:bg-surface-hover hover:border-border text-text-muted';

  return (
    <motion.button
      key={i}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5 + i * 0.12, duration: 0.35 }}
      whileHover={{ x: 6, y: -2 }}
      whileTap={{ scale: 0.98, x: 8, y: 2 }}
      onMouseEnter={() => {
        try { Sounds.buttonHover(); } catch (e) {}
      }}
      onClick={() => handleButtonClick(btn.onClick)}
      disabled={status === 'connecting'}
      className={`flex items-center justify-between px-5 sm:px-8 py-5 bg-surface border rounded-md font-mono text-xs sm:text-sm font-bold tracking-widest uppercase cursor-pointer transition-all duration-200 shadow-[4px_4px_0px_var(--color-brand)] ${
        btn.tier === 'primary' ? 'shadow-[4px_4px_0px_var(--color-brand)]' :
        btn.tier === 'tertiary' ? 'shadow-[4px_4px_0px_var(--color-emerald-theme)]' :
        'shadow-[4px_4px_0px_var(--color-border)]'
      } ${tierStyles} ${shakingBox === i + 1 ? 'box-shake' : ''}`}
    >
      <span className="flex items-center gap-3">
        <Icon size={18} weight={btn.tier === 'primary' ? 'fill' : 'bold'} className={btn.tier === 'primary' ? 'text-brand' : ''} />
        {btn.label}
      </span>
      <ArrowRight size={18} className="text-text-muted" />
    </motion.button>
  );
})}
```

- [ ] **Step 3: Remove .btn-shimmer CSS from index.css**

Find and DELETE from `client/src/index.css`:
```css
.btn-shimmer {
  position: relative;
  overflow: hidden;
}

.btn-shimmer::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
  transition: left 0.5s ease;
}

.btn-shimmer:hover::after {
  left: 100%;
}
```

Also check if `.scan-beam`, `.scan-beam-slow`, `.scan-vertical` CSS classes exist in index.css and remove them if they do (they were used by the scan beams we removed in Task 1).

- [ ] **Step 4: Verify — typecheck**

Run: `cd D:\roulette-quiz\client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
cd D:\roulette-quiz
git add client/src/components/MainMenu.tsx client/src/index.css
git commit -m "style: redesign MainMenu buttons — 3 tier hierarchy with brutalist shadows"
```

---

### Task 4: Username Input Simplification

**Files:**
- Modify: `client/src/components/MainMenu.tsx:490-516` (input section)

- [ ] **Step 1: Replace input container and input element**

Find the entire username input block (from `<div className={`border border-border-theme rounded-xl p-5...`}`) and REPLACE with:

```tsx
<div className="border border-border rounded-md p-4 sm:p-6 flex flex-col space-y-2 bg-surface transition-all duration-300">
  <label className="font-mono text-[10px] text-text-muted tracking-widest">
    // USER_IDENTIFICATION_KEY
  </label>
  <input
    type="text"
    value={name}
    onChange={(e) => setName(e.target.value.substring(0, 12).toUpperCase())}
    disabled={status === 'connecting'}
    placeholder="INPUT_NAME"
    className="bg-transparent text-text-main font-mono font-bold text-2xl sm:text-3xl md:text-4xl uppercase tracking-wider focus:outline-none focus:border-brand placeholder:text-text-muted/30 w-full transition-colors"
  />
</div>
```

- [ ] **Step 2: Verify — typecheck**

Run: `cd D:\roulette-quiz\client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd D:\roulette-quiz
git add client/src/components/MainMenu.tsx
git commit -m "style: simplify MainMenu username input — remove custom cursor overlay"
```

---

### Task 5: Loading Screen Enhancement

**Files:**
- Modify: `client/src/components/MainMenu.tsx:298-358` (loading screen section)

- [ ] **Step 1: Add corner brackets around title**

Find the loading screen title section:
```tsx
<h2 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-thin text-zinc-200 tracking-[0.15em] md:tracking-[0.25em] uppercase translate-x-[0.125em]">
  ROULETTE
</h2>
```

Wrap it with corner brackets. Replace the entire `<div className="flex flex-col items-center space-y-4 md:space-y-6">` block (the header text section) with:

```tsx
<div className="flex flex-col items-center space-y-4 md:space-y-6">
  <span className="text-[11px] md:text-[13px] text-zinc-500 tracking-[0.4em] md:tracking-[0.6em] uppercase">SYSTEM INITIALIZATION</span>
  <div className="relative px-8 py-4">
    {/* Corner brackets */}
    <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-zinc-600"></div>
    <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-zinc-600"></div>
    <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-zinc-600"></div>
    <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-zinc-600"></div>
    <h2 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-thin text-zinc-200 tracking-[0.15em] md:tracking-[0.25em] uppercase translate-x-[0.125em]">
      ROULETTE
    </h2>
  </div>
</div>
```

- [ ] **Step 2: Thin the progress bar and add decorative lines**

Find the progress bar section:
```tsx
<div className="w-full h-[2px] bg-zinc-900 relative">
```
Change to:
```tsx
<div className="w-full h-[1px] bg-zinc-900 relative">
```

Find (below the progress percentage text):
```tsx
{/* Bottom interactive action */}
```
Add decorative dashed lines BEFORE it:

```tsx
{/* Decorative lines */}
<div className="w-full flex justify-center gap-8 mt-2">
  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-zinc-800 opacity-30"></div>
  <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-zinc-800 opacity-30"></div>
</div>

{/* Bottom interactive action */}
```

- [ ] **Step 3: Verify — typecheck**

Run: `cd D:\roulette-quiz\client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
cd D:\roulette-quiz
git add client/src/components/MainMenu.tsx
git commit -m "style: enhance MainMenu loading screen — corner brackets, thinner progress bar, decorative lines"
```

---

### Task 6: Final Verification

- [ ] **Step 1: Full typecheck**

Run: `cd D:\roulette-quiz\client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Visual verification**

Run: `cd D:\roulette-quiz\client && npm run dev`

Check:
1. Loading screen renders with corner brackets and thin progress bar
2. Main Menu: background is cleaner (no scan beams)
3. Main Menu: 3 buttons have distinct visual styles (red/neutral/green)
4. Main Menu: input uses native caret
5. Main Menu: typography is more readable
6. All modals (LAN, Bot) still work
7. Responsive: test at 375px, 768px, 1024px, 1440px

- [ ] **Step 3: Final commit (if any fixups needed)**

```bash
cd D:\roulette-quiz
git add -A
git commit -m "style: MainMenu UI polish — final fixes"
```
