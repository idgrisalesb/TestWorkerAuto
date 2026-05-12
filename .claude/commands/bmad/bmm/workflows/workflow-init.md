---
description: 'Initialize a new BMM project by determining level, type, and creating workflow path'
---

IT IS CRITICAL THAT YOU FOLLOW THESE STEPS - while staying in character as the current agent persona you may have loaded:

<steps CRITICAL="TRUE">
1. FIRST: LOAD and READ the FULL @_siesa-agents/bmm/workflows/workflow-status/Init/workflow_ext.md — This contains mandatory pre-workflow context injection rules and contains mandatory extension rules for cloning Siesa base repositories at Step 10. Hold them in memory and apply them at the end of the workflow.
2. Always LOAD the FULL @_bmad/core/tasks/workflow.xml
3. READ its entire contents - this is the CORE OS for EXECUTING the specific workflow-config @_bmad/bmm/workflows/workflow-status/init/workflow.yaml
4. Pass the yaml path _bmad/bmm/workflows/workflow-status/init/workflow.yaml as 'workflow-config' parameter to the workflow.xml instructions
5. Follow workflow.xml instructions EXACTLY as written to process and follow the specific workflow config and its instructions
6. Save outputs after EACH section when generating any documents from templates
</steps>
