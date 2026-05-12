"""
merge_test_design.py
--------------------
Combina los 5 documentos shardeados de un test-design BMAD en un único archivo.

Estructura esperada:
    test-plan-YYYY-MM-DD-HHmmss/
        shards/
            test-design-phase1-gatekeeper.md
            test-design-phase2-fac.md
            test-design-phase3-blind-spots.md
            test-design-phase4-test-matrix.md
            test-design-phase5-tsr.md
        test-cases.csv
        test-design.md   ← generado aquí

Uso:
    python _siesa-agents/scripts/merge_test_design.py [ruta-carpeta]

Si no se pasa ruta-carpeta, usa la carpeta más reciente en:
    _bmad-output/implementation-artifacts/quality-process/planeacion/
"""

import sys
import os
import glob

PHASES = [
    "test-design-phase1-gatekeeper.md",
    "test-design-phase2-fac.md",
    "test-design-phase3-blind-spots.md",
    "test-design-phase4-test-matrix.md",
    "test-design-phase5-tsr.md",
]

SEPARATOR = "\n\n---\n\n"
OUTPUT_FILE = "test-design.md"


def find_latest_folder(base_dir: str):
    pattern = os.path.join(base_dir, "test-plan-*")
    candidates = sorted(glob.glob(pattern), reverse=True)
    return candidates[0] if candidates else None


def merge(folder_path: str) -> None:
    if not os.path.isdir(folder_path):
        print(f"ERROR: La carpeta no existe: {folder_path}")
        sys.exit(1)

    shards_dir = os.path.join(folder_path, "shards")
    if not os.path.isdir(shards_dir):
        print(f"ERROR: No se encontró la subcarpeta shards/ en: {folder_path}")
        sys.exit(1)

    sections = []
    missing = []

    for phase_file in PHASES:
        full_path = os.path.join(shards_dir, phase_file)
        if os.path.isfile(full_path):
            with open(full_path, encoding="utf-8") as f:
                sections.append(f.read().strip())
        else:
            missing.append(phase_file)
            print(f"  ⚠️  No encontrado: shards/{phase_file}")

    if not sections:
        print("ERROR: No se encontró ningún documento para combinar.")
        sys.exit(1)

    merged_content = SEPARATOR.join(sections)
    output_path = os.path.join(folder_path, OUTPUT_FILE)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(merged_content)

    total_lines = merged_content.count("\n") + 1
    print(f"✅ Documento generado: {output_path}")
    print(f"   Secciones incluidas : {len(sections)} de {len(PHASES)}")
    print(f"   Líneas totales      : {total_lines}")

    if missing:
        print(f"   Archivos omitidos   : {', '.join(missing)}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        target_folder = sys.argv[1]
    else:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.abspath(os.path.join(script_dir, "..", ".."))
        base_dir = os.path.join(
            project_root,
            "_bmad-output",
            "implementation-artifacts",
            "quality-process",
            "planeacion",
        )
        target_folder = find_latest_folder(base_dir)
        if not target_folder:
            print(f"ERROR: No se encontró ninguna carpeta test-plan-* en:\n  {base_dir}")
            sys.exit(1)
        print(f"📂 Usando carpeta más reciente: {target_folder}")

    merge(target_folder)
