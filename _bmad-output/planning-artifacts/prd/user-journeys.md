## User Journeys

### Journey 1: Carlos (Global ERP Administrator) — Onboarding a New Manufacturing Method

Carlos is the ERP platform administrator at a multi-company manufacturing group using
Siesa. The engineering team has just designed a new production method called "Lean
Assembly" that needs to exist globally before any company can use it in their Bills of
Materials and Routes. Carlos has been handed a one-pager from engineering with the
method's code, name, and intended use.

He opens the Methods master, clicks "Add", and types the 4-character code. The moment
he tabs away, the system validates uniqueness in real time — no waiting, no submitting
a broken form. He fills in the name, selects "Manufacturing and Costing" as the use
type, and saves. Immediately, a company assignment dialog appears. Carlos selects the
three companies that will initially use this method and confirms.

The breakthrough: within two minutes, a globally consistent method record exists,
already visible to every company in the ERP — and those three companies can immediately
start configuring their own override settings without Carlos touching anything else.

*This journey reveals requirements for:*
- Real-time uniqueness validation on Code (on blur)
- Create form with defaults (UseCode = ManufacturingAndCosting, IsActive = true)
- Immediate company assignment dialog post-save
- Global record visibility across all companies

### Journey 2: Valentina (Company Manufacturing Administrator) — Adapting a Work Center for Her Plant

Valentina manages manufacturing configuration for Compañía Norte, one of five companies
in the group. The global ERP team has created a Work Center called "Línea de Ensamble 1"
with standard parameters, but Norte's plant runs a different shift schedule and uses a
different cost center than the global default.

She opens Work Centers, finds the record, and selects her company context from the
context selector. The form shows the global (read-only) fields — Code and Name — and the
overridable fields pre-populated with the inherited global values. She changes the
shift count to 2 (instead of the global 3), updates the cost center via LookupField to
Norte's specific cost center, and saves.

The moment of relief: when the routing team at Compañía Norte builds their production
routes, they see "Línea de Ensamble 1" with Norte's shift structure — not the global
default. Meanwhile, the other four companies continue seeing their own configurations
undisturbed.

*This journey reveals requirements for:*
- Company context selector in edit mode
- Overridable fields: editable per company, inheriting global value when NULL
- Immutable fields (Code, Name): visible but read-only in company context
- LookupField for Cost Center, Installation, Warehouse (from projected entities)

### Journey 3: Andrés (Read-Only Consultant) — Auditing Method Assignments

Andrés is an external ERP consultant auditing the manufacturing configuration before
go-live. He has `read` permission only. He needs to verify that all methods are correctly
assigned to the right companies and that the seed record "0001 — Estándar" is protected.

He opens the Methods list, which loads paginated with Code, Name, UseType, and Status
columns. He filters by UseType = "Costing Only" to find any methods that shouldn't be
used in routing — the filter works instantly on the server. He clicks "View" on method
0001 and confirms it shows all fields as read-only. He tries to click "Edit" — the
button isn't there. He checks the company assignments via the list actions — no
"Delete" button appears for 0001 either.

Andrés finishes his audit confident that the system protects the immutable seed and
provides a clean filtered view for compliance review.

*This journey reveals requirements for:*
- List view with column filters (UseType, Status, Code, Name)
- View mode: all fields read-only
- Edit/Delete actions hidden or disabled based on RBAC
- No Delete action available for seed record 0001

### Journey 4: MfgStructure Service — Resolving a LookupField at Runtime

The Work Centers master form needs to display a Cost Center selector. When Valentina
opens the form, the LookupField component sends a search request to
`GET /projections/cost-centers/search?query=norte&companyId=...`. The endpoint uses
`LookupFieldQueryBuilder` to filter active cost centers visible to her company, joins
with the CostCenter overrides table to apply the CompanyID filter, and returns paginated
results within milliseconds — without calling the Segment service.

Valentina types "norte", sees "Centro de Costo Norte — CC-001" appear in the dropdown,
and selects it. No loading spinner, no cross-service latency, no failure risk from
Segment being temporarily unavailable.

The backstory: this works because three hours earlier, when the Segment service
published a `segmentos.costcenter.created` event, the MfgStructure Dapr subscription
handler received it, validated the tenantId, and upserted the record into
`segm_cost_centers_prj`. The reconciliation job had also run at service startup to
backfill any events missed during deployment.

*This journey reveals requirements for:*
- Dapr Pub/Sub subscription endpoint for each projected entity
- Idempotent upsert handler per entity type
- tenantId validation on every received event
- Search endpoint per projected entity with LookupFieldQueryBuilder
- CompanyID filtering via Override JOIN where applicable
- Reconciliation BackgroundService (startup + periodic interval)

### Journey 5: Felipe (Platform Engineer) — Diagnosing a Stale Projection

Felipe gets an alert: a Work Center form in production is showing an outdated cost
center name. He checks the MfgStructure logs and finds that the
`segmentos.costcenter.updated` event was delivered but the handler returned a 500 due
to a transient DB connection error. Because Dapr uses at-least-once delivery, the event
was retried and eventually succeeded — but a 20-minute gap existed.

Felipe checks the reconciliation job logs: the next scheduled run (60-minute interval)
had already corrected the stale record and logged "1 updated / 0 errors" for the
CostCenter entity. No manual intervention needed.

He adjusts the reconciliation interval to 30 minutes for the production environment via
`Projections:ReconciliationIntervalMinutes = 30` in the config and deploys. The gap
is now acceptable within SLA.

*This journey reveals requirements for:*
- Per-entity result logging in reconciliation job (updated / unchanged / error counts)
- Configurable reconciliation interval via appsettings
- At-least-once delivery idempotency (retry-safe handlers)
- Reconciliation triggered at service startup before first request is processed

### Journey Requirements Summary

| Capability Area | Revealed By |
|----------------|-------------|
| Real-time Code uniqueness validation | Journey 1 |
| Post-save company assignment dialog | Journey 1 |
| Company context selector in edit mode | Journey 2 |
| GLOBAL + Override field resolution | Journey 2 |
| LookupField for projected entities (Cost Center, Installation, etc.) | Journey 2, 4 |
| List filters by UseType, Status, Code, Name | Journey 3 |
| RBAC-driven UI action visibility | Journey 3 |
| Seed record protection (0001) | Journey 3 |
| Dapr event subscription + idempotent upsert handlers | Journey 4, 5 |
| tenantId validation per event | Journey 4 |
| LookupField Search endpoints with CompanyID/IsActive filters | Journey 4 |
| Reconciliation BackgroundService (startup + periodic) | Journey 4, 5 |
| Per-entity reconciliation logging | Journey 5 |
| Configurable reconciliation interval | Journey 5 |
