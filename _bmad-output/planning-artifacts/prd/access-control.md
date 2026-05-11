### Access Control

- FR36: The system enforces all RBAC permission checks server-side on every API
  operation; frontend visibility is a UX aid only and is not a security boundary.
- FR37: Users can only operate on companies they are authorized for; the system
  resolves the user's company scope from their session context.
- FR38: The `update_global` permission is required to modify immutable fields (Code,
  Name) on any master record; standard `update` permission covers only overridable
  fields in company context.
