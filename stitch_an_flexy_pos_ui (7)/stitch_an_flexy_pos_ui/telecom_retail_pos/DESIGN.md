---
name: Telecom Retail POS
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3e4947'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6e7977'
  outline-variant: '#bdc9c6'
  surface-tint: '#006a63'
  primary: '#005c55'
  on-primary: '#ffffff'
  primary-container: '#0f766e'
  on-primary-container: '#a3faef'
  inverse-primary: '#80d5cb'
  secondary: '#006398'
  on-secondary: '#ffffff'
  secondary-container: '#5bb8fe'
  on-secondary-container: '#00476e'
  tertiary: '#a6002f'
  on-tertiary: '#ffffff'
  tertiary-container: '#d2093f'
  on-tertiary-container: '#ffe4e4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9cf2e8'
  primary-fixed-dim: '#80d5cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#00504a'
  secondary-fixed: '#cce5ff'
  secondary-fixed-dim: '#93ccff'
  on-secondary-fixed: '#001d31'
  on-secondary-fixed-variant: '#004b73'
  tertiary-fixed: '#ffdada'
  tertiary-fixed-dim: '#ffb3b6'
  on-tertiary-fixed: '#40000c'
  on-tertiary-fixed-variant: '#920028'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Cairo
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg:
    fontFamily: Cairo
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Cairo
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Cairo
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Tajawal
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Tajawal
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Tajawal
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  currency-display:
    fontFamily: JetBrains Mono
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.75rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system serves high-velocity telecommunications kiosks and multi-service retail shops across Algeria handling mobile recharge ("Flexy"), bill payment, SIM activations, and digital vouchers. The aesthetic merges contemporary enterprise SaaS discipline with ultra-functional point-of-sale utility, prioritizing zero-latency perception, rapid optical scanning, and physical keyboard ergonomics.

Visual hierarchy balances bidirectional localization: primary contextual text operates in Right-to-Left (RTL) Arabic, while telecommunication numbers, currency values (DZD), USSD codes, and serials remain strictly in Left-to-Right (LTR) Western Arabic numerals (0-9). The visual style uses structured, high-density panels, crisp separation borders, and immediate status illumination to eliminate operator transaction errors during peak rush hours.

## Colors

The palette delivers strict semantic clarity and immediate operator recognition:

- **Primary (`#0F766E`)**: Deep teal anchor, indicating active workflows, primary confirmation triggers, and system navigation.
- **Operator Semantic Accents**:
  - **Mobilis / Success (`#16A34A`)**: Used for successful recharge executions, positive account balances, and Mobilis-specific operations.
  - **Djezzy (`#EA580C` / `#D97706`)**: High-visibility warm amber/orange used for Djezzy network routing, pending transactions, and operator warnings.
  - **Ooredoo / Danger (`#DC2626` / `#E11D48`)**: Deep crimson used for Ooredoo operations, debt warnings, insufficient SIM balance alerts, and critical reversals.
- **Neutrals & Surfaces**:
  - Base canvas: `#F5F6F7`
  - High-density card/panel surface: `#FFFFFF`
  - Structural separators and data cell borders: `#E2E8F0`
  - Primary text and readout contrast: `#111827`
  - Muted secondary text and metadata: `#64748B`

Ensure that operator tags never conflict with semantic alert banners by pairing operator colors with explicit branded carrier iconography or textual badges.

## Typography

Typography handles a dual-script operational environment. Headings and primary navigation rely on **Cairo** for structural balance and geometric legibility in Arabic. Body content, descriptions, and customer receipts use **Tajawal**, maintaining open counters and clean rendering at compact text sizes.

All numerical values, transaction amounts, Algerian Dinar figures (DZD / د.ج), MSISDN phone numbers (`05xx`, `06xx`, `07xx`), and shortcut cues strictly employ **JetBrains Mono** set to `direction: ltr; unicode-bidi: isolate;`. This prevents reversing of phone sequences and guarantees tabular alignment across high-density transactional ledgers.

