# Protocolo de Git: Creación de Ramas y Commits - SiesaTeams

Este documento establece el flujo obligatorio para la creación de ramas y el estándar de mensajes de commit para asegurar el cumplimiento de la gobernanza.

---

## 1. Validación de Rama Padre (Feature)
Para cualquier desarrollo de funcionalidad (**feature**), la rama de origen debe ser estrictamente `develop`.

**Procedimiento del Agente:**
1. Validar que se encuentra en: `develop`.
2. Ejecutar: `git checkout develop && git pull origin develop`.
3. Confirmar que no hay cambios pendientes antes de ramificar.

---

## 2. Nomenclatura de la Rama y worktree
La estructura del nombre debe seguir el formato:
`rama-padre-team-owner-rq-descripcion`.

Identificar el folder actual para usarlo en la generacion del worktree de la siguiente manera:
`git worktree add ../wt-{folder-name}/{folder-name}-{branch-name} -b {branch-name}`

**Parámetros Sugeridos:**
* **Rama Padre:** `develop`.
* **Team:** (Debe coincidir con un prefijo válido, ej: `legacy-erp-nomina`).
* **Owner:** `gaduranb` (Basado en el correo corporativo gaduranb@siesa.com).
* **RQ:** Número de requerimiento asignado.
* **Descripción:** Breve, en minúsculas y con guiones.

**Ejemplo de comando:**
`git worktree ../wt-erp-nomina/erp-nomina-develop-legacy-erp-nomina-gaduranb-rq1234-nueva-interfaz -b develop-legacy-erp-nomina-gaduranb-rq1234-nueva-interfaz`.

---

## 3. Estándar de Mensajes de Commit
Se adopta el formato de **Conventional Commits** para mejorar la legibilidad y automatización.

| Tipo | Formato del Mensaje | Uso |
| :--- | :--- | :--- |
| **Feature** | `feat: descripción clara del cambio` | Nuevas funcionalidades. |
| **Fix** | `fix: descripción del error corregido` | Corrección de errores (bugs). |

**Ejemplos:**
* `git commit -m "feat: implementar validación de identidad mediante SSO"`.
* `git commit -m "fix: corregir cálculo de nómina en rama legacy"`.

---
## 4. Cambio de ramas
Para cambiar de rama se debe rastrear primero la ruta de la misma usando el listado del worktree `git worktree list`, una vez obtenida la ruta se cambia a la carpeta especifica de la rama que se necesita.

**Ejemplo de comando:**
comando:
`git worktree list`

resultado:
`C:/labs/siesaAgentsAlpha/siesaAgentsAlpha   7136248 [develop]`
`C:/labs/siesaAgentsAlpha/wt-erp-nomina/erp-nomina-develop-legacy-erp-nomina-gaduranb-rq1234-nueva-interfaz  86ed4a7 [develop-legacy-erp-nomina-gaduranb-rq1234-nueva-interfaz]`
`C:/labs/siesaAgentsAlpha/wt-erp-nomina/erp-nomina-develop-legacy-gaduranb-rq1235-metodos   d0ddac7 [develop-legacy-gaduranb-rq1235-metodos]`

cambio de rama:
`cd ../wt-erp-nomina/erp-nomina-develop-legacy-gaduranb-rq1235-metodos`

---
## 5. Reglas de Oro de Gobernanza
* **Todo en Minúsculas:** Los nombres de ramas y repositorios no deben contener mayúsculas.
* **Protección de Ramas:** `main` y `develop` están protegidas; el push directo está prohibido.
* **Cuando realizar commit** Los commits deberan hacerce por historia en el code review, especificamente cuando este en status done la historia.
* **Generacion de ramas** Las ramas se deben generar por epicas o por features nunca por historia.
* **Nota:** Esta automatización solo podrá crear las ramas como se indica y realizar push a las mismas en caso de ser necesario.