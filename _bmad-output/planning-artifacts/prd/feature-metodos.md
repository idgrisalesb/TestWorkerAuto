---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-complete
inputDocuments:
  - _bmad-output/shared-docs/Metodos.md
workflowType: prd-shard
lastStep: 11
featureShard: Methods
---

# Product Requirements Document — Feature: Methods

**Author:** SiesaTeam
**Date:** 2026-03-06
**Project:** Siesa ERP — Manufacturing Module
**Feature Shard:** Methods Master (Maestro de Métodos)
**Context:** Brownfield — extending the ERP Manufacturing module with a new master entity

---

## Executive Summary

The Methods Master is a global catalog that classifies manufacturing methods used to define how products are produced and costed. It serves as the foundational configuration entity for Routes of Operation, Bills of Materials, and Cost Groups within the Manufacturing module.

Each Method carries a **Use Type** (`ManufacturingAndCosting`, `ManufacturingOnly`, or `CostingOnly`) that determines its applicability in production and costing workflows. This classification enables organizations to manage multiple fabrication and costing variants for the same product — for example, a "Standard" method for regular production and an "Alternate" method for special scenarios.

The Methods Master implements the **MasterPattern GLOBAL + Override** design: methods are defined globally (cross-company) but each company can independently override the overridable fields (`Description`, `UseCode`, `IsActive`) without affecting other companies. Fields marked as immutable (`Code`, `Name`) require the elevated `UPDATE_GLOBAL` permission and cannot be overridden at the company level.

A protected seed record with code `0001` (name "Estándar", use type "ManufacturingAndCosting") must always exist and is immutable — it cannot be modified or deleted.

### What Makes This Special

- **Dual-scope editing model**: a single form supports both global base-record editing (requiring elevated permissions) and company-scoped override editing, controlled by a context selector in the UI.
- **Cascading inheritance**: when a company has no override for an overridable field, the system resolves the effective value from the global base automatically, ensuring consistent defaults without data duplication.
- **Context-aware LookupField filtering**: the Search endpoint filters methods by the active company's visibility and by use type context — routes exclude "CostingOnly" methods; costing screens exclude "ManufacturingOnly" methods.

---

## Project Classification

**Technical Type:** ERP Master Entity — Web Application (Brownfield)
**Domain:** Manufacturing ERP
**Complexity:** Medium
**Project Context:** Brownfield — extending the existing Siesa ERP Manufacturing module

This feature implements a standard ERP master entity following the established `MasterPattern` library conventions already in use across the Manufacturing module. No novel architecture is introduced; the implementation reuses proven patterns for GLOBAL masters with company overrides.

---

## Success Criteria

### User Success

- A global administrator can create a new Method in under 60 seconds, including assigning it to one or more companies.
- A company administrator can override method configuration for their company without impacting other companies, with immediate visual confirmation of which values are inherited vs. overridden.
- A user searching for a method from a dependent master (Routes, BOM, Cost Groups) receives a filtered, paginated list that respects their company context and active-only defaults.
- Users receive clear, descriptive error messages when attempting to modify or delete the immutable seed record (`0001`) or delete a method that has active dependencies.

### Business Success

- The Methods Master is the required prerequisite for implementing Routes of Operation, Bills of Materials, and Cost Groups — its completion unblocks those features.
- All methods used in manufacturing planning are traceable to a validated global definition, ensuring consistent costing and production classification across the organization.
- The seed method "Estándar" (0001) is always available from system initialization, preventing data integrity issues in dependent masters.

### Technical Success

- The GLOBAL + Override pattern is correctly implemented via `BaseMasterService<Method>` with `MasterDefinition` configuration matching the documented field-level `IsImmutable` / `IsOverridable` flags.
- Concurrent edits on the same method record are detected using PostgreSQL `xmin` and surfaced to the user with a descriptive conflict message, without silent data loss.
- The LookupField Search endpoint is consumable by Routes, BOM, and Cost Groups without additional backend changes.
- All backend operations validate RBAC permissions (`manufacturing.methods.*`) and return structured, localized error responses for unauthorized attempts.

### Measurable Outcomes

