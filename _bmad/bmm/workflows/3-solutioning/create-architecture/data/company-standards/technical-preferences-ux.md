# Technical Preferences - UX Configuration

## Project Setup Configuration
Based on Frontend Development Standards and Clean Architecture Implementation

### Technology Stack
- **Framework**: Vite 7+ with TanStack Router
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS + Shadcn/ui + Radix UI
- **State Management**: Zustand + TanStack Query
- **Testing**: Vitest + React Testing Library
- **Architecture**: Clean Architecture with DDD patterns
- **Loading States**: React Loading Skeleton (for placeholders/preloading)

### Resources
Project assets are centralized in the [resources/](../../../resources/) directory at the root level:

```
resources/
├── fonts/          # Inter font family files
└── images/         # Brand assets, logos, and graphics
```

**Usage**:
- Reference fonts from `@/resources/fonts/`
- Reference images from `@/resources/images/`
- Logo assets available in `resources/images/logos/`

---


## Design System Foundation

### Color Palette

#### Primary Colors (Brand)
```css
:root {
  /* Primary Color: #0e79fd (PrimaryCustom - Siesa UI Kit) */
  --color-primary-50: #f7fcff;
  --color-primary-100: #dbeefe;
  --color-primary-200: #bfe2fe;
  --color-primary-300: #93d1fd;
  --color-primary-400: #60b6fa;
  --color-primary-500: #3c9bf6;
  --color-primary-600: #0e79fd; /* Main Primary Color */
  --color-primary-700: #0f6ae3;
  --color-primary-800: #1355b7;
  --color-primary-900: #154990;
  --color-primary-950: #112d57;
}
```

#### Secondary Colors (Brand)
```css
:root {
  /* Secondary Color: #000000 (Black) - Brand Secondary, NOT for grays/backgrounds */
  --color-secondary-50: #f6f6f6;
  --color-secondary-100: #e7e7e7;
  --color-secondary-200: #d1d1d1;
  --color-secondary-300: #b0b0b0;
  --color-secondary-400: #888888;
  --color-secondary-500: #6d6d6d;
  --color-secondary-600: #5d5d5d;
  --color-secondary-700: #4f4f4f;
  --color-secondary-800: #454545;
  --color-secondary-900: #3d3d3d;
  --color-secondary-950: #000000; /* Main Secondary Color */
}
```

#### Tertiary Colors (Brand)
```css
:root {
  /* Tertiary Color: #154ca9 (TertiaryCustom - Siesa UI Kit) */
  --color-tertiary-50: #eef8ff;
  --color-tertiary-100: #d9efff;
  --color-tertiary-200: #bce4ff;
  --color-tertiary-300: #8ed4ff;
  --color-tertiary-400: #58bbff;
  --color-tertiary-500: #329cff;
  --color-tertiary-600: #1b7df5;
  --color-tertiary-700: #1465e1;
  --color-tertiary-800: #154ca9; /* Main Tertiary Color */
  --color-tertiary-900: #19478f;
  --color-tertiary-950: #051938;
}
```

#### Semantic Colors & Usage Guidelines
```css
:root {
  /* Use Tailwind default semantic colors */
  /* Success: theme('colors.green.500') | Warning: theme('colors.amber.500') */
  /* Error: theme('colors.red.500') | Info: theme('colors.cyan.500') */
  /* Neutrals: theme('colors.slate.*') - NOT secondary brand colors */
}
```

```yaml
color_rules:
  tailwind_first: "Use theme() for system colors"
  brand_only: "Hex codes for brand colors (#0e79fd, #154ca9, #000000)"
  css: "theme() in custom properties"
  classes: "Direct utility classes (bg-slate-200)"
```

#### Background & Surface Colors
```css
:root {
  /* Light Theme - Using Tailwind variables */
  --color-background: theme('colors.white');                    /* white */
  --color-surface: theme('colors.slate.50');                    /* slate-50 */
  --color-surface-secondary: theme('colors.slate.100');         /* slate-100 */
  --color-border: theme('colors.slate.200');                    /* slate-200 */
  --color-border-secondary: theme('colors.slate.300');          /* slate-300 */
  
  /* Dark Theme Support - Using Tailwind variables */
  --color-background-dark: theme('colors.slate.950');           /* slate-950 */
  --color-surface-dark: theme('colors.slate.900');              /* slate-900 */
  --color-surface-secondary-dark: theme('colors.slate.800');    /* slate-800 */
  --color-border-dark: theme('colors.slate.700');               /* slate-700 */
  --color-border-secondary-dark: theme('colors.slate.600');     /* slate-600 */
  
  /* Note: Secondary brand color (#000000) is for brand elements, not backgrounds */
}
```

