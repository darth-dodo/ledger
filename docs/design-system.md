# Ledger Design System

A minimal, modern design language for a personal finance tool. Calm, precise, trustworthy.

**Aesthetic**: Quiet confidence. A well-designed banking app, not a SaaS dashboard.
**Principle**: Every element earns its place. No decoration without purpose.

---

## Color

| Token          | Hex       | Usage                            |
| -------------- | --------- | -------------------------------- |
| Background     | `#FAFAFA` | Page background (warm off-white) |
| Surface        | `#FFFFFF` | Cards, panels                    |
| Border         | `#E8E8EC` | Dividers, card borders           |
| Text Primary   | `#18181B` | Body text (zinc-900)             |
| Text Secondary | `#71717A` | Supporting text (zinc-500)       |
| Text Muted     | `#A1A1AA` | Placeholders (zinc-400)          |
| Accent         | `#4361EE` | Primary actions, active states   |
| Accent Hover   | `#3651D4` | Interactive hover                |
| Credit         | `#16A34A` | Money in (green-600)             |
| Debit          | `#DC2626` | Money out (red-600)              |
| Danger Surface | `#FEF2F2` | Danger zone backgrounds          |

### Rules

- `Accent` only for primary CTAs and active states. One blue element per visual group.
- `Credit`/`Debit` are semantic only. Never decorative.
- Borders: 1px `#E8E8EC`. No heavy borders.
- Dark backgrounds limited to navbar (`#18181B` zinc-900).

### CSS Variables

```css
@theme {
  --color-base-100: #ffffff;
  --color-base-200: #fafafa;
  --color-base-300: #e8e8ec;
  --color-base-content: #18181b;
  --color-primary: #4361ee;
  --color-primary-content: #ffffff;
  --color-neutral: #18181b;
  --color-neutral-content: #fafafa;
  --color-success: #16a34a;
  --color-error: #dc2626;
  --color-info: #4361ee;
}
```

---

## Typography

### Font

**DM Sans** — one typeface, variable weight (400–700). Clean geometric with humanist details.
**DM Mono** — for financial data (amounts, dates).

```html
<!-- index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap"
  rel="stylesheet"
/>
```

```css
/* styles.css */
body {
  font-family: 'DM Sans', system-ui, sans-serif;
}
```

### Scale

| Token         | Size | Weight | Use                          |
| ------------- | ---- | ------ | ---------------------------- |
| `page-title`  | 24px | 600    | Page headings                |
| `section`     | 16px | 600    | Card titles, section headers |
| `body`        | 14px | 400    | Default UI text              |
| `body-medium` | 14px | 500    | Labels, emphasized text      |
| `caption`     | 12px | 400    | Timestamps, hints, metadata  |
| `mono`        | 13px | 400    | Amounts, dates (DM Mono)     |

### Rules

- Page titles: `text-2xl font-semibold tracking-tight`. One per page.
- Never use `font-bold` in page content. `font-semibold` for headings only.
- All-caps only for tiny labels: `text-xs uppercase tracking-wider`.
- Financial amounts: always `font-mono tabular-nums`.

---

## Spacing

Base unit: **4px**.

| Context               | Value | Tailwind    |
| --------------------- | ----- | ----------- |
| Page padding          | 32px  | `p-8`       |
| Page padding (mobile) | 16px  | `p-4`       |
| Card padding          | 24px  | `p-6`       |
| Section gap           | 24px  | `space-y-6` |
| Element gap           | 12px  | `gap-3`     |
| Inline gap            | 8px   | `gap-2`     |

### Content Width

| Page         | Tailwind    |
| ------------ | ----------- |
| Upload       | `max-w-xl`  |
| Transactions | `max-w-4xl` |
| Chat         | Full flex   |
| Settings     | `max-w-lg`  |
| Outer shell  | `max-w-6xl` |

---

## Radius

| Element      | Radius       | Tailwind      |
| ------------ | ------------ | ------------- |
| Buttons      | 8px          | `rounded-lg`  |
| Cards        | 12px         | `rounded-xl`  |
| Chat bubbles | 16px         | `rounded-2xl` |
| Inputs       | 8px          | `rounded-lg`  |
| Badges       | 6px          | `rounded-md`  |
| Tables       | 12px (outer) | `rounded-xl`  |

---

## Components

### Buttons

| Variant | Classes                                                                       |
| ------- | ----------------------------------------------------------------------------- |
| Primary | `bg-primary text-white rounded-lg px-4 py-2 font-medium hover:bg-[#3651d4]`   |
| Ghost   | `bg-transparent text-secondary rounded-lg px-4 py-2 hover:bg-base-200`        |
| Danger  | `bg-transparent text-error border border-error/30 rounded-lg hover:bg-red-50` |
| Icon    | Ghost style, 32x32, centered icon                                             |

- One primary button per visual group.
- Loading: replace label with spinner, maintain width.
- Disabled: `opacity-50 cursor-not-allowed`.

### Cards

- Surface: `bg-white border border-base-300 rounded-xl p-6`
- Danger: `bg-white border border-error/20 rounded-xl p-6`
- No shadows by default. Cards separated by `space-y-6`.

### Tables

- Container: `rounded-xl border border-base-300 overflow-hidden`
- Header: `bg-base-200 text-xs uppercase tracking-wider text-secondary font-medium`
- Rows: `border-b border-base-300` with `hover:bg-base-200/50`
- No zebra striping. Hover highlight instead.
- Right-align numerical columns. Use `tabular-nums`.

