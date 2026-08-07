#!/usr/bin/env python3
"""Ingere decisões de review a partir de um PR mergeado (comentários /avaliar-inline).

Heurísticas (sem LLM na v1):
- Resposta humana no thread com padrão de rejeição → rejeitado / nao-aplicavel
- Resposta humana ou thread resolvido + suggestion aplicada no merge → aceito
- Merge sem resposta e thread aberto → rejeitado (ignorado no merge)

Depois: append decisions.jsonl → compactar → promover → export exclusions.yaml
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_TOOLS = Path(__file__).resolve().parent


def _load_memoria():
    spec = importlib.util.spec_from_file_location(
        "review_memoria", _TOOLS / "review-memoria.py"
    )
    if spec is None or spec.loader is None:
        raise RuntimeError("review-memoria.py não encontrado")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_mem = _load_memoria()
SCHEMA_VERSION = _mem.SCHEMA_VERSION
build_context = _mem.build_context
cmd_promover = _mem.cmd_promover
read_decisions = _mem.read_decisions
review_dir = _mem.review_dir
slugify = _mem.slugify
write_context = _mem.write_context
write_decisions = _mem.write_decisions

INLINE_MARKER = re.compile(r"<!--\s*avaliar-inline:([^:]+):(\d+)\s*-->")
SUGGESTION_BLOCK = re.compile(r"```suggestion\s*\n([\s\S]*?)```", re.MULTILINE)
BOT_LOGINS = frozenset({"github-actions", "github-actions[bot]", "dependabot[bot]"})

REJECT_PATTERNS = re.compile(
    r"intencional|won'?t fix|wont fix|n[aã]o se aplica|nao se aplica|false positive|"
    r"falso positivo|pode ignorar|ignorar|rejeit|decline|deixa assim|sem necessidade|"
    r"n[aã]o precisa|nao precisa|descart",
    re.IGNORECASE,
)
NAO_APLICAVEL_PATTERNS = re.compile(
    r"s[oó] preview|so preview|s[oó] editor|so editor|edge case|raro no preview|"
    r"n[aã]o afeta produ|nao afeta produ|fora do escopo",
    re.IGNORECASE,
)
ACCEPT_PATTERNS = re.compile(
    r"corrigido|fixed|feito|resolvido|applied|aceito|ok|done|merged fix",
    re.IGNORECASE,
)


def run_gh(args: list[str]) -> Any:
    proc = subprocess.run(
        ["gh", *args],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(proc.stdout or "null")


def parse_repo(repository: str) -> tuple[str, str]:
    owner, _, name = repository.partition("/")
    if not owner or not name:
        raise SystemExit(f"Repositório inválido: {repository}")
    return owner, name


def fetch_pr_threads(owner: str, repo: str, pr_number: int) -> dict[str, Any]:
    query = """
