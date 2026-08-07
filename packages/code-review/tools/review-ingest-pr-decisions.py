#!/usr/bin/env python3
"""Ingere decisões de review a partir de um PR mergeado (comentários /avaliar-inline).

Heurísticas (sem LLM na v1):
- Resposta humana rejeitando o achado → rejeitado / nao-aplicavel → exclusions.yaml
- Resposta humana sem objeção (incl. vazia ou neutra) → aceito → candidate → convencoes.md (≥2×)
- Fix aplicado no merge (suggestion / De / intra-PR) sem reply → aceito
- Merge sem reply e achado ainda presente → rejeitado → exclusions.yaml

Depois: append decisions-ingest.jsonl → compactar → promover → export exclusions.yaml
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
DECISIONS_INGEST_FILE = _mem.DECISIONS_INGEST_FILE
build_context = _mem.build_context
cmd_promover = _mem.cmd_promover
decisions_ingest_path = _mem.decisions_ingest_path
read_decisions = _mem.read_decisions
review_dir = _mem.review_dir
slugify = _mem.slugify
stable_finding_id = _mem.stable_finding_id
extract_finding_theme = _mem.extract_finding_theme
write_context = _mem.write_context
write_decisions = _mem.write_decisions

INLINE_MARKER = re.compile(
    r"<!--\s*avaliar-inline:([^:]+):(\d+)(?::fid:([a-z0-9-]+))?\s*-->"
)
SUGGESTION_BLOCK = re.compile(r"```suggestion\s*\n([\s\S]*?)```", re.MULTILINE)
MD_DE_PARA_BLOCK = re.compile(
    r"\*\*(De|Para):\*\*\s*\n+```(?:\w+)?\s*\n([\s\S]*?)```",
    re.MULTILINE,
)
BACKTICK_CODE = re.compile(r"`([^`]+)`")
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


def extract_de_para_from_body(body: str) -> tuple[str, str]:
    de = ""
    para = ""
    for match in MD_DE_PARA_BLOCK.finditer(body):
        label, code = match.group(1), match.group(2)
        if label == "De":
            de = code
        else:
            para = code
    suggestion = SUGGESTION_BLOCK.search(body)
    if suggestion:
        para = para or suggestion.group(1)
    return de, para


def extract_code_indicators(body: str) -> list[str]:
    indicators: list[str] = []
    for match in BACKTICK_CODE.finditer(body):
        token = match.group(1).strip()
        if len(token) < 3:
            continue
        if token not in indicators:
            indicators.append(token)
    return indicators


def git_rev_parse(project: Path, ref: str) -> str:
    proc = subprocess.run(
        ["git", "-C", str(project), "rev-parse", ref],
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        return ""
    return proc.stdout.strip()


def resolve_pr_commit_range(
    project: Path,
    pr: dict[str, Any],
    merge_oid: str,
) -> tuple[str, str]:
    head_oid = git_rev_parse(project, f"{merge_oid}^2")
    base_oid = git_rev_parse(project, f"{merge_oid}^1")
    if head_oid and base_oid:
        return base_oid, head_oid

    base_oid = (pr.get("baseRefOid") or "").strip()
    head_oid = (pr.get("headRefOid") or "").strip()
    if base_oid and head_oid:
        return base_oid, head_oid

    return base_oid or merge_oid, head_oid or merge_oid


def git_log_commits(project: Path, base_oid: str, head_oid: str) -> list[str]:
    if not base_oid or not head_oid or base_oid == head_oid:
        return [head_oid] if head_oid else []
    proc = subprocess.run(
        ["git", "-C", str(project), "rev-list", "--reverse", f"{base_oid}..{head_oid}"],
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        return []
    return [sha for sha in proc.stdout.splitlines() if sha.strip()]


def snippet_ever_in_commit_range(
    project: Path,
    base_oid: str,
    head_oid: str,
    file_path: str,
    snippet: str,
    hint_line: int = 1,
) -> bool:
    norm = normalize_snippet(snippet)
    if not norm or not file_path:
        return False
    commits = git_log_commits(project, base_oid, head_oid)
    if not commits and head_oid:
        commits = [head_oid]
    for sha in commits:
        content = git_show(project, sha, file_path)
        if content and snippet_in_file(content, norm, hint_line):
            return True
    return False


def fix_applied_in_pr(
    project: Path,
    *,
    base_oid: str,
    head_oid: str,
    merge_oid: str,
    file_path: str,
    line: int,
    de_code: str,
    para_code: str,
    body: str,
) -> tuple[bool, str]:
    file_merge = git_show(project, merge_oid, file_path) if merge_oid else ""
    if not file_merge and head_oid:
        file_merge = git_show(project, head_oid, file_path)

    if para_code and file_merge and snippet_in_file(file_merge, para_code, line):
        return True, "suggestion / Para aplicada no merge"

    if de_code and file_merge:
        if not snippet_in_file(file_merge, de_code, line) and snippet_ever_in_commit_range(
            project, base_oid, head_oid, file_path, de_code, line
        ):
            return True, "código De removido ou corrigido no PR"

    for indicator in extract_code_indicators(body):
        if file_merge and indicator in file_merge:
            continue
        if snippet_ever_in_commit_range(
            project, base_oid, head_oid, file_path, indicator, line
        ):
            return True, f"indicador `{indicator}` removido no PR"

    return False, ""


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
    base_oid: str,
    head_oid: str,
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
    marker_fid = marker.group(3) if marker else None
    raw_summary = extract_summary(body)
    summary = extract_finding_theme(raw_summary)
    de_code, para_code = extract_de_para_from_body(body)

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
        "finding_id": marker_fid or stable_finding_id(raw_summary),
        "line": line,
        "category": "pr-ingest",
        "summary": summary,
        "source": f"github-pr-{pr_number}",
    }

    human_reason = ""
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
        if text.strip() and not human_reason:
            human_reason = text.strip()[:200]

    # Qualquer reply humano que não rejeitou → aceito (comentário vazio = sem objeção)
    if human:
        return {
            **base,
            "decision": "aceito",
            "reason": human_reason or "resposta humana no thread (sem objeção)",
        }

    if not merged:
        return None

    applied, applied_reason = fix_applied_in_pr(
        project,
        base_oid=base_oid,
        head_oid=head_oid,
        merge_oid=merge_oid,
        file_path=file_path,
        line=line,
        de_code=de_code,
        para_code=para_code,
        body=body,
    )
    if applied:
        return {
            **base,
            "decision": "aceito",
            "reason": applied_reason,
        }

    file_content = git_show(project, merge_oid, file_path) if file_path and merge_oid else ""

    if thread.get("isResolved") and file_content and para_code:
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

    return {
        **base,
        "decision": "rejeitado",
        "reason": "merge sem resposta no thread — achado ignorado",
    }


def upsert_pr_decisions(
    decisions_path: Path,
    pr_number: int,
    new_items: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    source = f"github-pr-{pr_number}"
    existing = [d for d in read_decisions(decisions_path) if d.get("source") != source]
    normalized_new: list[dict[str, Any]] = []
    for item in new_items:
        row = dict(item)
        summary = row.get("summary", "")
        if summary:
            theme = extract_finding_theme(summary)
            row["summary"] = theme
            row["finding_id"] = stable_finding_id(theme)
        normalized_new.append(row)
    existing.extend(normalized_new)
    normalized_all: list[dict[str, Any]] = []
    for item in existing:
        row = dict(item)
        summary = row.get("summary", "")
        if summary:
            theme = extract_finding_theme(summary)
            row["summary"] = theme
            row["finding_id"] = stable_finding_id(theme)
        normalized_all.append(row)
    write_decisions(decisions_path, normalized_all)
    return normalized_new


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

    prom_args = argparse.Namespace(write=True, all=promote_all, project=str(project))
    # cmd_promover expects write flag via function args
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
