# 5-Documentation Phase - BMM Module

**Phase:** Documentation
**Module:** BMM (Build & Management Module)
**Purpose:** Workflows for generating user documentation, API documentation, technical guides, and other end-user/developer documentation artifacts from project artifacts (PRDs, Epics, Architecture, Stories)

---

## Overview

La fase **5-documentation** contiene workflows especializados en la generación de documentación técnica y de usuario a partir de artefactos de proyecto existentes. Estos workflows automatizan la creación de guías comprehensivas, asegurando consistencia, trazabilidad y calidad en la documentación producida.

---

## Workflows Disponibles

### 📚 create-user-guide

**Ruta:** `_bmad/bmm/workflows/5-documentation/create-user-guide/`
**Comando:** `/bmad:bmm:workflows:create-user-guide`
**Versión:** 1.0.0

#### Descripción

Genera guías de usuario en español desde features del proyecto (archivos individuales `prd/feature-*.md` + `epics/epic-*.md`), con diagramas Mermaid, screenshot placeholders y trazabilidad `[Source: FX Story Y.Z]`.

#### Características Principales

- ✅ **Salida en Español:** Archivo único por audiencia, actualizable con nuevos features
- ✅ **Diagramas Mermaid:** Incluye diagramas para cada feature y workflow
- ✅ **Screenshot Placeholders:** Sistema estructurado de placeholders con índice
- ✅ **Trazabilidad:** Citaciones a épicas y stories de origen
- ✅ **Continuación:** Soporte para resumir workflows interrumpidos
- ✅ **Enfocado en Features:** Lee `prd/feature-*.md` + `epics/epic-*.md` por feature seleccionada

#### Estructura de Archivos (15 archivos)

```
create-user-guide/
├── workflow.md                              # Entry point del workflow
├── workflow-plan-create-user-guide.md       # Documento de planificación
│
├── steps/                                   # 8 step files
│   ├── step-01-init.md                     # Inicialización + detección continuación
│   ├── step-01b-continue.md                # Reanudación de workflow
│   ├── step-02-seleccion-epicas.md         # Selección de épicas (PRESCRIPTIVE)
│   ├── step-03-analisis-fuentes.md         # Análisis de artefactos (INTENT-BASED)
│   ├── step-04-elicitacion.md              # Elicitación de info (INTENT-BASED)
│   ├── step-05-generacion-espanol.md       # Generación español (PRESCRIPTIVE)
│   ├── step-06-traduccion-ingles.md        # Traducción inglés (PRESCRIPTIVE)
│   └── step-07-validacion-guardado.md      # Validación final (PRESCRIPTIVE)
│
├── templates/                               # 2 templates bilingües
│   ├── user-guide-template-es.md           # Template español con frontmatter
│   └── user-guide-template-en.md           # Template inglés con frontmatter
│
└── data/                                    # 3 CSV data files
    ├── audience-types.csv                  # 4 tipos de audiencia
    ├── diagram-types.csv                   # 5 tipos de diagramas Mermaid
    └── section-structure.csv               # 9 secciones de guía

```

#### Flujo del Workflow (8 pasos)

1. **step-01-init** → Inicialización y configuración de audiencia
   - Detecta workflows existentes
   - Configura audiencia (enduser/admin/api/mixed)
   - Crea documento inicial con frontmatter

2. **step-01b-continue** → Continuación (si aplica)
   - Carga estado guardado
   - Resume desde último paso completado

3. **step-02-seleccion-epicas** → Selección de Features
   - Escanea `planning_artifacts/prd/feature-*.md`
   - Usuario selecciona qué features documentar
   - Verifica existencia de épica correspondiente por feature
   - Registra selección en frontmatter (`features_selected`)

4. **step-03-analisis-fuentes** → Análisis de Features
   - Por cada feature: lee `prd/feature-*.md` (descripción, FRs, key behaviors)
   - Si existe: lee `epics/epic-*.md` (historias, GWT, acceptance criteria)
   - Lee contexto general (goals.md, background-context.md)
   - Genera sección "Contexto del Proyecto"

5. **step-04-elicitacion** → Elicitación de preferencias
   - Conversación para capturar nivel técnico
   - Escenarios adicionales
   - Features a excluir

6. **step-05-generacion-espanol** → Generación en español
   - Genera 9 secciones completas
   - Incluye diagramas Mermaid para cada feature
   - Agrega screenshot placeholders
   - Cita fuentes `[Source: FX Story Y.Z]`