- Zero methods with duplicate codes in the `methods` table (enforced by unique constraint).
- Seed record `0001` present and immutable from first migration run.
- RBAC enforcement verified: unauthorized requests return `403` with descriptive error payload.
- Concurrent edit conflict detected in < 1 second via `xmin` check on save.

---

## Product Scope

### MVP — Minimum Viable Product

The complete Methods Master implementation is the MVP. There are no deferred features, since this master is a blocking dependency for Routes, BOM, and Cost Groups.

**Included in MVP:**

- CRUD operations: Create, Read (list + detail), Update (global and company-scoped), Delete (with dependency guard)
- GLOBAL + Override pattern with `BaseMasterService<Method>` and `MethodOverrides` table
- Seed record `0001` ("Estándar") as a protected, immutable record
- Company assignment dialog (post-creation flow)
- Paginated list view with column filters (Code, Name, UseCode, IsActive)
- LookupField-compatible Search endpoint (filtered by company context and UseCode)
- Full RBAC enforcement (`manufacturing.methods.*`)
- Concurrency control via PostgreSQL `xmin`
- Context selector in the edit form (Global vs. Company)

### Growth Features (Post-MVP)

- Bulk company assignment from the list view
- Audit log / change history view for method records
- Export of the methods list to CSV/Excel

### Vision (Future)

- API-level method import for ERP data migration scenarios
- Inter-company method inheritance reporting (which companies have overrides vs. inheriting)

---

## User Journeys

### Journey 1: Global Administrator Creates a New Manufacturing Method

Carlos is a global ERP administrator at a multi-company manufacturing organization. The production planning team has identified the need for an "Alternate" method — a variant of the standard production process used for prototype runs. Without this method registered in the system, the team cannot create the corresponding Bill of Materials or Route.

Carlos navigates to the Methods Master, clicks "Add", and enters code `0002`, name "Alternate", and selects use type "Manufacturing and Costing" (the default). He saves the record. The system creates it successfully and immediately presents the Company Assignment dialog. Carlos selects the three subsidiary companies involved in prototype production and confirms. The method is now available globally and visible to the selected companies.

The next day, the BOM team creates a Bill of Materials linked to the "Alternate" method without any friction — the method appears in the LookupField filtered to methods with use type compatible with BOM selection.

**Journey reveals requirements for:** Method creation form, code uniqueness validation, company assignment dialog, RBAC (create permission), LookupField search endpoint.

---

### Journey 2: Company Administrator Customizes a Method for Their Company

Ana is the ERP administrator for Subsidiary B. The global method "Alternate" has a generic description, but Subsidiary B uses it exclusively for a specific product line and wants to add a clarifying description for their operators. They also want to mark it as inactive for their company — they are no longer using it for new orders.

Ana opens the Methods Master, loads the "Alternate" method, and uses the context selector to switch to "Subsidiary B" mode. The form shows Code and Name as read-only (inherited from global), and Description, UseCode, and IsActive as editable override fields. She enters the company-specific description and sets IsActive to Inactive. She saves.

Subsidiary B's operators now see "Alternate" as inactive in their method selectors — it no longer appears in LookupField results for new orders. Other subsidiaries are unaffected and continue seeing it as active with the original description.

**Journey reveals requirements for:** Company-scoped edit mode, context selector UI, override inheritance (NULL = inherit), IsActive filtering in LookupField, RBAC (update vs. update_global).

---

### Journey 3: User Attempts to Modify the Immutable Seed Record

A new ERP administrator, David, notices that method `0001` ("Estándar") has a generic description. He opens it and attempts to edit the name field in Global context. The system shows the name as read-only with a tooltip explaining that code `0001` is a protected system record. When David tries to delete the record, the system immediately returns: "Methods with code 0001 cannot be deleted." David understands the constraint and instead creates a new method for his customization needs.

**Journey reveals requirements for:** Immutable seed record protection, descriptive error messaging for modification/deletion attempts, read-only field behavior for protected records.

---

### Journey 4: User Deletes a Method with Active Dependencies

Maria is cleaning up the methods catalog and tries to delete an obsolete method that was never assigned to any company. The system validates dependencies against Cost Groups and BOM tables. Finding none, it prompts for confirmation and deletes the record successfully.

Later, she tries to delete another method that is referenced in a Cost Group. The system returns: "The method exists in the Cost Groups master. It cannot be deleted." Maria understands she must first remove the reference in Cost Groups before deletion is possible.

