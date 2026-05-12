---
type: base-ux-design-specification.md
status: base
note: >
  This document was automatically generated during siesa-agents installation.
  It represents the Siesa corporate base UX/UI specification applicable to all frontend projects.
  It can be extended with the /create-ux-design workflow for project-specific decisions.
---

# UX/UI Specification Document — Siesa Corporate Base

_This document establishes the mandatory UX/UI decisions for all Siesa frontend projects. It serves as the source of truth for consistent, accessible, and brand-aligned user interfaces._

---

## 1. Design System Foundation

### 1.1 Color Palette

#### Brand Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary-600` | `#0e79fd` | Main brand color — CTAs, links, focus |
| `--color-secondary-950` | `#000000` | Brand secondary — NOT for backgrounds or grays |
| `--color-tertiary-800` | `#154ca9` | Brand tertiary — Secondary actions, accents |

#### Full Primary Scale

```css
:root {
  --color-primary-50:  #f7fcff;
  --color-primary-100: #dbeefe;
  --color-primary-200: #bfe2fe;
  --color-primary-300: #93d1fd;
  --color-primary-400: #60b6fa;
  --color-primary-500: #3c9bf6;
  --color-primary-600: #0e79fd; /* Main Primary */
  --color-primary-700: #0f6ae3;
  --color-primary-800: #1355b7;
  --color-primary-900: #154990;
  --color-primary-950: #112d57;
}
```

#### Full Secondary Scale (Brand, NOT Neutrals)

```css
:root {
  --color-secondary-50:  #f6f6f6;
  --color-secondary-100: #e7e7e7;
  --color-secondary-200: #d1d1d1;
  --color-secondary-300: #b0b0b0;
  --color-secondary-400: #888888;
  --color-secondary-500: #6d6d6d;
  --color-secondary-600: #5d5d5d;
  --color-secondary-700: #4f4f4f;
  --color-secondary-800: #454545;
  --color-secondary-900: #3d3d3d;
  --color-secondary-950: #000000; /* Main Secondary */
}
```

#### Full Tertiary Scale

```css
:root {
  --color-tertiary-50:  #eef8ff;
  --color-tertiary-100: #d9efff;
  --color-tertiary-200: #bce4ff;
  --color-tertiary-300: #8ed4ff;
  --color-tertiary-400: #58bbff;
  --color-tertiary-500: #329cff;
  --color-tertiary-600: #1b7df5;
  --color-tertiary-700: #1465e1;
  --color-tertiary-800: #154ca9; /* Main Tertiary */
  --color-tertiary-900: #19478f;
  --color-tertiary-950: #051938;
}
```

#### Semantic Colors

| Color | Tailwind | Usage |
|-------|----------|-------|
| Success | `green.500` | Confirmations, active states |
| Warning | `amber.500` | Alerts, cautions |
| Error | `red.500` | Errors, destructive actions |
| Info | `cyan.500` | Informational messages |
| Neutral | `slate.*` | Backgrounds, borders, text — NEVER use secondary brand for this |

#### Surfaces & Backgrounds

```css
:root {
  /* Light Theme */
  --color-background:           theme('colors.white');
  --color-surface:              theme('colors.slate.50');
  --color-surface-secondary:    theme('colors.slate.100');
  --color-border:               theme('colors.slate.200');
  --color-border-secondary:     theme('colors.slate.300');

  /* Dark Theme */
  --color-background-dark:      theme('colors.slate.950');
  --color-surface-dark:         theme('colors.slate.900');
  --color-surface-secondary-dark: theme('colors.slate.800');
  --color-border-dark:          theme('colors.slate.700');
  --color-border-secondary-dark: theme('colors.slate.600');
}
```