### Dark Mode Implementation

#### Configuration
```yaml
dark_mode:
  method: "class"                    # Tailwind class-based
  selector: "html"                   # Root element
  framework: "next-themes"           # SSR-safe theme switching
  default: "system"                  # Follow system preference
```

#### Brand Colors Dark Mode Adaptation
```css
.dark {
  /* Primary - Enhanced contrast for dark backgrounds */
  --color-primary-400: #60b6fa;
  --color-primary-500: #3c9bf6;
  --color-primary-600: #0e79fd;
  
  /* Secondary alternatives for dark mode visibility */
  --color-secondary-alt-50: theme('colors.slate.50');
  --color-secondary-alt-100: theme('colors.slate.200');
  --color-secondary-alt-200: theme('colors.slate.300');
  
  /* Tertiary - Optimized for dark mode */
  --color-tertiary-400: #58bbff;
  --color-tertiary-500: #329cff;
  --color-tertiary-600: #1b7df5;
}
```

#### Tailwind Classes for Dark Mode
```yaml
text_colors:
  primary: "text-zinc-900 dark:text-zinc-50"
  secondary: "text-gray-700 dark:text-gray-300"
  muted: "text-gray-500 dark:text-gray-400"
  disabled: "text-gray-400 dark:text-gray-600"
  
brand_colors:
  primary: "text-primary-600 dark:text-primary-400"
  secondary: "text-secondary-950 dark:text-slate-50"
  tertiary: "text-tertiary-800 dark:text-tertiary-400"

surfaces:
  page: "bg-white dark:bg-slate-950"
  card: "bg-slate-50 dark:bg-slate-900"
  elevated: "bg-white dark:bg-slate-800"
  input: "bg-white dark:bg-slate-900"
  
borders:
  subtle: "border-slate-200 dark:border-slate-700"
  prominent: "border-slate-300 dark:border-slate-600"
  tertiary: "border-zinc-400 dark:border-zinc-400"
  focus: "ring-primary-600 dark:ring-primary-400"

buttons:
  primary: "bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-500"
  secondary: "bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
  ghost: "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"

navigation:
  navbar: "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-700"
  sidebar: "bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700"
  active: "bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-950 dark:text-primary-300 dark:border-primary-800"

feedback:
  success: "bg-green-50 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
  warning: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
  error: "bg-red-50 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800"
```

#### Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f7fcff',
          100: '#dbeefe',
          200: '#bfe2fe',
          300: '#93d1fd',
          400: '#60b6fa',
          500: '#3c9bf6',
          600: '#0e79fd',  // Main brand color
          700: '#0f6ae3',
          800: '#1355b7',
          900: '#154990',
          950: '#112d57',
        },
        secondary: {
          // Custom neutral scale for brand secondary
          50: '#f6f6f6',
          100: '#e7e7e7',
          200: '#d1d1d1',
          300: '#b0b0b0',
          400: '#888888',
          500: '#6d6d6d',
          600: '#5d5d5d',
          700: '#4f4f4f',
          800: '#454545',
          900: '#3d3d3d',
          950: '#000000',  // Main secondary color
        },
        tertiary: {
          // TertiaryCustom scale from Siesa UI Kit
          50: '#eef8ff',
          100: '#d9efff',
          200: '#bce4ff',
          300: '#8ed4ff',
          400: '#58bbff',
          500: '#329cff',
          600: '#1b7df5',
          700: '#1465e1',
          800: '#154ca9',  // Main tertiary color (custom)
          900: '#19478f',
          950: '#051938',
        }
      }
    }
  }
}
```

### Typography System

#### Font Configuration
```css
:root {
  /* Siesa Brand Fonts - 3 weights available */
  --font-primary: 'Inter_18pt-Regular', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-light: 'Inter_18pt-Light', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-bold: 'Inter_18pt-Bold', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  
  /* Tailwind font weight mapping */
  --font-weight-light: 300;    /* Inter_18pt-Light */
  --font-weight-normal: 400;   /* Inter_18pt-Regular */
  --font-weight-medium: 400;   /* Inter_18pt-Regular */
  --font-weight-semibold: 700; /* Inter_18pt-Bold */
  --font-weight-bold: 700;     /* Inter_18pt-Bold */
  --font-weight-extrabold: 700; /* Inter_18pt-Bold */
  --font-weight-black: 700;    /* Inter_18pt-Bold */
}
```

#### Typography Scale
```yaml
typography:
  headings:
    h1: "text-4xl font-bold leading-tight tracking-tight"
    h2: "text-3xl font-bold leading-tight tracking-tight"
    h3: "text-2xl font-semibold leading-snug tracking-tight"
    h4: "text-xl font-semibold leading-snug"
    h5: "text-lg font-medium leading-normal"
    h6: "text-base font-medium leading-normal"

  body:
    paragraph: "text-base font-normal leading-relaxed"
    large: "text-lg font-normal leading-relaxed"
    small: "text-sm font-normal leading-normal"
    caption: "text-xs font-light leading-normal"

  interactive:
    label: "text-sm font-medium leading-normal"
    button_primary: "text-base font-semibold leading-none"
    button_secondary: "text-sm font-medium leading-none"
    link: "text-base font-normal leading-normal"
    link_emphasis: "text-base font-semibold leading-normal"

  utility:
    code: "text-sm font-normal leading-normal font-mono"
    badge: "text-xs font-semibold leading-none"
    tooltip: "text-sm font-normal leading-snug"
