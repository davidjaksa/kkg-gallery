---
name: Heritage Gallery System
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
  on-surface-variant: '#57423d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#8b716c'
  outline-variant: '#dfc0ba'
  surface-tint: '#a73925'
  primary: '#932c19'
  on-primary: '#ffffff'
  primary-container: '#b4432e'
  on-primary-container: '#ffe2dd'
  inverse-primary: '#ffb4a5'
  secondary: '#54606a'
  on-secondary: '#ffffff'
  secondary-container: '#d7e4f0'
  on-secondary-container: '#5a6670'
  tertiary: '#51504d'
  on-tertiary: '#ffffff'
  tertiary-container: '#696865'
  on-tertiary-container: '#ebe8e4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad3'
  primary-fixed-dim: '#ffb4a5'
  on-primary-fixed: '#3f0400'
  on-primary-fixed-variant: '#862210'
  secondary-fixed: '#d7e4f0'
  secondary-fixed-dim: '#bbc8d3'
  on-secondary-fixed: '#111d25'
  on-secondary-fixed-variant: '#3c4851'
  tertiary-fixed: '#e5e2de'
  tertiary-fixed-dim: '#c8c6c2'
  on-tertiary-fixed: '#1c1c19'
  on-tertiary-fixed-variant: '#474744'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Work Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Work Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Work Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Libre Franklin
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Libre Franklin
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Work Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  baseline: 4px
  gutter-gallery: 24px
  margin-page: 40px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  grid-cols-desktop: '12'
  grid-cols-tablet: '8'
  grid-cols-mobile: '4'
---

## Brand & Style

This design system is built for institutional longevity, modernizing the visual legacy of a historic educational establishment. It balances the "brick-and-mortar" reliability of physical architecture with a clean, digital-first interface. The personality is **Academic, Structured, and Timeless**.

The style follows a **Modern Corporate** approach with a **Tactile** twist. It utilizes wide gutters, clear information hierarchies, and subtle architectural textures (like the brick motif) used as atmospheric backdrops rather than primary UI surfaces. The goal is to evoke a sense of prestigious history while providing the high-performance utility required for an administrative dashboard and high-density photo gallery.

**Design Principles:**
- **Institutional Weight:** Use deep reds and structured grays to signify authority.
- **Academic Clarity:** High-contrast typography and generous white space ensure readability for all age groups.
- **Digital Heritage:** Transform physical elements (brick, stamps, seals) into subtle digital patterns and iconography.

## Colors

The palette is derived from the historic red brick of the school's facade and the professional "HIVATALOS" (Official) signaling.

- **Primary (Heritage Red):** `#B4432E` — Used for calls to action, active navigation states, and the "Official" tag. This is a modernization of the brick red seen in the reference.
- **Secondary (Slate Gray):** `#333F48` — Used for primary text, sidebars, and administrative headers to provide a grounded, serious tone.
- **Tertiary (Warm Paper):** `#F4F1ED` — A warm neutral used for page backgrounds and card surfaces, preventing the sterile feel of pure white.
- **Status Colors:** Use standard semantic greens and ambers, but desaturate them slightly to fit the academic aesthetic.

## Typography

The typography system pairs the professional, versatile **Work Sans** for headlines with the highly legible **Libre Franklin** for body content. 

To emphasize the administrative and technical nature of the gallery's backend, **JetBrains Mono** is used for labels, metadata (like photo EXIF data), and system tags. This monospaced touch adds a "catalog" feel to the digital archives. 

Headlines should utilize the Secondary (Slate Gray) color to maintain a weighted, institutional presence.

## Layout & Spacing

This design system uses a **Fluid Grid** model with strict vertical rhythm based on a 4px baseline.

- **Gallery Grids:** Albums are displayed in a 12-column responsive grid. On desktop, cards span 3 or 4 columns depending on density needs. On mobile, they transition to a single-column stack.
- **Admin Dashboard:** Features a fixed 280px left-hand sidebar in Slate Gray, with a fluid content area for management tools.
- **Safe Areas:** A 40px outer margin on desktop ensures the content feels "framed," mimicking the structured layout of the reference site.

## Elevation & Depth

To modernize the design, we replace heavy drop shadows with **Tonal Layers** and **Low-Contrast Outlines**.

- **Surface Levels:** The primary background is Tertiary (Warm Paper). Content cards sit on a pure white surface with a subtle 1px border (`#E2E8F0`).
- **Interaction Depth:** When hovering over gallery albums, the card should lift using a soft, tinted shadow (Primary color at 5% opacity, 12px blur).
- **Header:** The brick background from the reference is reimagined as a subtle, high-quality watermark or a desaturated background image in the hero section, overlayed with a Slate Gray tint to ensure navigation legibility.

## Shapes

We use a **Soft (1)** shape language to maintain a professional and traditional feel. Sharp corners feel too aggressive, while fully rounded corners feel too consumer-oriented.

- **Standard Elements:** 4px radius for buttons, input fields, and tags.
- **Album Cards:** 8px radius (`rounded-lg`) to provide a containerized, modern feel for photography.
- **Official Tags:** The "HIVATALOS" tag retains a rectangular, authoritative shape with a minimal 2px radius.

## Components

### Album Cards
Cards should feature a 16:9 aspect ratio image header. The footer area uses the Warm Paper color and contains the album title in Work Sans and the photo count in JetBrains Mono.

### Official Tags (Status Labels)
A hallmark of this system. High-contrast blocks using Heritage Red background and white uppercase text. No icons; the typography itself denotes the "Official" status.

### Navigation
Modernize the reference's top bar by using a clean horizontal list with 32px spacing. Use a 2px bottom border in Heritage Red for the active state to reflect the "Hírek" underline in the original image.

### Admin Dashboard Components
- **Data Tables:** High-density rows with alternating Warm Paper and White backgrounds.
- **Action Buttons:** Primary actions in Heritage Red; secondary actions in Slate Gray ghost buttons.
- **Upload Zone:** A dashed-border drop zone using the Slate Gray at 20% opacity, utilizing the monospaced label font for instructions.

### Gallery View
A masonry or justified grid layout. Hovering over a photo should reveal a Slate Gray overlay (80% opacity) with white metadata text.