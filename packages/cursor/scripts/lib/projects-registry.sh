#!/usr/bin/env bash
# Registro de projetos ligados ao hostdime-ia

REGISTRY_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-ia"
REGISTRY_FILE="$REGISTRY_DIR/projects.json"

_registry_ensure() {
  mkdir -p "$REGISTRY_DIR"
  if [[ ! -f "$REGISTRY_FILE" ]]; then
    echo '{"projects":[]}' >"$REGISTRY_FILE"
  fi
}

register_project() {
  local path="$1"
  _registry_ensure
  python3 -c "
import json, os, sys
from datetime import datetime, timezone

path = os.path.realpath(sys.argv[1])
registry = sys.argv[2]
now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

with open(registry, 'r', encoding='utf-8') as f:
    data = json.load(f)

projects = data.get('projects', [])
found = False
for p in projects:
    if os.path.realpath(p.get('path', '')) == path:
        p['lastLinked'] = now
        found = True
        break

if not found:
    projects.append({'path': path, 'firstLinked': now, 'lastLinked': now})

data['projects'] = projects
with open(registry, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
" "$path" "$REGISTRY_FILE"
}

list_projects() {
  _registry_ensure
  python3 -c "
import json, sys
with open(sys.argv[1], 'r', encoding='utf-8') as f:
    data = json.load(f)
for p in data.get('projects', []):
    print(p.get('path', ''))
" "$REGISTRY_FILE"
}

unregister_project() {
  local path="$1"
  _registry_ensure
  python3 -c "
import json, os, sys

path = os.path.realpath(sys.argv[1])
registry = sys.argv[2]

with open(registry, 'r', encoding='utf-8') as f:
    data = json.load(f)

before = len(data.get('projects', []))
data['projects'] = [
    p for p in data.get('projects', [])
    if os.path.realpath(p.get('path', '')) != path
]
after = len(data['projects'])

with open(registry, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)
    f.write('\n')

sys.exit(0 if before > after else 1)
" "$path" "$REGISTRY_FILE"
}

prune_missing_projects() {
  _registry_ensure
  python3 -c "
import json, os, sys

registry = sys.argv[1]
with open(registry, 'r', encoding='utf-8') as f:
    data = json.load(f)

kept = []
for p in data.get('projects', []):
    path = p.get('path', '')
    if path and os.path.isdir(path):
        kept.append(p)

data['projects'] = kept
with open(registry, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
" "$REGISTRY_FILE"
}
