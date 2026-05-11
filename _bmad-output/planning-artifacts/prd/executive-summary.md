## Executive Summary

The **MfgStructure** service is the Manufacturing Structure microservice within the Siesa ERP ecosystem. This PRD defines the requirements for three foundational features of the manufacturing configuration domain: the **Methods Master**, the **Work Centers Master**, and the **Projected Entities** synchronization infrastructure.

These features form the backbone of the manufacturing module: Methods and Work Centers establish the core configuration data that drives production routing, costing, and capacity planning, while Projected Entities provides the event-driven synchronization layer that keeps local reference data consistent with upstream services (AccessManager, Inventory, Segment, ThirdParty) without tight coupling.

### What Makes This Special

The distinguishing design principle is the **GLOBAL + Override pattern** (MasterPattern library): master records are defined globally across the ERP but each company can independently override specific fields (description, use type, active status, rates) without duplicating data. This enables a multi-tenant architecture where a single master record serves all companies while respecting per-company operational differences.

The Projected Entities feature eliminates synchronous cross-service calls at query time by maintaining local projection tables populated through Dapr Pub/Sub events, with an idempotent reconciliation job as a safety net — a pattern that improves resilience and query performance while keeping referential integrity local.
