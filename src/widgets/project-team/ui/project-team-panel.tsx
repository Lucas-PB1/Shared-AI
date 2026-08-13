'use client';

import { useState } from 'react';

import type { ProjectMember } from '@/entities/project';
import { InviteMemberForm } from '@/features/invite-member';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

export function ProjectTeamPanel({
  members,
  projectId,
  projectSlug,
  isOwner,
}: {
  members: ProjectMember[];
  projectId: string;
  projectSlug: string;
  isOwner: boolean;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-hd-ink">Time</h2>
          <p className="text-xs text-hd-muted">{members.length} membro(s)</p>
        </div>
        {isOwner ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setInviteOpen(true)}
          >
            Convidar
          </Button>
        ) : null}
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-hd-muted">Nenhum membro.</p>
      ) : (
        <ul className="divide-y divide-hd-border rounded-hd-md border border-hd-border">
          {members.map((member) => (
            <li
              key={member.user_id}
              className="flex items-center justify-between gap-2 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-hd-ink">
                  {member.profiles?.display_name ||
                    member.profiles?.email ||
                    member.user_id}
                </p>
                {member.profiles?.email ? (
                  <p className="truncate text-[11px] text-hd-muted">
                    {member.profiles.email}
                  </p>
                ) : null}
              </div>
              <Badge className="shrink-0">{member.role}</Badge>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar membro</DialogTitle>
            <DialogDescription>
              A pessoa precisa ter conta (profile) com esse e-mail.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <InviteMemberForm
              projectId={projectId}
              projectSlug={projectSlug}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
