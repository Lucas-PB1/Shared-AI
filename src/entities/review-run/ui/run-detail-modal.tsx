'use client';

import { useEffect, useState } from 'react';

import type { Decision, Project, ReviewRun } from '@/entities/project';
import { loadRunDecisions } from '@/entities/review-run/actions';
import { RunArtifactsSummary } from '@/entities/review-run/ui/run-artifacts-panel';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

export function RunDetailModal({
  project,
  run,
  open,
  onOpenChange,
}: {
  project: Project;
  run: ReviewRun | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [decisions, setDecisions] = useState<Decision[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !run) {
      setDecisions(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setDecisions(null);

    loadRunDecisions(run.id)
      .then((data) => {
        if (!cancelled) setDecisions(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, run]);

  const title =
    run?.branch ||
    run?.review_slug ||
    (run?.pr_number ? `PR #${run.pr_number}` : 'Review run');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(100%-1.5rem,40rem)]">
        <DialogHeader>
          <DialogTitle>Artefatos do run</DialogTitle>
          <DialogDescription className="font-mono">{title}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {!run ? null : loading ? (
            <p className="py-8 text-center text-sm text-hd-muted">
              Carregando decisões…
            </p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-hd-danger">{error}</p>
          ) : decisions ? (
            <RunArtifactsSummary
              project={project}
              run={run}
              decisions={decisions}
            />
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