7. **step-06-traduccion-ingles** → ⛔ DESHABILITADO
   - Paso conservado como referencia pero no se ejecuta
   - El workflow salta directamente a step-07

8. **step-07-validacion-guardado** → Validación y guardado
   - Ejecuta TOP 5 validaciones
   - Presenta resultados al usuario
   - Permite loop a step-05 para correcciones
   - Guarda ambas versiones + index.md

#### Datos Estructurados

**audience-types.csv** (4 tipos de audiencia)
```csv
audience_id,audience_name_es,audience_name_en,description_es,description_en,filename_prefix
enduser,Usuarios Finales,End Users,...,enduser-guide
admin,Administradores,Administrators,...,admin-guide
api,Consumidores de API,API Consumers,...,api-guide
mixed,Audiencia Mixta,Mixed Audience,...,complete-guide
```

**diagram-types.csv** (5 tipos de diagramas)
```csv
content_type,diagram_type,mermaid_syntax,use_case_es,use_case_en
feature_overview,flowchart,"flowchart LR",...
user_workflow,flowchart,"flowchart TD",...
sequential_process,sequenceDiagram,...
state_changes,stateDiagram-v2,...
user_journey,journey,...
```

**section-structure.csv** (9 secciones)
```csv
section_id,section_name_es,section_name_en,description,required
1,Introducción,Introduction,...,true
2,Primeros Pasos,Getting Started,...,true
3,Conceptos Clave,Core Concepts,...,true
4,Funcionalidades,Features and How to Use Them,...,true
5,Flujos de Trabajo,Common Workflows,...,true
6,Solución de Problemas,Troubleshooting,...,false
7,Preguntas Frecuentes,FAQ,...,true
8,Glosario,Glossary,...,true
9,Índice de Capturas,Screenshot Index,...,true
```

#### Criterios de Validación (TOP 5)

1. **📄 Bilingual Output Completo** - Ambas versiones existen con estructura idéntica
2. **🔗 Source Citations Obligatorias** - Cada feature tiene citación de origen
3. **📊 Diagramas Mermaid Completos** - Cada feature/workflow tiene diagrama
4. **📸 Screenshot Placeholders Presentes** - Formato correcto + índice
5. **✅ Self-Check Pasado** - Completeness >= 90%, sin TODOs

#### Output Generado

**Ubicación:** `docs/user-guide/`

```
docs/user-guide/
├── index.md                          # Selector de idioma
├── es/
│   └── {audience}-guide.md          # Guía en español
└── en/
    └── {audience}-guide.md          # Guía en inglés
```

Donde `{audience}` = `enduser-guide` | `admin-guide` | `api-guide` | `complete-guide`

#### Patrones de Interacción

- **PRESCRIPTIVE Steps** (01, 02, 05, 06, 07): Instrucciones exactas, ejecución paso a paso
- **INTENT-BASED Steps** (03, 04): Objetivo claro, libertad de implementación
- **Collaboration Level:** 40% user input / 60% autonomous generation

#### Tecnologías Utilizadas

- Mermaid.js para diagramas
- Markdown con frontmatter YAML
- CSV para datos estructurados
- Sistema de templates bilingües

---

## Estadísticas de la Fase

| Métrica | Valor |
|---------|-------|
| Total Workflows | 1 |
| Total Archivos | 15 |
| Step Files | 8 |
| Templates | 2 |
| Data Files | 3 |
| Idiomas Soportados | 2 (ES/EN) |

---

## Uso

Para ejecutar el workflow create-user-guide:

```bash
/bmad:bmm:workflows:create-user-guide
```

O mediante Skill tool:
```bash
bmad:bmm:workflows:create-user-guide
```

---

## Arquitectura

Todos los workflows en esta fase utilizan **step-file architecture**:

- **Micro-file Design**: Cada step es autocontenido
- **Just-In-Time Loading**: Solo el step actual en memoria
- **Sequential Enforcement**: Secuencia estricta sin optimizaciones
- **State Tracking**: Progreso en frontmatter `stepsCompleted`
- **Append-Only Building**: Construcción incremental de documentos

---

## Próximos Workflows (Planificados)

- `create-api-docs` - Generación de documentación API desde arquitectura
- `create-tech-guide` - Guías técnicas para desarrolladores
- `create-deployment-guide` - Documentación de deployment y operaciones
- `update-documentation` - Actualización de docs existentes con cambios

---

## Metadatos

**Última Actualización:** 2026-01-14
**Creado Por:** BMAD Module Builder Workflow
**Versión BMAD:** 6.0
**Módulo:** BMM (Build & Management Module)