#### Tailwind Config Extension

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f7fcff', 100: '#dbeefe', 200: '#bfe2fe', 300: '#93d1fd',
          400: '#60b6fa', 500: '#3c9bf6', 600: '#0e79fd', 700: '#0f6ae3',
          800: '#1355b7', 900: '#154990', 950: '#112d57',
        },
        secondary: {
          50: '#f6f6f6', 100: '#e7e7e7', 200: '#d1d1d1', 300: '#b0b0b0',
          400: '#888888', 500: '#6d6d6d', 600: '#5d5d5d', 700: '#4f4f4f',
          800: '#454545', 900: '#3d3d3d', 950: '#000000',
        },
        tertiary: {
          50: '#eef8ff', 100: '#d9efff', 200: '#bce4ff', 300: '#8ed4ff',
          400: '#58bbff', 500: '#329cff', 600: '#1b7df5', 700: '#1465e1',
          800: '#154ca9', 900: '#19478f', 950: '#051938',
        },
      },
    },
  },
};
```

---

### 1.2 Typography

#### Font Family

```css
:root {
  --font-primary: 'Inter_18pt-Regular', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-light:   'Inter_18pt-Light',   -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-bold:    'Inter_18pt-Bold',    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono:    'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
}
```

**Font files (3 weights only):**

| Weight | File | CSS Variable |
|--------|------|--------------|
| Light (300) | `Inter_18pt-Light.ttf` | `--font-light` |
| Regular (400) | `Inter_18pt-Regular.ttf` | `--font-primary` |
| Bold (700) | `Inter_18pt-Bold.ttf` | `--font-bold` |

> **Rule:** There are only 3 physical font weights. All Tailwind weight values `medium`, `semibold`, `extrabold`, `black` resolve to the Bold file (700).

#### Typographic Scale

| Element | Tailwind Classes |
|---------|-----------------|
| H1 | `text-4xl font-bold leading-tight tracking-tight` |
| H2 | `text-3xl font-bold leading-tight tracking-tight` |
| H3 | `text-2xl font-semibold leading-snug tracking-tight` |
| H4 | `text-xl font-semibold leading-snug` |
| H5 | `text-lg font-medium leading-normal` |
| H6 | `text-base font-medium leading-normal` |
| Body | `text-base font-normal leading-relaxed` |
| Body Large | `text-lg font-normal leading-relaxed` |
| Body Small | `text-sm font-normal leading-normal` |
| Caption | `text-xs font-light leading-normal` |
| Label | `text-sm font-medium leading-normal` |
| Button Primary | `text-base font-semibold leading-none` |
| Button Secondary | `text-sm font-medium leading-none` |
| Link | `text-base font-normal leading-normal` |
| Code | `text-sm font-normal leading-normal font-mono` |
| Badge | `text-xs font-semibold leading-none` |
| Tooltip | `text-sm font-normal leading-snug` |

**Constraints:**
- Minimum font size: `16px` (browser default, never go below)
- Maximum line length: `75ch`
- One single `<h1>` per page, headings in descending order

---

### 1.3 Dark Mode

| Aspect | Value |
|--------|-------|
| Method | Tailwind `class` strategy |
| Selector | `html` element (root) |
| Framework | `next-themes` (SSR-safe) |
| Default | System preference (`system`) |

#### Standard Dark Mode Class Pairs

```yaml
text_colors:
  primary:   "text-zinc-900 dark:text-zinc-50"
  secondary: "text-gray-700 dark:text-gray-300"
  muted:     "text-gray-500 dark:text-gray-400"
  disabled:  "text-gray-400 dark:text-gray-600"

brand_colors:
  primary:   "text-primary-600 dark:text-primary-400"
  secondary: "text-secondary-950 dark:text-slate-50"
  tertiary:  "text-tertiary-800 dark:text-tertiary-400"

surfaces:
  page:     "bg-white dark:bg-slate-950"
  card:     "bg-slate-50 dark:bg-slate-900"
  elevated: "bg-white dark:bg-slate-800"
  input:    "bg-white dark:bg-slate-900"

borders:
  subtle:    "border-slate-200 dark:border-slate-700"
  prominent: "border-slate-300 dark:border-slate-600"
  tertiary:  "border-zinc-400 dark:border-zinc-400"
  focus:     "ring-primary-600 dark:ring-primary-400"

buttons:
  primary:   "bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-500"
  secondary: "bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
  ghost:     "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"

navigation:
  navbar:  "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-700"
  sidebar: "bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700"
  active:  "bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-950 dark:text-primary-300 dark:border-primary-800"

feedback:
  success: "bg-green-50 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
  warning: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
  error:   "bg-red-50 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800"
```

---

## 2. Component Library

### 2.1 Component Selection Priority

**MANDATORY ORDER — must be followed exactly:**

| Priority | Source | Action |
|----------|--------|--------|
| 1 | `siesa-ui-kit` (local) | Always check first — any type, any complexity |
| 2 | Component does not exist | Ask: [1] Use shadcn directly, [2] Create for siesa-ui-kit (requires MR) |
| 3 | shadcn/ui via MCP registry | Only if user explicitly chose option [1] |

> **Rule:** 90% fewer bugs using existing components vs manual creation. Never bypass this order.

### 2.2 MasterCrud — Orchestrator Component

`MasterCrud` is the highest-level component for master data management. **All master modules MUST use it.**

```tsx
import { MasterCrud } from '@/components/MasterCrud';
import type { MasterCrudField, CrudService } from '@/components/MasterCrud/MasterCrud.types';

