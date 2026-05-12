---
name: sa-jira-sync
description: Query Jira and return a minimal hierarchy of Epics → Stories → Subtasks for a given project and epic status. Returns only id, key, name, and status for each level. Use when the user needs to inspect or export the epic/story/subtask structure from siesa-team or siesa-test-sandbox.
argument-hint: [PROJECT-KEY] [--status "Epic Status"]
user-invocable: true
allowed-tools: Bash, Read, Write
---

Handle the Jira sync request: **$ARGUMENTS**

IT IS CRITICAL THAT YOU FOLLOW THIS COMMAND: LOAD the FULL @_siesa-agents/sa/sa-jira-sync-api/jira-sync-api.md, READ its entire contents and follow its directions exactly!
