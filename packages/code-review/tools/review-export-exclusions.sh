#!/usr/bin/env bash
# Exporta exclusions versionáveis a partir de context.yaml local.
# Uso: review-export-exclusions.sh [project-dir]
set -euo pipefail

PROJECT="${1:-.}"
CONTEXT="$PROJECT/.cursor/review/context.yaml"
OUT="$PROJECT/.cursor/review/exclusions.yaml"

if [[ ! -f "$CONTEXT" ]]; then
  echo "Erro: $CONTEXT não encontrado." >&2
  echo "Rode no projeto com memória v2 ou crie exclusions.yaml manualmente." >&2
  exit 1
fi

python3 - "$CONTEXT" "$OUT" <<'PY'
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.stderr.write("Erro: pip install pyyaml\n")
    sys.exit(1)

context_path = Path(sys.argv[1])
out_path = Path(sys.argv[2])
data = yaml.safe_load(context_path.read_text()) or {}
raw = data.get("exclusions") or []

items = []
for item in raw:
    if not isinstance(item, dict):
        continue
    decision = str(item.get("decision", "")).strip()
    if decision not in ("rejeitado", "nao-aplicavel"):
        continue
    entry = {
        "scope": item.get("scope", "**/*"),
        "decision": decision,
        "reason": item.get("reason", "").strip(),
    }
    if item.get("id"):
        entry["id"] = item["id"]
    if entry["reason"]:
        items.append(entry)

header = """# Exclusões versionadas — usadas pelo /avaliar automático (CI)
# Gerado por: review-export-exclusions.sh a partir de context.yaml
# Promover: rode export após /memoria compactar e commit deste arquivo.

"""
out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(
    header + yaml.safe_dump({"exclusions": items}, allow_unicode=True, sort_keys=False),
    encoding="utf-8",
)
print(f"Exportado: {out_path} ({len(items)} exclusões)")
PY
