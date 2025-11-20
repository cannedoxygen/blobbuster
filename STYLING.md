# 🎬 Blockbuster - Style Guide

## 🎨 Overall Style

**Primary aesthetic:**
Bold 80s Blockbuster branding - chunky, graphic, high-contrast

**Mood:** Retro, nostalgic, bold, confident, iconic 80s/90s video rental

- NO soft glows or gradients
- Geometric shapes with smooth rounded corners (border-radius: 0.5rem)
- Bold 3-4px borders
- Chunky drop shadows (4px 4px, 6px 6px on hover)
- High contrast yellow/blue color scheme
- Everything uppercase and bold

---

## 🎨 Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| **Blockbuster Blue** | `#002D72` | Primary background, text on yellow buttons |
| **Blockbuster Dark Blue** | `#001144` | Card backgrounds, darker elements |
| **Blockbuster Yellow/Gold** | `#FFD700` | Primary accent, buttons, headings, borders |
| **Light Yellow** | `#FFC700` | Hover states |
| **Deep Black/Blue** | `#000033` | Shadows |
| **White** | `#FFFFFF` | Body text |

### Neon Accents (optional highlights)
- Neon Blue: `#00f5ff`
- Neon Pink: `#ff007f`
- Neon Green: `#39ff14`

---

## 🧱 Layout Rules

All UI elements follow classic Blockbuster branding:

- **Rounded corners** - border-radius: 0.5rem (8px) for smooth edges
- **Chunky borders** - 3px minimum, 4px preferred
- **Drop shadows** - offset shadows (4px 4px 0, not blurred)
- **High contrast** - yellow on blue, white on blue
- **Bold typography** - Arial Black, uppercase, letter-spacing
- **Geometric shapes** - rectangles and rounded rectangles

---

## 🔥 UI Element Rules

### Buttons

- **Shape:** Rounded rectangle (border-radius: 0.5rem)
- **Fill:** `#FFD700` yellow
- **Text:** `#002D72` blue, uppercase, bold
- **Border:** 3px solid `#002D72`
- **Shadow:** `4px 4px 0 #000033`
- **Hover:**
  - Transform: `translate(-3px, -3px)`
  - Shadow: `6px 6px 0 #000033`
  - Background: `#FFC700`

### Headers/Titles

- Color: `#FFD700`
- Text-shadow: `3px 3px 0 #001144`
- Text-transform: uppercase
- Letter-spacing: 2px
- Font-weight: 900

### Cards

- Background: `#001144`
- Border: `3px solid #FFD700`
- Border-radius: 0.5rem (rounded corners)
- Shadow: `4px 4px 0 #000033`
- Hover: `6px 6px 0 #000033` + translate

### Dividers / Lines

- Color: `#FFD700`
- Height: 1-4px solid line
- No decorative elements

### Links

- Color: `#FFD700`
- Text-transform: uppercase
- Font-weight: bold
- Hover: `#FFC700` with `2px 2px 0 #001144` text-shadow

---

## ✨ Special Effects

### Neon Pulse Animation
```css
@keyframes neon-pulse {
  0%, 100% {
    text-shadow: 0 0 10px #FFD700, 0 0 20px #FFD700, 0 0 30px #FFD700;
  }
  50% {
    text-shadow: 0 0 20px #FFD700, 0 0 30px #FFD700, 0 0 40px #FFD700;
  }
}
```

Apply to main headings and important callouts.

---

## 🚫 What NOT to Do

- ❌ NO soft shadows or blurs (use offset shadows only)
- ❌ NO gradients (solid colors only)
- ❌ NO lowercase text (uppercase everywhere)
- ❌ NO thin borders (3px minimum)
- ❌ NO modern smooth animations
- ❌ NO pastel or muted colors
- ❌ NO overly rounded corners (0.5rem max)