**Journey reveals requirements for:** Dependency guard on delete (Cost Groups, BOM, Routes), descriptive error per dependent entity, confirmation dialog for safe deletions.

---

### Journey 5: Dependent Master Selects a Method via LookupField

A planner is creating a new Route of Operation. The Route form has a Method field implemented as a LookupField. When the planner opens the selector, the Search endpoint returns only methods that:

1. Are assigned to the planner's company (or globally available without company filter, depending on configuration).
2. Are active (IsActive = true, resolved including company overrides).
3. Have UseCode compatible with Routes (i.e., exclude "CostingOnly" methods).

The planner searches for "stan" and the method "Estándar" (0001) appears immediately. They select it and continue filling in the route.

**Journey reveals requirements for:** LookupField Search endpoint with partial-text search, company-scoped filtering, active-status filtering, UseCode-context filtering.

---

### Journey Requirements Summary

| Journey | Capability Areas Revealed |
|---------|--------------------------|
| 1 — Create new method | Creation form, code uniqueness (real-time), company assignment dialog, RBAC:create |
| 2 — Company-scoped override | Context selector, override editing, inheritance resolution, RBAC:update |
| 3 — Immutable seed protection | Seed guard on modify/delete, descriptive errors, read-only field rendering |
| 4 — Dependency guard on delete | Dependency check (Cost Groups, BOM), confirmation dialog, descriptive errors |
| 5 — LookupField consumption | Search endpoint, partial-text search, active + UseCode + company filters |

---

## ERP Master Entity Specific Requirements

### Entity Model Overview

