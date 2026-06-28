# Custom Cursor Implementation - MainMenu

## Overview
Custom terminal-style blinking cursor for the name input field in MainMenu.

## Final Implementation

### State & Refs
```tsx
const [name, setName] = useState<string>('');
const [isFocused, setIsFocused] = useState<boolean>(false);
const inputRef = useRef<HTMLInputElement>(null);
const [cursorPos, setCursorPos] = useState<number>(0);
```

### Cursor Position Calculation (Monospace Font)
```tsx
useEffect(() => {
  const el = inputRef.current;
  if (!el) return;
  const style = getComputedStyle(el);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const charWidth = ctx.measureText('M').width;
  const letterSpacing = parseFloat(style.letterSpacing) || 0;
  const textLen = name.length || 10; // "INPUT_NAME" = 10 chars
  setCursorPos(textLen * charWidth + textLen * letterSpacing);
}, [name]);
```

### JSX Structure
```tsx
<div className="relative flex items-center">
  <input
    ref={inputRef}
    type="text"
    value={name}
    onChange={(e) => setName(e.target.value.substring(0, 12).toUpperCase())}
    onFocus={() => setIsFocused(true)}
    onBlur={() => setIsFocused(false)}
    className="bg-transparent text-5xl sm:text-6xl font-mono font-bold text-text-theme focus:outline-none w-full uppercase tracking-wider pr-4"
    style={{ caretColor: 'transparent' }}
  />
  {!name && (
    <div className="absolute left-0 flex items-center pointer-events-none">
      <span className="text-5xl sm:text-6xl font-mono font-bold text-text-theme-dim tracking-wider">
        INPUT_NAME
      </span>
    </div>
  )}
  <span
    className="absolute top-1/2 -translate-y-1/2 w-3 h-10 bg-text-theme/50 terminal-cursor pointer-events-none"
    style={{ left: `${cursorPos}px` }}
  />
</div>
```

### CSS Animation
```css
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.terminal-cursor {
  animation: blink 0.9s infinite;
}
```

## How It Works

1. **Native caret hidden** - `caretColor: 'transparent'` hides the default browser cursor
2. **Custom cursor element** - A `span` with `terminal-cursor` class renders the blinking effect
3. **Position calculation** - Uses canvas `measureText()` to get exact character width
4. **Monospace advantage** - All characters have same width, so `charWidth * textLen` is accurate
5. **Letter-spacing included** - Adds `letterSpacing` from computed style for precision
6. **Placeholder fallback** - When input is empty, uses 10 characters (length of "INPUT_NAME")

## Iterations (What Didn't Work)

### Attempt 1: Cursor on right side
```tsx
<input ... />
<span className="terminal-cursor" /> // Always on right
```
**Problem**: Cursor should be next to text, not at the end of the row.

### Attempt 2: Canvas measureText with breakpoint font sizes
```tsx
const fontSize = window.innerWidth >= 1024 ? 153.6 : ...;
ctx.font = `bold ${fontSize}px monospace`;
```
**Problem**: Hardcoded font sizes didn't match actual rendered font.

### Attempt 3: Hidden span with `invisible` class
```tsx
<span ref={measureRef} className="invisible absolute ...">
  {name || 'INPUT_NAME'}
</span>
```
**Problem**: `position: absolute` took element out of flow, width calculation was wrong.

### Attempt 4: Canvas with `getComputedStyle`
```tsx
const style = getComputedStyle(inputRef.current);
ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
```
**Problem**: Font properties from computed style didn't produce accurate measureText results.

### Final: Canvas measureText with single character
```tsx
const charWidth = ctx.measureText('M').width;
const textLen = name.length || 10;
setCursorPos(textLen * charWidth + textLen * letterSpacing);
```
**Why it works**: Monospace fonts have uniform character width. Measuring one character gives the exact width for all characters. Adding letterSpacing accounts for `tracking-wider` Tailwind class.
