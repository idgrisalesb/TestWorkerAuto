## Success Criteria

### User Success

ERP configuration administrators and manufacturing managers consider these features
successful when:

- A new Method can be created with Code, Name, and UseType in a single form submission,
  with real-time uniqueness validation on Code and automatic company assignment dialog
  presented on save.
- Company-specific overrides (Description, UseCode, IsActive) for Methods are editable
  per company without affecting other companies; NULL override values correctly inherit
  from the global base record.
- A Work Center can be configured with its capacity parameters (shifts, hours, speed,
  machines), associated to an Installation, Warehouse, Cost Center and Responsible, with
  company-level overrides for rates and operational fields.
- Projected entity data (users, companies, cost centers, storages, third parties) is
  available locally for LookupField selection without requiring synchronous calls to
  upstream services.
- All form validations are clear, actionable, and trigger at the right moment (on blur
  for uniqueness, on save for required fields).

### Business Success

- All acceptance criteria defined in functional documentation are verified and passing
  at delivery for each feature (Methods: AC-001–AC-017; Work Centers: equivalent
  coverage; Projected Entities: all 11 success criteria from the product brief).
- The immutable seed record `0001` (Method "Estándar") exists and is protected across
  all environments.
- RBAC permissions (`manufacturing.methods.*`, `manufacturing.work_centers.*`) are
  enforced at both frontend and backend layers.
- Features SBMAN-150 (Methods), SBMAN-152 (Work Centers), and SBMAN-171 (Projected
  Entities) are completed and closed in Jira.

### Technical Success

- Unit test coverage ≥ 80% on Projected Entities sync handlers, search services, and
  reconciliation logic (per product brief Section 7).
- Dapr Pub/Sub subscriptions register automatically at service startup with no manual
  intervention required.
- Projection sync handlers are idempotent: the same event delivered N times produces
  the same result as delivering it once.
- `tenantId` validation is enforced on every event handler; invalid tenant events are
  rejected without fatal errors.
- Concurrency conflicts on Methods and Work Centers are detected via PostgreSQL `xmin`
  and return a meaningful error to the user.
- The GLOBAL + Override pattern resolves correctly: NULL override fields inherit from
  the global base; non-NULL fields return the company-specific value.
- Reconciliation job executes on service startup and then on the configured interval
  (`Projections:ReconciliationIntervalMinutes`, default 60), logging results per entity.

### Measurable Outcomes

| Criterion | Target |
|-----------|--------|
| Acceptance criteria passing (Methods) | AC-001 to AC-017 — 100% |
| Acceptance criteria passing (Work Centers) | Equivalent AC set — 100% |
| Projected Entities success criteria | 11/11 from product brief |
| Unit test coverage (Projected Entities) | ≥ 80% |
| Concurrency conflict detection | Functional via xmin |
| Override resolution correctness | NULL = inherit, NOT NULL = override |
| Dapr subscription on startup | Automatic, 0 manual steps |