**Primary Entity:** `Method` (C# class) — Table: `methods`
**Override Entity:** `MethodOverrides` (C# class) — Table: `methods_overrides`
**Master Type:** GLOBAL (cross-company base record) with per-company overrides
**Pattern Library:** `ERP.MasterPattern` — `BaseMasterService<Method>`

### Field-Level Specification

#### `methods` Table

| Field | DB Column | Type | Immutable | Overridable | Notes |
|---|---|---|---|---|---|
| ID | id | uuid (v7) | — | — | PK, `Guid.CreateVersion7()` |
| Code | code | varchar(4) | Yes | No | Unique; requires `UPDATE_GLOBAL` |
| Name | name | varchar(250) | Yes | No | Requires `UPDATE_GLOBAL` |
| Description | description | varchar(2000) | No | Yes | Optional; overridable per company |
| UseCode | use_code | smallint | No | Yes | Enum: 0=ManufacturingAndCosting, 1=ManufacturingOnly, 2=CostingOnly |
| IsActive | is_active | bool | No | Yes | Default: true |
| CreatedAt | created_at | DateTimeOffset | — | — | Audit |
| CreatedByUserID | created_by_user_id | uuid | — | — | FK → amgr_users_prj.id |
| UpdatedAt | updated_at | DateTimeOffset? | — | — | Audit |
| UpdatedByUserID | updated_by_user_id | uuid? | — | — | FK → amgr_users_prj.id |

#### `methods_overrides` Table

| Field | DB Column | Type | Notes |
|---|---|---|---|
| MethodID | method_id | uuid | PK (composite), FK → methods.id |
| CompanyID | company_id | uuid | PK (composite), FK → segm_companies_prj.id |
| Description | description | varchar(2000)? | NULL = inherit from base |
| UseCode | use_code | smallint? | NULL = inherit from base |
| IsActive | is_active | bool? | NULL = inherit from base |
| AssignedAt | assigned_at | DateTimeOffset | Audit |
| AssignedByUserID | assigned_by_user_id | uuid | FK → amgr_users_prj.id |
| UpdatedAt | updated_at | DateTimeOffset? | Audit |
| UpdatedByUserID | updated_by_user_id | uuid? | FK → amgr_users_prj.id |

### MethodUseCode Enumeration

| Value | Name | Description |
|---|---|---|
| 0 | ManufacturingAndCosting | Method applies to both fabrication and costing |
| 1 | ManufacturingOnly | Method applies only to fabrication routes |
| 2 | CostingOnly | Method applies only to product costing |

### MasterDefinition Configuration

```csharp
public static readonly MasterDefinition DEFINITION = new()
{
    Name = "Method",
    Type = MasterType.GLOBAL,
    OverridesTableName = "methods_overrides",
    Fields =
    [
        new FieldDefinition { FieldName = "Code",        IsOverridable = false, IsImmutable = true  },
        new FieldDefinition { FieldName = "Name",        IsOverridable = false, IsImmutable = true  },
        new FieldDefinition { FieldName = "Description", IsOverridable = true,  IsImmutable = false },
        new FieldDefinition { FieldName = "UseCode",     IsOverridable = true,  IsImmutable = false },
        new FieldDefinition { FieldName = "IsActive",    IsOverridable = true,  IsImmutable = false }
    ]
};
```

### Seed Record

The following record must be present from initial migration and is permanently protected:

| Field | Value |
|---|---|
| Code | `0001` |
| Name | Estándar |
| UseCode | `0` (ManufacturingAndCosting) |
| IsActive | `true` |

The seed record cannot be modified (any field) or deleted. Any attempt must return a descriptive error message.

### RBAC Permission Matrix

| Permission | Code | Scope |
|---|---|---|
| Read | `manufacturing.methods.read` | View list and detail |
| Create | `manufacturing.methods.create` | Create new methods |
| Update | `manufacturing.methods.update` | Edit overridable fields per company |
| Update Global | `manufacturing.methods.update_global` | Edit immutable fields (Code, Name) — admin only |
| Delete | `manufacturing.methods.delete` | Delete methods without dependencies |
| Change Status | `manufacturing.methods.change_status` | Activate / deactivate methods |
| Assign | `manufacturing.methods.assign` | Assign / unassign methods to companies |

### Dependent Masters (Consumers)

| Dependent Master | Relationship | UseCode Filter |
|---|---|---|
| Cost Groups (`t803_mf_grupos_costos`) | Selects method for BOM and route association | All use types |
| Bill of Materials (`t820_mf_lista_material`) | Selects method the BOM belongs to | Excludes CostingOnly |
| Routes of Operation | Selects the route's method | Excludes CostingOnly |

These dependent masters also define the dependency guard: a method referenced in any of these tables cannot be deleted until the reference is removed.

### List View Specification

**Visible columns:** Code, Name, UseCode (display label), IsActive (Activo / Inactivo badge)
**Default sort:** Code ASC
**Pagination:** 10 / 20 / 50 / 100 records per page
**Per-row actions:** Edit, View (read-only), Assign Company, Delete (hidden for record `0001`)

**Filters:**

| Column | Filter Type |
|---|---|
| Code | Partial text match (case-insensitive) |
| Name | Partial text match (case-insensitive) |
| UseCode | Single-select: All / ManufacturingAndCosting / ManufacturingOnly / CostingOnly |
| IsActive | Single-select: All / Active / Inactive |

### Form Behavior

**Creation mode:**
- Context: global base record only (no company selector shown)
- Code field receives initial focus; editable only in Create / Duplicate modes
- Default values: UseCode = 0 (ManufacturingAndCosting), IsActive = true
- On successful save: automatically open Company Assignment dialog (optional, skippable)

**Edit mode — Global context:**
- Requires `manufacturing.methods.update_global`
- Editable: Name, Description, UseCode, IsActive
- Read-only: Code (always after creation)
- Blocked for seed record `0001`

**Edit mode — Company context:**
- Selector shows only companies where the method is already assigned and the user has access
- Read-only: Code, Name (immutable global fields)
- Editable override fields: Description, UseCode, IsActive
- NULL override = inherits global base value

**View (read-only) mode:**
- Same context selector as edit mode
- All fields disabled

### Concurrency Control

Concurrent edits on the same method record are detected using the PostgreSQL `xmin` system column. When a save detects a version mismatch, the system returns a descriptive conflict error: "The method has been modified by another user." The user is offered the option to force-save or refresh.

### LookupField Search Endpoint

The `Search` endpoint enables the `LookupField` component in dependent masters to consume methods.

**Implementation:** Uses `Siesa.BusinessUtilities.LookupFieldQueryBuilder`
**Filtering:** active-only by default; company-scoped visibility; optional UseCode exclusion by caller context
**Search:** partial match on Code and Name (case-insensitive)
**Sort:** Code ASC (default), Name ASC (when query is name-driven)

---

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Complete Feature MVP — The Methods Master has no partial delivery option since it is a blocking dependency for Routes, BOM, and Cost Groups. All capabilities must be delivered in a single sprint cycle.

**Resource Requirements:** 1 backend developer, 1 frontend developer, 0.5 QA engineer.

### MVP Feature Set (Phase 1) — All Required

**Core User Journeys Supported:**
- Create and manage methods globally
- Assign methods to companies
- Override method configuration per company
- Delete methods safely (with dependency guard)
- Consume methods from dependent masters via LookupField

**Must-Have Capabilities:**
- CRUD for `methods` and `methods_overrides` tables
- GLOBAL + Override pattern via `BaseMasterService<Method>`
- Seed record protection (`0001`)
- Paginated list view with column filters
- Dual-context edit form (Global / Company)
- Company assignment dialog
- Dependency guard on delete (Cost Groups, BOM, Routes)
- LookupField Search endpoint
- Full RBAC enforcement
- Concurrency control via `xmin`

### Post-MVP Features (Phase 2)

- Bulk company assignment from list view
- Audit log / change history for method records

### Expansion (Phase 3)

- API-level method import for data migration
- Inter-company inheritance reporting

### Risk Mitigation Strategy

**Technical Risks:** The `MasterPattern` library is already proven in the project; the main risk is correct configuration of `IsImmutable` / `IsOverridable` flags per field. Mitigated by unit tests on the `MasterDefinition` and integration tests on override resolution.

**Market Risks:** N/A — this is an internal ERP module with committed delivery scope.

**Resource Risks:** If QA capacity is constrained, automated acceptance tests on the seed guard and dependency check cover the highest-risk scenarios.

---

## Functional Requirements

### Method Lifecycle Management

- FR1: A global administrator can create a Method with a unique 4-character code, name,
  use type, and active status.
- FR2: The system validates Method code uniqueness in real time when the user leaves the
  code field (on blur), before form submission.
- FR3: Upon successful Method creation, the system presents a company assignment dialog
  allowing the administrator to assign the new Method to one or more of their authorized
  companies.
- FR4: A global administrator can edit the global base fields of an existing Method
  (name, description, use type, active status); the code field is read-only after
  creation.
- FR5: A company administrator can edit the overridable fields of a Method
  (description, use type, active status) scoped to their company, without affecting
  other companies.
- FR6: NULL override values on a Method inherit the corresponding global base value;
  the system resolves the effective value automatically.
- FR7: A global administrator can assign or unassign a Method to/from one or more
  companies.
- FR8: A user can delete a Method only when it has no dependencies in Cost Groups,
  Bill of Materials, or Routes; the system returns a descriptive error when dependencies
  exist.
- FR9: The system prevents modification and deletion of the seed Method record
  (code `0001`), returning a descriptive error for any such attempt.

### Discovery & Search

- FR10: A user can view a paginated list of Methods filtered by code, name, use type,
  and active status, sortable by any column.
- FR11: The system exposes a LookupField-compatible Search endpoint for Methods,
  filtering by company visibility and active status, consumable by Routes, BOM, and
  Cost Groups.

### Security & Integrity

- FR12: The system enforces RBAC permissions (`manufacturing.methods.*`) on every
  Method operation at the backend layer.
- FR13: The system detects concurrent edit conflicts on Methods using PostgreSQL `xmin`
  and returns a descriptive conflict error to the user.

---

## Non-Functional Requirements

### Security

- All Method operations validate the caller's JWT and RBAC claims server-side; no operation is authorized based solely on UI state.
- The `update_global` permission is checked independently of `update`; a user with only `update` cannot modify immutable fields even via direct API call.
- Field-level immutability for the seed record (`0001`) is enforced at the service layer, not only in the UI.

### Data Integrity

- The `code` column in `methods` carries a unique constraint at the database level (not only application-level validation).
- The composite primary key `(method_id, company_id)` in `methods_overrides` is enforced at the database level.
- Foreign key constraints from `methods_overrides.method_id → methods.id` must cascade-guard deletes (blocked at application layer before reaching the DB, with descriptive errors).

### Performance

- List view queries (paginated, filtered) must return results within 500 ms for datasets up to 10,000 method records.
- LookupField Search endpoint must return filtered results within 300 ms to ensure responsive UI in dependent masters.
- Real-time code uniqueness validation (on-blur) must respond within 200 ms.

### Reliability

- The seed record `0001` must be guaranteed present after any migration run; its absence must cause the migration to fail with a clear error rather than silently proceeding.
- Concurrency conflict detection via `xmin` must be applied on every update and delete operation to prevent silent data overwrite.

### Integration

- The LookupField Search endpoint must conform to the `Siesa.BusinessUtilities.LookupFieldQueryBuilder` contract so that Routes, BOM, and Cost Groups can integrate without additional negotiation.
- Projected entities from AccessManager (`amgr_users_prj`) and Segment (`segm_companies_prj`) are consumed as read-only projections; the Methods service must not write to these tables.

---

## Acceptance Criteria

### AC-001: Required fields on creation
- **Given** I am creating a new Method
- **When** I attempt to save without Code or Name
- **Then** the system shows validation errors and prevents saving

### AC-002: Real-time code uniqueness validation
- **Given** I enter a code that already exists
- **When** I leave the Code field (on blur) or attempt to save
- **Then** the system shows: "The method already exists"

### AC-003: Successful creation
- **Given** I complete Code (max 4 chars), Name, and UseType
- **When** I press Save
- **Then** the system creates the record and presents the Company Assignment dialog

### AC-004: UseType default value
- **Given** I am creating a new Method
- **When** the form initializes
- **Then** UseType defaults to "Manufacturing and Costing" (value 0)

### AC-005: Edit existing method (global context)
- **Given** I select edit on an existing Method in Global context
- **When** I modify name, description, use type, or status and save
- **Then** the system updates the record and shows confirmation; Code is read-only

### AC-006: Seed record modification protection
- **Given** I load method `0001` ("Estándar")
- **When** I attempt to modify any field
- **Then** the system shows: "Methods with code 0001 cannot be modified"

### AC-007: Seed record deletion protection
- **Given** I load method `0001` ("Estándar")
- **When** I attempt to delete it
- **Then** the system shows: "Methods with code 0001 cannot be deleted"

### AC-008: Seed record existence
- **Given** the system is initialized
- **When** I query the methods list
- **Then** method `0001` with name "Estándar" and use type "Manufacturing and Costing" must exist

### AC-009: Delete method without dependencies
- **Given** a method has no references in any dependent master
- **When** I confirm its deletion
- **Then** the system deletes it successfully

### AC-010: Delete blocked by Cost Groups dependency
- **Given** a method is referenced in Cost Groups
- **When** I attempt to delete it
- **Then** the system shows: "The method exists in the Cost Groups master. It cannot be deleted"

### AC-011: Delete blocked by BOM dependency
- **Given** a method is referenced in Bills of Materials
- **When** I attempt to delete it
- **Then** the system shows: "The method exists in the Bill of Materials master. It cannot be deleted"

### AC-012: Method deactivation hides it from selectors
- **Given** I set a method's status to Inactive and save
- **When** a user opens a LookupField in Routes, BOM, or Cost Groups
- **Then** the inactive method does not appear in the results

### AC-013: Concurrency conflict detection
- **Given** two users are editing the same method simultaneously
- **When** the second user attempts to save
- **Then** the system detects the conflict and shows: "The method has been modified by another user"

### AC-014: Company-level Description override
- **Given** a method has global description "General Notes"
- **When** Company A overrides the description with "Company A Specific Notes"
- **Then** Company A sees "Company A Specific Notes"; other companies see "General Notes"

### AC-015: Company-level UseType override
- **Given** a method has global UseType "Manufacturing and Costing"
- **When** Company A overrides UseType to "Costing Only"
- **Then** Company A sees "Costing Only"; other companies see "Manufacturing and Costing"

### AC-016: Company-level IsActive override
- **Given** a method is Active globally
- **When** Company A deactivates it for their company only
- **Then** other companies continue seeing the method as Active

### AC-017: Override inheritance (partial override)
- **Given** a method has a partial override in a company (e.g., only `is_active`)
- **When** I query the method in that company
- **Then** fields without overrides (`description`, `use_code`) inherit the global base values