<MasterCrud<Product>
  title="Catálogo de Productos"
  entityName="Producto"
  fields={productFields}
  service={productService}
/>
```

#### MasterCrud Props

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `title` | string | — | Module title (Spanish) |
| `entityName` | string | — | Entity name singular (Spanish) |
| `fields` | `MasterCrudField<T>[]` | — | Columns and form field config |
| `service` | `CrudService<T>` | — | Network operations contract |
| `idField` | `keyof T` | `'id'` | Unique identifier field |
| `pageSize` | number | `10` | Records per page |
| `navigationType` | `'modal' \| 'sidebar' \| 'page'` | — | Navigation type for form |
| `activeByCompany` | boolean | `false` | Enable multi-company selector |
| `companyRequired` | boolean | `false` | Hide "Global" option |
| `companies` | `MasterCrudCompany[]` | `[]` | Available companies |
| `showCreateButton` | boolean | `true` | Show/hide "Nuevo" button |
| `allowDelete` | boolean | `true` | Enable delete/deactivate |
| `formColumns` | `1 \| 2` | `2` | Form layout columns |
| `enableMultiSelect` | boolean | `false` | Enable row checkboxes |
| `showViewToggle` | boolean | `false` | Toggle between table and card view |
| `renderForm` | Function | — | Custom form body rendering |
| `actions` | `MasterCrudAction<T>[]` | `[]` | Extra actions per record |

#### Navigation Type Selection Guide

| Use Case | `navigationType` |
|----------|-----------------|
| Simple forms (≤ 8 fields) | `'modal'` |
| Medium forms (9–15 fields) | `'sidebar'` |
| Complex forms (16+ fields, tabs, sections) | `'page'` |

#### FieldType Reference

| Type | Visual Control | Use For |
|------|---------------|---------|
| `'text'` | Standard input | Names, codes, descriptions |
| `'number'` | Numeric input with controls | Quantities, rates, amounts |
| `'email'` | Email-validated input | Email addresses |
| `'date'` | Calendar picker (ISO format) | Dates |
| `'boolean'` | Toggle switch | Active/inactive flags |
| `'select'` | Dropdown (requires `options`) | Fixed lists |
| `'lookup'` | Async search (requires `lookupConfig`) | Master record selection |

> **Rule R-LF-001:** For master record selection, ALWAYS use `type: 'lookup'` with LookupField. Never use `type: 'select'` for data from the backend.

### 2.3 Form Standards

| Technology | Version | Purpose |
|-----------|---------|---------|
| React Hook Form | 7.x | Form state management |
| Zod | 3.x | Schema validation |

```typescript
// Standard form pattern
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  codigo: z.string().min(1, 'El código es requerido'),
});