## Layout & Spacing

The layout is built for high information density on desktop screens (1080p and 720p POS touch/counter monitors):

- **Workspace Division**: A fixed, 3-pane split-screen architecture:
  - **Left Rail (RTL end / LTR physical left)**: 340px persistent ledger summarizing the current session, cash drawer balance, active terminal status, and pending queue.
  - **Center Canvas**: Fluid flex grid housing the active transaction pad, quick-amount dials, and phone validation field.
  - **Right Panel (RTL start / LTR physical right)**: 320px quick-select carrier tiles, USSD shortcut panel, and daily reconciliation feed.
- **Rhythm**: Spacing follows a compact 4px base module (`space-xs` = 4px, `space-sm` = 8px, `space-md` = 12px, `space-lg` = 16px). Margins do not exceed 16px to prevent wasted display real estate.
- **Keyboard Targets**: Data grid rows use a rigid height of 36px to 40px, enabling operators to browse dozens of transactions without vertical scrolling.

## Elevation & Depth

This system avoids heavy diffusion shadows to maintain fast rendering on low-spec counter hardware and to eliminate screen glare under retail lighting:

- **Flat Tonal Layering**: Depth is achieved through surface distinction (`#F5F6F7` canvas vs. `#FFFFFF` modules) framed by 1px solid structural outlines (`#E2E8F0`).
- **Focus Elevation**: Active input zones and running calculations invoke an acute, tinted focus ring (`0 0 0 2px #0F766E` with a 10% alpha ring) rather than soft blur.
- **Floating Modals & Overlays**: Modals (e.g., SIM registration confirmation, end-of-day Z-report) utilize a strict functional drop: `0px 4px 12px rgba(17, 24, 39, 0.08)`, overlaid on a `#0F172A` scrim with 40% opacity.

## Shapes

Containers, interactive buttons, inputs, and operator selection tiles use standardized 8px border radii (`0.5rem`). This provides modern softness without compromising dense grid alignments. Micro-elements such as keyboard shortcut pills and inline carrier tags scale to 6px (`rounded-sm`), while modal windows use 10px to preserve visual continuity.

## Components

### Numeric Input & Phone Fields
- **MSISDN Field**: Auto-detects operator based on the first two digits (`05` = Ooredoo, `06` = Mobilis, `07` = Djezzy) and updates the container's contextual accent border immediately. Font must be monospace, sized at `20px`, aligned strictly LTR with high contrast.
- **Currency Quick-Add Buttons**: Preset buttons (e.g., `100`, `500`, `1000`, `2000` DZD) styled with `#F1F5F9` backgrounds and `#0F766E` border highlights on hover/press.

### Buttons & Shortcuts
- **Primary Confirm**: Deep teal background (`#0F766E`), white text, accompanied by an explicit LTR shortcut tag (e.g., `[Enter]` or `[F12]`) positioned at the trailing end.
- **Keyboard Shortcut Badges**: Enclosed inside `#F1F5F9` inline capsules with a 1px border (`#CBD5E1`), rendered in monospace font, displaying keys such as `F1`–`F9`, `Esc`, `Space`.

### Operator Badge States
- High-contrast, filled status badges indicate carrier networks:
  - **Mobilis**: Emerald green tint (`#DCFCE7` background, `#15803D` text).
  - **Djezzy**: Warm amber-orange tint (`#FFEDD5` background, `#C2410C` text).
  - **Ooredoo**: Vivid crimson tint (`#FEE2E2` background, `#B91C1C` text).

### Data Grid / Ledger
- Compact data tables featuring zebra-striping with alternate row color `#FAFAFA`. 
- Status icons (Check, Clock, X) must include dual text cues for color-blind accessibility. 
- Negative balances and debt lines ("Crédit Client") display in high-contrast red (`#DC2626`) prefixed with minus signs in monospace.