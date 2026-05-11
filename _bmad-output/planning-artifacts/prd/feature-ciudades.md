---
stepsCompleted:
  - step-01-init
  - step-02-discovery
inputDocuments: []
workflowType: prd-shard
lastStep: 2
featureShard: Ciudades
---

# Product Requirements Document — Feature: Cities (Ciudades)

**Author:** SiesaTeam
**Date:** 2026-03-11
**Product:** Siesa-Agents — ERP Manufacturing Module
**Feature Shard:** Cities Master (Maestro de Ciudades)
**Context:** Brownfield — extending the ERP Manufacturing module with a reference catalog entity

---

## Executive Summary

The Cities Master is a reference catalog that maintains the list of cities available within the Manufacturing module. Cities serve as a classification and location reference for other entities such as Work Centers, Installations, and Warehouses — enabling geographic segmentation of production resources and logistics planning.

This is a **simple master entity** — a flat catalog with no override pattern. Each city record contains a code, name, and active status. The entity follows the standard `BaseMasterService<City>` pattern but does **not** implement the GLOBAL + Override design, since cities are shared globally without company-level customization needs.

### What Makes This Special

- **Lightweight catalog pattern**: Unlike Methods or Work Centers, Cities do not use the Override pattern — they are global reference records consumed as-is by all companies.
- **LookupField consumer-ready**: Exposes a Search endpoint compatible with `LookupFieldQueryBuilder` so that dependent masters can reference cities via standard lookup components.
- **Dependency-aware deletion**: Cities referenced by other entities (Work Centers, Installations) cannot be deleted until the references are removed.

---

## Project Classification

**Technical Type:** ERP Master Entity — Web Application (Brownfield)
**Domain:** Manufacturing ERP — Reference Data
**Complexity:** Low
**Project Context:** Brownfield — extending the existing Siesa ERP Manufacturing module

This feature implements a straightforward ERP reference catalog following established patterns already in use across the Manufacturing module. No novel architecture is introduced.

---

## Success Criteria

### User Success

- An administrator can create a new City in under 30 seconds.
- Users searching for a city from a dependent master receive a filtered, paginated list with partial-text search.
- Users receive clear error messages when attempting to delete a city that has active dependencies.

### Business Success

- The Cities Master provides standardized geographic reference data for the Manufacturing module, ensuring consistent city classification across all dependent entities.

### Technical Success

- The CRUD pattern is correctly implemented via `BaseMasterService<City>`.
- The LookupField Search endpoint is consumable by dependent masters without additional backend changes.
- All backend operations validate RBAC permissions (`manufacturing.cities.*`) and return structured, localized error responses.

### Measurable Outcomes

- Zero cities with duplicate codes in the `cities` table (enforced by unique constraint).
- RBAC enforcement verified: unauthorized requests return `403` with descriptive error payload.

---

## Product Scope

### MVP — Minimum Viable Product

**Included in MVP:**

- CRUD operations: Create, Read (list + detail), Update, Delete (with dependency guard)
- Paginated list view with column filters (Code, Name, IsActive)
- LookupField-compatible Search endpoint
- Full RBAC enforcement (`manufacturing.cities.*`)
- Concurrency control via PostgreSQL `xmin`

### Growth Features (Post-MVP)

- Bulk import of cities from external catalog (DANE, ISO 3166-2)
- Geographic hierarchy (Department / State → City)

### Vision (Future)

- Integration with geographic information systems for location-based manufacturing analytics

---

## User Journeys

### Journey 1: Administrator Creates a New City

Laura is a global ERP administrator. The production planning team needs to register a new manufacturing plant location. Laura navigates to the Cities Master, clicks "Add", enters code `001` and name "Medellín", and saves. The city is now available as a reference in all dependent masters.

**Journey reveals requirements for:** City creation form, code uniqueness validation, RBAC (create permission).

---

### Journey 2: User Selects a City from a Dependent Master

A planner is configuring a Work Center and needs to assign its location. The Work Center form has a City field implemented as a LookupField. The planner types "Med" and "Medellín" appears in the filtered results. They select it and continue.

**Journey reveals requirements for:** LookupField Search endpoint with partial-text search, active-status filtering.

---

### Journey 3: Administrator Attempts to Delete a City in Use

An administrator tries to delete a city that is referenced by an active Work Center. The system returns: "The city is referenced by Work Centers. It cannot be deleted." The administrator understands the constraint.

**Journey reveals requirements for:** Dependency guard on delete, descriptive error messaging.

---

### Journey Requirements Summary

| Journey | Capability Areas Revealed |
|---------|--------------------------|
| 1 — Create city | Creation form, code uniqueness, RBAC:create |
| 2 — LookupField consumption | Search endpoint, partial-text search, active filter |
| 3 — Dependency guard | Dependency check, descriptive errors |

---

## ERP Master Entity Specific Requirements

### Entity Model Overview

