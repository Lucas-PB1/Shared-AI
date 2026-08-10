#!/usr/bin/env python3
"""Ingere decisões de review a partir de um PR mergeado (comentários /avaliar-inline).

Heurísticas (ver lib/ingest_decisions.py):
- Resposta humana rejeitando o achado → rejeitado / nao-aplicavel → exclusions.yaml
- Resposta humana sem objeção → aceito → candidate → convencoes.md (≥2×)
- Fix aplicado no merge (suggestion / De / intra-PR) sem reply → aceito
- Merge sem reply e achado ainda presente → rejeitado → exclusions.yaml

CLI + I/O (gh/git). Regras puras em lib.ingest_decisions.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

_TOOLS = Path(__file__).resolve().parent
if str(_TOOLS) not in sys.path:
    sys.path.insert(0, str(_TOOLS))

from lib.ingest_decisions import (  # noqa: E402
    classify_thread,
    extract_de_para_from_body,
    extract_summary,
    parse_repo,
    resolve_pr_commit_range,
    upsert_pr_decisions,
)


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
DECISIONS_INGEST_FILE = _mem.DECISIONS_INGEST_FILE
build_context = _mem.build_context
cmd_promover = _mem.cmd_promover
decisions_ingest_path = _mem.decisions_ingest_path
read_decisions = _mem.read_decisions
review_dir = _mem.review_dir
write_context = _mem.write_context


def run_gh(args: list[str]) -> Any:
    proc = subprocess.run(
        ["gh", *args],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(proc.stdout or "null")


def fetch_pr_threads(owner: str, repo: str, pr_number: int) -> dict[str, Any]:
    query = """
query($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) {
      merged
      mergedAt
      baseRefOid
      headRefOid
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
              commit { oid }
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
    try:
        owner, repo = parse_repo(repository)
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc

    pr = fetch_pr_threads(owner, repo, pr_number)

    if not pr.get("merged"):
        print(f"PR #{pr_number} não foi mergeado — nada a ingerir.")
        return 0

    merge_oid = (pr.get("mergeCommit") or {}).get("oid") or ""
    base_oid, head_oid = resolve_pr_commit_range(project, pr, merge_oid)
    threads = (pr.get("reviewThreads") or {}).get("nodes") or []

    proposed: list[dict[str, Any]] = []
    for thread in threads:
        decision = classify_thread(
            thread, True, merge_oid, base_oid, head_oid, project, pr_number
        )
        if decision:
            proposed.append(decision)

    print(f"=== ingest PR #{pr_number} ({owner}/{repo}) ===")
    print(f"Merge: {merge_oid[:7] if merge_oid else '?'}")
    print(f"Threads /avaliar: {len(proposed)} decisão(ões) proposta(s)")
    print("")

    for d in proposed:
        print(
            f"  [{d['decision']}] {d.get('file') or '?'}:{d.get('line')} — "
            f"{d.get('summary', '')[:70]}"
        )

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

    decisions_path = decisions_ingest_path(project)
    added = upsert_pr_decisions(decisions_path, pr_number, proposed)
    print(
        f"\n{len(added)} decisão(ões) gravada(s) em {DECISIONS_INGEST_FILE} "
        f"(source github-pr-{pr_number})"
    )

    all_decisions = read_decisions(decisions_path)
    context = build_context(project, f"github-pr-{pr_number}", all_decisions)
    write_context(rd, context)
    print("context.yaml atualizado")

    cmd_promover(project, write=True, all_candidates=promote_all)

    run_export_exclusions(project)
    print("exclusions.yaml exportado")
    print(
        "\nPróximo: commit .cursor/review/decisions-ingest.jsonl + "
        "convencoes.md + exclusions.yaml"
    )
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
