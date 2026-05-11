# Browser Review — Work Centers (Create View Only)

**Date:** 2026-03-20
**URL:** http://localhost:3001/manufacturing/work-centers (Create flow)
**Source:** _bmad-output/planning-artifacts/epics/epic-03-centros-de-trabajo.md (Epic 5)

---

## Verdict: PASS WITH WARNINGS

---

## What was tested

Create flow for Work Centers: navigating from the list, opening the Create form, filling fields, verifying ShortName auto-fill behavior, submitting, and interacting with the Company Assignment Dialog. Evaluated against AC-E5.2 (Create form, ShortName auto-fill, Company Assignment dialog).

## What passed

- **Console Health:** No JavaScript errors on initial load or after interactions
- **Network Health:** All requests returned 2xx status codes; no broken assets
- **Responsive Design:** No horizontal overflow on Mobile (375x812), Tablet (768x1024), or Desktop (1280x800)
- **Create Form Renders:** All expected fields present — Codigo*, Nombre*, Nombre Corto, Descripcion, Estado, Instalacion, Critico, Codigo de Carga, Velocidad Estandar, Numero de Turnos, Horas por Turno, Rendimiento Promedio, Porcentaje de Carga Deseado, Usa Calendario Planta, Centro de Costo, Responsable Tercero
- **Form Submission:** Clicking "Guardar" with Codigo + Nombre + Estado successfully creates the record (mock); transitions from "Crear" to "Editar Centro de Trabajo" heading
- **Company Assignment Dialog:** Appears automatically after successful creation with correct content: 3 companies listed (Empresa Principal, Filial Norte, Subsidiaria Sur), individual "Vincular"/"Desvincular" toggle per company, "Vincular todos" bulk action, "Confirmar" button disabled until at least one company is linked
- **Post-Create Navigation:** After confirming company assignment, correctly redirects to the Work Centers list

## What needs to be fixed

### Issue 1 — ShortName auto-fill does NOT trigger on Name blur (client-side)

- **Area:** Interaction
- **Severity:** FAIL
- **Description:** After filling the "Nombre" field with "Centro de Prueba Browser Review" and clicking away (blur), the "Nombre Corto" field remained empty. The auto-fill only occurred server-side after the form was submitted (the mock response populated it).
- **Details:** AC-E5.2 specifies "ShortName auto-fill on Name blur". The field was empty after blur but populated after save with the full Name value.
- **Expected:** When the user leaves the "Nombre" field (blur event), if "Nombre Corto" is empty, it should auto-fill with the first 50 characters of the Name value — client-side, before submission.

### Issue 2 — Form lacks tab-based layout (6 tabs)

- **Area:** Interaction
- **Severity:** FAIL
- **Description:** The Create form renders all fields in a single flat layout (2-column grid). There are no tabs visible (Generales, Capacidad, Tarifas Estandar, Tarifas Simulacion, Sustitutos, Descripcion).
- **Details:** AC-E5.2 specifies "fill in all fields across 6 tabs". The current form has no tab navigation component. Fields that should be in Capacidad tab (Velocidad Estandar, Numero de Turnos, Horas por Turno, etc.) are mixed with Generales fields. Rate grids (Tarifas) and Sustitutos sections are completely absent.
- **Expected:** A tabbed interface with 6 tabs organizing fields into logical groups as specified in the epic description.

### Issue 3 — Missing Rate Grids (Tarifas Estandar / Tarifas Simulacion)

- **Area:** Interaction
- **Severity:** FAIL
- **Description:** No rate grid UI is present in the Create form. Cannot evaluate AC-E5.4 (7 burden code validation rules).
- **Details:** The form contains only basic fields. The Tarifas Estandar and Tarifas Simulacion tabs/sections with their rate grids are not implemented.
- **Expected:** Rate grid tables with client-side validation for the 7 burden code rules, with descriptive error messages in Spanish.

### Issue 4 — Missing Capacity calculated fields display

- **Area:** Interaction
- **Severity:** FAIL
- **Description:** No real-time calculated fields (HoursPerDay, DailyCapacity, AvailableCapacity) are visible in the form. Cannot evaluate AC-E5.5.
- **Details:** The capacity-related inputs exist (Velocidad Estandar, Numero de Turnos, Horas por Turno, Rendimiento Promedio, Porcentaje de Carga Deseado) but there are no read-only display fields showing calculated values that update in real-time.
- **Expected:** Calculated fields (HoursPerDay, DailyCapacity, AvailableCapacity) that update as the user changes capacity inputs.

### Issue 5 — Accessibility: form fields without labels

- **Area:** Console
- **Severity:** WARN
- **Description:** Chrome DevTools reported 4 form fields without associated `<label>` elements.
- **Details:** Console issue: "No label associated with a form field" (count: 4). Affects screen reader accessibility.
- **Expected:** Every form field should have an associated `<label>` element (via `for` attribute or nesting).

### Issue 6 — Minor overlap: context-pill and container

- **Area:** Responsive
- **Severity:** WARN
- **Description:** A minor overlap between the "Global" context-pill button and its container DIV was detected across all 3 viewports.
- **Details:** Detected in Mobile, Tablet, and Desktop viewports. Elements: DIV container overlapping with the "Global" button (flex items-center gap-1 px-[6p...).
- **Expected:** No interactive element overlaps. This appears cosmetic and does not affect functionality.

### Issue 7 — Typo in success dialog

- **Area:** Interaction
- **Severity:** WARN
- **Description:** The success dialog heading reads "Haz creado el registro exitosamente" — "Haz" should be "Has" (verb "haber", not "hacer").
- **Details:** Element uid=5_4: heading "Haz creado el registro exitosamente"
- **Expected:** "Has creado el registro exitosamente"

## QA Custom Checks

No QA checks configured.
