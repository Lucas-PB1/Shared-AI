#!/usr/bin/env python3
"""Smoke unitário do ingest (sem gh / rede).

Delega ao unittest de lib; mantém entrypoint curto para npm test / smoke.
Uso: python3 tests/smoke_review_ingest.py
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UNIT = ROOT / "packages" / "code-review" / "tools" / "tests" / "test_ingest_and_ids.py"


def main() -> int:
    proc = subprocess.run(
        [sys.executable, str(UNIT)],
        cwd=str(ROOT),
        check=False,
    )
    if proc.returncode == 0:
        print("smoke_review_ingest: OK")
    return proc.returncode


if __name__ == "__main__":
    raise SystemExit(main())