### Badges

- Credit: `bg-green-50 text-green-700 rounded-md px-2 py-0.5 text-xs font-medium`
- Debit: `bg-red-50 text-red-700`
- Info: `bg-blue-50 text-blue-700`
- Soft backgrounds only. Never filled/saturated.

### Form Controls

- Input: `border border-base-300 rounded-lg px-3 py-2 text-sm bg-white`
- Focus: `ring-2 ring-primary/20 border-primary`
- Labels above inputs: `text-xs uppercase tracking-wider text-secondary mb-1`
- Small variants (`-sm`) for filters and inline editing.

### Chat Bubbles

- User: `bg-primary text-white rounded-2xl rounded-br-md px-4 py-3 max-w-[75%] ml-auto`
- Assistant: `bg-base-200 text-base-content rounded-2xl rounded-bl-md px-4 py-3 max-w-[75%]`
- Header label: `text-xs text-muted mb-1` ("You" / "Ledger AI")
- Markdown prose inside bubbles inherits bubble text color.
- Streaming indicator: pulsing dots (`loading-dots`), not a solid rectangle.

### Empty States

- Centered vertically in container.
- Icon: 48px, `text-muted` (zinc-400).
- Heading: 14px `font-medium text-secondary`.
- CTA button below when actionable (e.g., "Upload a statement").
- No paragraph walls. One line of guidance max.

### Alerts

- Error: `bg-red-50 border border-red-200 text-red-700 rounded-lg p-4`
- Info: `bg-blue-50 border border-blue-200 text-blue-700 rounded-lg p-4`
- Success: `bg-green-50 border border-green-200 text-green-700 rounded-lg p-4`
- Include dismiss button (ghost, right-aligned) for transient alerts.

---

## Motion

### Principles

- Motion is functional, not decorative.
- Default duration: `200ms`. Easing: `ease-out`.
- Only animate properties that change: `opacity`, `background-color`, `transform`, `border-color`.

### Patterns

| Interaction     | Animation                                        |
| --------------- | ------------------------------------------------ |
| Button hover    | `transition-colors duration-200`                 |
| Card hover      | `transition-shadow duration-200`                 |
| Page enter      | Fade in, 150ms (via Angular animations)          |
| Chat message    | Slide up + fade in, 200ms                        |
| Sidebar item    | `transition-colors duration-150`                 |
| Delete icon     | `opacity-0 group-hover:opacity-100 duration-200` |
| Loading spinner | Continuous rotation (built-in)                   |
| Streaming dots  | Pulsing opacity loop, 1.4s cycle                 |

### What NOT to animate

- Layout shifts (width, height, position changes)
- Color changes on text (only on backgrounds)
- Anything on scroll (no parallax, no scroll-triggered reveals)

---

## Responsive

### Breakpoints

| Name | Width  | Key changes                         |
| ---- | ------ | ----------------------------------- |
| Base | 0      | Single column, stacked layouts      |
| `sm` | 640px  | Filter grid expands, padding grows  |
| `md` | 768px  | Chat sidebar visible, 2-col layouts |
| `lg` | 1024px | Full content widths                 |

### Mobile Rules

- Touch targets: minimum 44px height.
- Chat sidebar: hidden below `md`, replaced with hamburger/drawer.
- Filter card: collapsible on mobile, expanded by default on desktop.
- Tables: horizontal scroll with `overflow-x-auto`.
- Page padding: `p-4` on mobile, `p-8` on desktop.

---

## Iconography

- Style: Outlined, 1.5px stroke, rounded caps.
- Source: Heroicons (outline set) — already used in codebase.
- Sizes: 16px (inline/buttons), 20px (navigation), 24px (empty states), 48px (hero empty states).
- Color: inherits `currentColor`. Never use colored icons except for status.

---

## Patterns

### Destructive Actions

Always require confirmation for irreversible operations:

1. First click: show intent ("Delete" / "Purge All Data").
2. Second click: confirm with changed label ("Confirm Delete").
3. Optionally auto-dismiss confirmation after 5s.

### Loading States

| Context        | Pattern                                        |
| -------------- | ---------------------------------------------- |
| Page load      | Centered spinner, `loading-md`                 |
| Inline action  | Replace button label with `loading-spinner-sm` |
| Chat streaming | Pulsing dots in assistant bubble               |
| Table load     | Skeleton rows (3 rows, pulsing)                |

### Number Formatting

- Amounts: `Intl.NumberFormat` with locale matching selected currency.
- Indian Rupee (`INR`): `en-IN` locale for lakh/crore grouping.
- All others: `en-US` locale for standard thousand grouping.
- Always show 2 decimal places for currency amounts.
- Prefix with `+` (credit) or `-` (debit).

---

## File Structure

```
frontend/src/
  styles.css            Global theme + DaisyUI config
  index.html            Font loading
  app/
    shared/
      components/       Reusable UI (dropzone, future: modal, toast)
      pipes/            Transform pipes (markdown)
    features/
      upload/           Upload page
      transactions/     Transactions page
      chat/             Chat page
      settings/         Settings page
    core/
      services/         API, chat, settings, transactions
```

Component styles are co-located (inline `styles` array). Global overrides go in `styles.css`.