**Primary Entity:** `City` (C# class) — Table: `cities`
**Master Type:** GLOBAL (simple catalog, no overrides)
**Pattern Library:** `ERP.MasterPattern` — `BaseMasterService<City>`

### Field-Level Specification

#### `cities` Table

| Field | DB Column | Type | Immutable | Notes |
|---|---|---|---|---|
| ID | id | uuid (v7) | — | PK, `Guid.CreateVersion7()` |
| Code | code | varchar(10) | Yes | Unique; read-only after creation |
| Name | name | varchar(250) | No | Required |
| IsActive | is_active | bool | No | Default: true |
| CreatedAt | created_at | DateTimeOffset | — | Audit |
| CreatedByUserID | created_by_user_id | uuid | — | FK → amgr_users_prj.id |
| UpdatedAt | updated_at | DateTimeOffset? | — | Audit |
| UpdatedByUserID | updated_by_user_id | uuid? | — | FK → amgr_users_prj.id |

### MasterDefinition Configuration

```csharp
public static readonly MasterDefinition DEFINITION = new()
{
    Name = "City",
    Type = MasterType.GLOBAL,
    Fields =
    [
        new FieldDefinition { FieldName = "Code", IsOverridable = false, IsImmutable = true  },
        new FieldDefinition { FieldName = "Name", IsOverridable = false, IsImmutable = false },
        new FieldDefinition { FieldName = "IsActive", IsOverridable = false, IsImmutable = false }
    ]
};
```

### RBAC Permission Matrix

| Permission | Code | Scope |
|---|---|---|
| Read | `manufacturing.cities.read` | View list and detail |
| Create | `manufacturing.cities.create` | Create new cities |
| Update | `manufacturing.cities.update` | Edit city fields |
| Delete | `manufacturing.cities.delete` | Delete cities without dependencies |
| Change Status | `manufacturing.cities.change_status` | Activate / deactivate cities |

### Dependent Masters (Consumers)

| Dependent Master | Relationship |
|---|---|
| Work Centers | References city as location |

These dependent masters define the dependency guard: a city referenced in any of these tables cannot be deleted until the reference is removed.

### List View Specification

**Visible columns:** Code, Name, IsActive (Activo / Inactivo badge)
**Default sort:** Code ASC
**Pagination:** 10 / 20 / 50 / 100 records per page
**Per-row actions:** Edit, View (read-only), Delete

**Filters:**

| Column | Filter Type |
|---|---|
| Code | Partial text match (case-insensitive) |
| Name | Partial text match (case-insensitive) |
| IsActive | Single-select: All / Active / Inactive |

### Form Behavior

**Creation mode:**
- Code field receives initial focus; editable only in Create mode
- Default values: IsActive = true
- Required fields: Code, Name

**Edit mode:**
- Editable: Name, IsActive
- Read-only: Code (always after creation)

**View (read-only) mode:**
- All fields disabled

### Concurrency Control

Concurrent edits detected using PostgreSQL `xmin` system column, consistent with all other masters in the module.

### LookupField Search Endpoint

**Implementation:** Uses `Siesa.BusinessUtilities.LookupFieldQueryBuilder`
**Filtering:** active-only by default
**Search:** partial match on Code and Name (case-insensitive)
**Sort:** Code ASC (default)

---

## Functional Requirements

### City Lifecycle Management

- FR1: An administrator can create a City with a unique code and name.
- FR2: The system validates City code uniqueness in real time (on blur).
- FR3: An administrator can edit the name and active status of an existing City; the code is read-only after creation.
- FR4: A user can delete a City only when it has no dependencies in dependent masters; the system returns a descriptive error when dependencies exist.

### Discovery & Search

- FR5: A user can view a paginated list of Cities filtered by code, name, and active status, sortable by any column.
- FR6: The system exposes a LookupField-compatible Search endpoint for Cities, filtering by active status.

### Security & Integrity

- FR7: The system enforces RBAC permissions (`manufacturing.cities.*`) on every City operation at the backend layer.
- FR8: The system detects concurrent edit conflicts on Cities using PostgreSQL `xmin` and returns a descriptive conflict error.

---

## Non-Functional Requirements

### Security

- All City operations validate the caller's JWT and RBAC claims server-side.

### Data Integrity

- The `code` column in `cities` carries a unique constraint at the database level.

### Performance

- List view queries must return results within 500 ms for datasets up to 10,000 city records.
- LookupField Search endpoint must return results within 300 ms.
- Real-time code uniqueness validation must respond within 200 ms.

---

## Acceptance Criteria

### AC-001: Required fields on creation
- **Given** I am creating a new City
- **When** I attempt to save without Code or Name
- **Then** the system shows validation errors and prevents saving

### AC-002: Real-time code uniqueness validation
- **Given** I enter a code that already exists
- **When** I leave the Code field (on blur)
- **Then** the system shows: "The city already exists"

### AC-003: Successful creation
- **Given** I complete Code and Name
- **When** I press Save
- **Then** the system creates the record successfully

### AC-004: Edit existing city
- **Given** I select edit on an existing City
- **When** I modify name or status and save
- **Then** the system updates the record; Code is read-only

### AC-005: Delete city without dependencies
- **Given** a city has no references in any dependent master
- **When** I confirm its deletion
- **Then** the system deletes it successfully

### AC-006: Delete blocked by dependency
- **Given** a city is referenced in Work Centers
- **When** I attempt to delete it
- **Then** the system shows: "The city is referenced by Work Centers. It cannot be deleted"

### AC-007: Concurrency conflict detection
- **Given** two users are editing the same city simultaneously
- **When** the second user attempts to save
- **Then** the system detects the conflict and shows: "The city has been modified by another user"

### AC-008: LookupField returns active cities only
- **Given** a city is set to Inactive
- **When** a user opens a LookupField that references Cities
- **Then** the inactive city does not appear in the results