const form = useForm({ resolver: zodResolver(schema) });
```

---

## 3. Icons & Assets

### 3.1 Icon Libraries

| Priority | Library | Version | Usage |
|----------|---------|---------|-------|
| Primary | Heroicons | Latest | Default for all UI icons |
| Secondary | Font Awesome | 6.5+ | When Heroicons lacks the icon |

#### Icon Sizes

| Name | Tailwind Classes | Use |
|------|-----------------|-----|
| Small | `w-4 h-4` | Inline text, badges |
| Default | `w-5 h-5` | Buttons, menu items |
| Medium | `w-6 h-6` | Section headers |
| Large | `w-8 h-8` | Feature illustrations |

#### Icon Colors

| Context | Class |
|---------|-------|
| Inherit from text | `text-current` |
| Primary brand | `text-primary-600` |
| Secondary brand | `text-secondary-600` |
| Neutral | `text-gray-500` |

### 3.2 Logo Assets

| Variant | File | Usage |
|---------|------|-------|
| Full (blue) | `Siesa_Logosimbolo_Azul.svg` | Default header, footer |
| Full (white) | `Siesa_Logosimbolo_Blanco.svg` | Dark theme header |
| Symbol (blue) | `Siesa_Simbolo_Azul.svg` | Favicon, collapsed sidebar |
| Symbol (white) | `Siesa_Simbolo_Blanco.svg` | Dark theme favicon |

**Asset locations:**
- Build-time: `assets/images/logos/`
- Runtime public: `/images/logos/`
- Min size (full logo): `120px`
- Min size (symbol): `24px`
- Format: SVG always

---

## 4. Layout & Navigation Patterns

### 4.1 App Shell Structure

```
┌──────────────────────────────────────────────────────┐
│  TopNav (bg-white / dark:bg-slate-900)               │
│  border-b border-slate-200 / dark:border-slate-700   │
├──────────────┬───────────────────────────────────────┤
│              │                                       │
│  Sidebar     │  Main Content                         │
│  (w-64)      │  (flex-1 overflow-auto p-6)           │
│              │                                       │
│  bg-slate-50 │  bg-white / dark:bg-slate-950         │
│  dark:       │                                       │
│  bg-slate-900│                                       │
│              │                                       │
└──────────────┴───────────────────────────────────────┘
```

```tsx
// Protected app layout — routes/_app.tsx
function AppLayout() {
  return (
    <div className="flex h-screen bg-white dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

### 4.2 Route Layout Conventions (TanStack Router)

| Prefix | Effect | Example |
|--------|--------|---------|
| `_` | Pathless layout (no URL segment) | `_app.tsx` → protected layout |
| `.` | Flat routing | `orders.$id.tsx` → `/orders/:id` |
| `-` | Ignored by router (colocated files) | `-components/` |
| `$` | Dynamic parameter | `$orderId.tsx` → `:orderId` |
| `__` | Root | `__root.tsx` only |

### 4.3 Page Structure

```tsx
// Standard page layout
<div className="space-y-6">
  {/* Page header */}
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {pageTitle}
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {pageDescription}
      </p>
    </div>
    <div className="flex gap-2">
      {/* Actions */}
    </div>
  </div>

  {/* Page content */}
  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
    {/* Content */}
  </div>
</div>
```

---

## 5. Interaction & Feedback Patterns

### 5.1 Loading States — Skeleton Screens

| Library | Version |
|---------|---------|
| `react-loading-skeleton` | `^3.4.0` |

```yaml
skeleton_config:
  light:
    base: "theme('colors.slate.200')"
    highlight: "theme('colors.slate.100')"
  dark:
    base: "theme('colors.slate.700')"
    highlight: "theme('colors.slate.600')"
  border_radius: "rounded-md"
  animation_duration: "1.5s"
```

**Rule:** Always use skeleton screens (not spinners) for content placeholders. Spinners are only acceptable for action confirmation (button submit states).

### 5.2 Toast Notifications

| Library | Placement | Stack |
|---------|-----------|-------|
| `sonner` | `bottom-right` | Max 3 visible |

```tsx
// Standard notification messages (Spanish required)
toast.success('Datos guardados correctamente');
toast.error('No se pudo completar la operación. Intenta de nuevo.');
toast.warning('Este cambio afectará registros relacionados.');
toast.info('El proceso puede tardar unos minutos.');
```

### 5.3 Error States

```tsx
// Inline field error
<p className="text-sm text-red-600 dark:text-red-400 mt-1">
  {error.message}
</p>

// Error boundary fallback
<div className="flex flex-col items-center justify-center p-8 text-center">
  <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
    Algo salió mal
  </h2>
  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
    Por favor, intenta recargar la página
  </p>
  <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
    Recargar
  </Button>
</div>
```

### 5.4 Empty States

```tsx
// Empty list state
<div className="flex flex-col items-center justify-center py-12 text-center">
  <IconComponent className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
  <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
    No hay {entityNamePlural} registrados
  </h3>
  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
    Comienza creando el primer registro.
  </p>
</div>
```

### 5.5 Confirmation Dialogs

- Use modal dialogs for destructive or irreversible actions
- Title must state the action explicitly: "¿Eliminar {entidad}?"
- Description must state the consequence: "Esta acción no se puede deshacer."
- Destructive button: `text-red-600` or `variant="destructive"`
- Cancel always on the left, confirm on the right

---

## 6. Accessibility Standards (WCAG 2.1 AA)

### 6.1 Color Contrast

| Context | Minimum Ratio |
|---------|--------------|
| Normal text (< 18px) | 4.5:1 |
| Large text (≥ 18px or bold ≥ 14px) | 3.1:1 |
| UI components, icons | 3:1 |

### 6.2 Focus Indicators

```css
/* Standard focus ring */
focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2
dark:focus-visible:ring-primary-400
```

**Rules:**
- Never use `outline: none` without a custom focus indicator
- Focus indicators must be visible in both light and dark modes
- Minimum focus ring width: `2px`

### 6.3 Touch & Interactive Targets

| Requirement | Value |
|-------------|-------|
| Minimum touch target | 44px × 44px |
| Minimum font size | 16px |
| Maximum line length | 75ch |

### 6.4 Semantic HTML

```tsx
// ✅ Correct — semantic HTML first
<nav aria-label="Navegación principal">
<main>
<article>
<section>
<aside>
<header>
<footer>

// ✅ Correct — ARIA only when necessary
<div role="tabpanel" aria-labelledby="tab-products" aria-expanded={isOpen}>

// ❌ Incorrect — redundant ARIA
<button role="button" aria-label="button">Guardar</button>
```

### 6.5 Accessibility Requirements Checklist

| Requirement | Standard |
|-------------|---------|
| Landmarks | `<nav>`, `<main>`, `<header>`, `<footer>` on every page |
| Heading hierarchy | Single `<h1>`, descending order, no skips |
| Form labels | `<label>` associated with every input via `htmlFor` |
| Alt text | All images with `alt` attribute (empty `alt=""` for decorative) |
| Skip links | "Saltar al contenido" link before main navigation |
| Keyboard nav | All interactions reachable and operable via keyboard |
| Screen reader | Test with VoiceOver / NVDA on critical flows |

---

## 7. Language Standards

### 7.1 Critical Rule — Spanish for All User-Visible Text

**All text visible to the end user MUST be in Spanish.**

| Content Type | Language |
|-------------|----------|
| UI labels, buttons, forms | ✅ Spanish |
| Error messages, toasts | ✅ Spanish |
| API response messages shown to user | ✅ Spanish |
| Validation feedback | ✅ Spanish |
| Code (variables, functions, classes) | ✅ English |
| Technical logs, comments, git commits | ✅ English |
| Developer documentation | ✅ English |

```tsx
// ✅ Correct
<Button>Guardar</Button>
toast.success('Datos guardados correctamente');

// ❌ Incorrect
<Button>Save</Button>
toast.error('Failed to save');
```

### 7.2 Standard Message Tokens

```typescript
// shared/constants/messages.ts
export const MESSAGES = {
  SUCCESS: {
    SAVED:   'Datos guardados correctamente',
    DELETED: 'Elemento eliminado correctamente',
    UPDATED: 'Información actualizada',
  },
  ERROR: {
    GENERIC:      'Ha ocurrido un error. Por favor, intenta de nuevo',
    NOT_FOUND:    'El recurso solicitado no fue encontrado',
    UNAUTHORIZED: 'No tienes permisos para realizar esta acción',
    VALIDATION:   'Por favor, verifica los datos ingresados',
    CONFLICT:     'No se puede completar la operación debido a un conflicto',
  },
  LOADING: {
    DEFAULT:    'Cargando...',
    SAVING:     'Guardando...',
    PROCESSING: 'Procesando...',
    DELETING:   'Eliminando...',
  },
  CONFIRM: {
    DELETE:  '¿Estás seguro de que deseas eliminar este registro?',
    UNSAVED: 'Tienes cambios sin guardar. ¿Deseas descartarlos?',
  },
} as const;
```

---

## 8. Performance Targets

### 8.1 Bundle Budgets

| Scope | Maximum |
|-------|---------|
| Initial bundle | < 500 KB gzipped |
| Per-route chunk | < 200 KB gzipped |
| Individual component | < 100 KB gzipped |

### 8.2 Core Web Vitals Targets

| Metric | Target |
|--------|--------|
| FCP (First Contentful Paint) | < 1.5s |
| LCP (Largest Contentful Paint) | < 2.5s |
| CLS (Cumulative Layout Shift) | < 0.1 |
| TTI (Time to Interactive) | < 3s |

### 8.3 Optimization Techniques

| Technique | Implementation |
|-----------|---------------|
| Code splitting | Automatic per route (TanStack Router) |
| Lazy loading | `React.lazy()` for non-critical components |
| Tree shaking | Specific imports; no barrel exports in `shared/` |
| Memoization | `React.memo` for expensive components, `useMemo`/`useCallback` |
| Virtual scrolling | For lists > 200 items |
| Image lazy loading | `loading="lazy"` on all non-critical images |

---

## 9. State Management Patterns

### 9.1 State Type Decision Matrix

| State Type | When to Use | Technology |
|-----------|-------------|------------|
| Server state | API data, paginated lists, caches | TanStack Query |
| Global client state | Auth, theme, cart, app settings | Zustand |
| Feature/domain state | Domain-specific UI and data | Zustand (feature store) |
| Local component state | Form toggles, UI open/close | `useState` / `useReducer` |
| URL state | Filters, pagination, selected tab | TanStack Router search params |

### 9.2 TanStack Query Defaults

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,          // 1 minute
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

### 9.3 Zustand Store Structure

```typescript
// Feature store pattern
interface FeatureState {
  // Domain data
  items: Item[];
  selectedItem: Item | null;

  // UI state
  loading: boolean;
  error: string | null;

  // Actions
  setSelectedItem: (item: Item | null) => void;
  clearError: () => void;
}
```

---

## 10. Security & Input Handling

| Risk | Mitigation |
|------|------------|
| XSS | Never use `dangerouslySetInnerHTML`; sanitize all dynamic content |
| Sensitive data | Never store tokens/credentials in `localStorage` unencrypted |
| API keys | Never in frontend code — use server-side env variables only |
| User input | Always validate with Zod on submit before sending to API |

---

## 11. Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Components | PascalCase | `ProductCard`, `UserList` |
| Component files | kebab-case | `product-card.tsx`, `user-list.tsx` |
| Directories | kebab-case | `user-management/` |
| Hooks | `use` + camelCase | `useProductStore`, `useAuth` |
| Zustand stores | `use{Feature}Store` | `useCartStore` |
| `data-testid` | kebab-case | `data-testid="product-card"` |
| CSS custom props | `--kebab-case` | `--color-primary-600` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_PAGE_SIZE` |

---

## 12. Implementation Checklist

### New Frontend Project

```markdown
## Design System
- [ ] TailwindCSS 4+ with extended brand color scales (primary, secondary, tertiary)
- [ ] Dark mode configured: class-based on `html`, `next-themes`
- [ ] Inter_18pt fonts (Light, Regular, Bold) loaded via `globals.css`
- [ ] Siesa logos in `assets/images/logos/` (4 SVG variants)
- [ ] `react-loading-skeleton` installed and configured (light/dark themes)
- [ ] `sonner` Toaster at `bottom-right` in root layout

## Component Library
- [ ] `siesa-ui-kit` installed and verified for required components
- [ ] shadcn/ui added only for components not in siesa-ui-kit
- [ ] `MasterCrud` used for all master data management screens
- [ ] `LookupField` with `type: 'lookup'` for all backend record selectors
- [ ] `React Hook Form` + `Zod` for all form validation

## Layout
- [ ] `_app.tsx` layout: `flex h-screen`, Sidebar + TopNav + main
- [ ] `_auth.tsx` layout: public pages (login, etc.)
- [ ] All pages use semantic HTML (`<main>`, `<nav>`, `<header>`)
- [ ] Error boundaries wrapping each major feature section

## Accessibility
- [ ] WCAG 2.1 AA contrast ratios verified (4.5:1 normal, 3.1:1 large)
- [ ] Focus indicators visible (`ring-2 ring-primary-600`)
- [ ] Touch targets ≥ 44px
- [ ] All images have `alt` attributes
- [ ] Skip link "Saltar al contenido" before navigation
- [ ] Form inputs have associated `<label>` via `htmlFor`
- [ ] Single `<h1>` per page, headings in descending order

## Language & Content
- [ ] All user-visible text in Spanish
- [ ] `MESSAGES` constant file for standard messages
- [ ] No mixed-language text in UI strings

## Performance
- [ ] Bundle size < 500KB gzipped (initial)
- [ ] Skeleton screens for all async loading states
- [ ] `React.memo` on expensive list items
- [ ] Images have `loading="lazy"` where applicable
- [ ] Route-based code splitting (automatic with TanStack Router)

## State Management
- [ ] TanStack Query for all server state (API calls)
- [ ] Zustand stores per feature (not global monolith)
- [ ] URL params for filters and pagination state

## Security
- [ ] No `dangerouslySetInnerHTML` without sanitization
- [ ] No credentials or secrets in frontend code
- [ ] All user inputs validated with Zod before API submission
```

---

_This document is the base UX/UI specification. It is automatically applied when initializing new projects. Extend it using the `/create-ux-design` workflow for project-specific decisions._