query($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) {
      merged
      mergedAt
      mergeCommit { oid }
      title
      reviewThreads(first: 100) {
        nodes {
          isResolved
          comments(first: 30) {
            nodes {
              body
              path
              line
              originalLine
              author { login }
            }
          }
        }
      }
    }
  }
}
"""
    data = run_gh(
        [
            "api",
            "graphql",
            "-f",
            f"query={query}",
            "-f",
            f"owner={owner}",
            "-f",
            f"repo={repo}",
            "-F",
            f"number={pr_number}",
        ]
    )
    pr = data.get("data", {}).get("repository", {}).get("pullRequest")
    if not pr:
        raise SystemExit(f"PR #{pr_number} não encontrado em {owner}/{repo}")
    return pr


def extract_summary(body: str) -> str:
    for line in body.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("<!--"):
            continue
        return stripped[:240]
    return "achado /avaliar"


def normalize_snippet(code: str) -> str:
    lines = [ln.rstrip() for ln in code.replace("\r\n", "\n").split("\n")]
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    return "\n".join(ln.strip() for ln in lines if ln.strip())


def git_show(project: Path, sha: str, file_path: str) -> str:
    proc = subprocess.run(
        ["git", "-C", str(project), "show", f"{sha}:{file_path}"],
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        return ""
    return proc.stdout


def snippet_in_file(file_content: str, snippet: str, hint_line: int) -> bool:
    norm = normalize_snippet(snippet)
    if not norm:
        return False
    lines = file_content.splitlines()
    parts = norm.split("\n")
    n = len(parts)
    if n == 0 or not lines:
        return False
    best = False
    for i in range(len(lines) - n + 1):
        window = "\n".join(lines[i : i + n]).strip()
        if window == norm or all(parts[j] in lines[i + j] for j in range(n)):
            best = True
            break
    if best:
        return True
    # fallback: substring anywhere
    return norm in file_content


def classify_thread(
    thread: dict[str, Any],
    merged: bool,
    merge_oid: str,
    project: Path,
    pr_number: int,
) -> dict[str, Any] | None:
    nodes = thread.get("comments", {}).get("nodes") or []
    if not nodes:
        return None
    root = nodes[0]
    body = root.get("body") or ""
    if "avaliar-inline:" not in body:
        return None

    marker = INLINE_MARKER.search(body)
    file_path = marker.group(1) if marker else (root.get("path") or "")
    line = int(marker.group(2)) if marker else int(root.get("line") or root.get("originalLine") or 1)
    summary = extract_summary(body)
    suggestion = SUGGESTION_BLOCK.search(body)
    para = suggestion.group(1) if suggestion else ""

    human = [
        c
        for c in nodes[1:]
        if (c.get("author") or {}).get("login") not in BOT_LOGINS
    ]

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    base = {
        "schema": SCHEMA_VERSION,
        "finalized_at": now,
        "review_slug": f"pr-{pr_number}",
        "file": file_path,
        "finding_id": slugify(summary),
        "line": line,
        "category": "pr-ingest",
        "summary": summary,
        "source": f"github-pr-{pr_number}",
    }

    for reply in human:
        text = reply.get("body") or ""
        if NAO_APLICAVEL_PATTERNS.search(text):
            return {
                **base,
                "decision": "nao-aplicavel",
                "reason": text.strip()[:200],
            }
        if REJECT_PATTERNS.search(text):
            return {
                **base,
                "decision": "rejeitado",
                "reason": text.strip()[:200],
            }
        if ACCEPT_PATTERNS.search(text):
            return {
                **base,
                "decision": "aceito",
                "reason": text.strip()[:200] or "confirmado no thread",
            }

    if not merged:
        return None

    file_content = git_show(project, merge_oid, file_path) if file_path and merge_oid else ""

    if para and file_content and snippet_in_file(file_content, para, line):
        return {
            **base,
            "decision": "aceito",
            "reason": "suggestion / Para aplicada no merge",
        }

    if thread.get("isResolved") and file_content and para:
        return {
            **base,
            "decision": "aceito",
            "reason": "thread resolvido no PR",
        }

    if thread.get("isResolved") and not human:
        return {
            **base,
            "decision": "aceito",
            "reason": "thread resolvido sem objeção",
        }

    if human:
        return None

    return {
        **base,
        "decision": "rejeitado",
        "reason": "merge sem resposta no thread — achado ignorado",
    }


def append_unique(decisions_path: Path, new_items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    existing = read_decisions(decisions_path)
    seen = {(d.get("finding_id"), d.get("file"), d.get("source")) for d in existing}
    added: list[dict[str, Any]] = []
    for item in new_items:
        key = (item.get("finding_id"), item.get("file"), item.get("source"))
        if key in seen:
            continue
        existing.append(item)
        seen.add(key)
        added.append(item)
    write_decisions(decisions_path, existing)
    return added


def run_export_exclusions(project: Path) -> None:
    script = _TOOLS / "review-export-exclusions.sh"
    subprocess.run(["bash", str(script), str(project)], check=True)


def cmd_ingest(
    project: Path,
    pr_number: int,
    repository: str,
    write: bool,
    promote_all: bool,
) -> int:
    owner, repo = parse_repo(repository)
    pr = fetch_pr_threads(owner, repo, pr_number)

    if not pr.get("merged"):
        print(f"PR #{pr_number} não foi mergeado — nada a ingerir.")
        return 0

    merge_oid = (pr.get("mergeCommit") or {}).get("oid") or ""
    threads = (pr.get("reviewThreads") or {}).get("nodes") or []

    proposed: list[dict[str, Any]] = []
    for thread in threads:
        decision = classify_thread(thread, True, merge_oid, project, pr_number)
        if decision:
            proposed.append(decision)

    print(f"=== ingest PR #{pr_number} ({owner}/{repo}) ===")
    print(f"Merge: {merge_oid[:7] if merge_oid else '?'}")
    print(f"Threads /avaliar: {len(proposed)} decisão(ões) proposta(s)")
    print("")

    for d in proposed:
        print(f"  [{d['decision']}] {d.get('file') or '?'}:{d.get('line')} — {d.get('summary', '')[:70]}")

    if not proposed:
        print("\nNenhuma decisão nova.")
        return 0

    if not write:
        print("\nDry-run. Use --write para gravar decisions + compactar + promover + export.")
        return 0

    rd = review_dir(project)
    rd.mkdir(parents=True, exist_ok=True)
    version = rd / ".memoria-version"
    if not version.is_file():
        version.write_text("2\n", encoding="utf-8")

    decisions_path = rd / "decisions.jsonl"
    added = append_unique(decisions_path, proposed)
    print(f"\n+{len(added)} entrada(s) em decisions.jsonl")

    all_decisions = read_decisions(decisions_path)
    context = build_context(project, f"github-pr-{pr_number}", all_decisions)
    write_context(rd, context)
    print("context.yaml atualizado")

    prom_args = argparse.Namespace(write=True, all=promote_all, project=str(project))
    # cmd_promover expects write flag via function args
    cmd_promover(project, write=True, all_candidates=promote_all)

    run_export_exclusions(project)
    print("exclusions.yaml exportado")
    print("\nPróximo: commit .cursor/review/convencoes.md + exclusions.yaml (+ decisions se versionado)")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Ingere decisões de PR mergeado → memória v2")
    parser.add_argument("pr_number", type=int, help="Número do PR mergeado")
    parser.add_argument("--project", default=".", help="Raiz do repo alvo")
    parser.add_argument("--repo", default="", help="owner/name (default: gh repo view)")
    parser.add_argument("--write", action="store_true", help="Persistir memória")
    parser.add_argument(
        "--all",
        action="store_true",
        help="Promover candidates com 1 ocorrência (default: ≥2)",
    )
    args = parser.parse_args()

    project = Path(args.project).resolve()
    repository = args.repo.strip()
    if not repository:
        proc = subprocess.run(
            ["gh", "repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"],
            cwd=project,
            capture_output=True,
            text=True,
            check=True,
        )
        repository = proc.stdout.strip()

    return cmd_ingest(project, args.pr_number, repository, args.write, args.all)


if __name__ == "__main__":
    sys.exit(main())