```

### Assets & Systems Configuration

#### Logo Assets
```yaml
logos:
  paths:
    assets: "assets/images/logos/"
    public: "/images/logos/"
  
  variants:
    full_blue: "Siesa_Logosimbolo_Azul.svg"
    full_white: "Siesa_Logosimbolo_Blanco.svg"
    symbol_blue: "Siesa_Simbolo_Azul.svg"
    symbol_white: "Siesa_Simbolo_Blanco.svg"
  
  usage:
    header: "symbol_blue"
    footer: "full_blue"
    dark_theme: "full_white"
    favicon: "symbol_blue"
  
  specs:
    min_size_full: "120px"
    min_size_symbol: "24px"
    format: "SVG"
```

#### Icons
```yaml
icons:
  primary: "Heroicons"
  secondary: "Font Awesome 6.5+"
  
  sizes:
    small: "w-4 h-4"
    default: "w-5 h-5"
    medium: "w-6 h-6"
    large: "w-8 h-8"
    
  colors:
    inherit: "text-current"
    primary: "text-primary-600"
    secondary: "text-secondary-600"
    neutral: "text-gray-500"
```

#### Loading States
```yaml
skeleton:
  library: "react-loading-skeleton ^3.4.0"
  theming:
    light: "base: theme('colors.slate.200'), highlight: theme('colors.slate.100')"
    dark: "base: theme('colors.slate.700'), highlight: theme('colors.slate.600')"
    radius: "rounded-md"
    duration: "1.5s"
```

---

## Standards & Guidelines

### Accessibility
```yaml
accessibility:
  color_contrast: "4.5:1 minimum (WCAG 2.1 AA)"
  large_text_contrast: "3.1:1 minimum"
  focus_indicators: "2px solid var(--color-primary-600)"
  touch_targets: "44px minimum"
  font_size_minimum: "16px"
  line_length_maximum: "75ch"
  
requirements:
  landmarks: true
  headings: true
  labels: true
  alt_text: true
  skip_links: true
```

### Performance Targets
```yaml
bundle_limits:
  initial: "< 500KB gzipped"
  routes: "< 200KB gzipped"
  components: "< 100KB gzipped"

metrics:
  fcp: "< 1.5s"
  lcp: "< 2.5s"
  cls: "< 0.1"
  tti: "< 3s"
```

### Architecture
```yaml
components:
  base: "Shadcn/ui from MCP registry"
  composite: "Feature-specific compositions"
  layout: "Page and section layouts"
  utility: "Helpers and wrappers"

state_management:
  global: "Authentication, theme, app settings"
  feature: "Domain-specific data and UI state"
  local: "Component-specific temporary state"
  server: "API data with caching"

naming:
  components: "PascalCase"
  files: "kebab-case"
  directories: "kebab-case"
  assets: "kebab-case"
```

---

## This configuration serves as the foundation for all UX decisions and component implementation.