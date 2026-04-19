import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Copy, Mail, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { adminApi, type AdminInvite } from "@/lib/api";
import { NewInviteModal } from "@/components/NewInviteModal";
import { formatDateForTable, formatFullDateTime } from "@/lib/dateUtils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const INVITE_BASE_URL = "https://app.dirxctional.com/invite";

function isExpiringSoon(expiresAt: string): boolean {
  try {
    const ms = new Date(expiresAt).getTime() - Date.now();
    return ms > 0 && ms < 48 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function isPending(invite: AdminInvite): boolean {
  if (invite.used_at || invite.revoked_at) return false;
  try {
    return new Date(invite.expires_at).getTime() > Date.now();
  } catch {
    return true;
  }
}

export default function AdminInvites() {
  const queryClient = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<AdminInvite | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "invites"],
    queryFn: () => adminApi.listInvites(),
  });

  const invites: AdminInvite[] = data?.items ?? [];
  const pending = invites.filter(isPending);

  const resendMutation = useMutation({
    mutationFn: (token: string) => adminApi.resendInvite(token),
    onSuccess: () => toast.success("Invite email resent"),
    onError: (e: Error) => toast.error(e.message || "Failed to resend"),
  });

  const revokeMutation = useMutation({
    mutationFn: (token: string) => adminApi.revokeInvite(token),
    onSuccess: () => {
      toast.success("Invite revoked");
      queryClient.invalidateQueries({ queryKey: ["admin", "invites"] });
      setRevokeTarget(null);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to revoke"),
  });

  const copyLink = async (token: string) => {
    const url = `${INVITE_BASE_URL}/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  // Detect whether the list endpoint exists. If GET returns 404/Method-not-allowed,
  // we still show the page but skip the table.
  const listMissing = !!error;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Clinic Invites</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Send and manage invitations for clinic users.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Invite
        </Button>
      </div>

      <section className="rounded-lg border border-border bg-card">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Pending invites</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : listMissing ? (
          <div className="px-5 py-8 text-sm text-muted-foreground">
            Invite list is not available yet. You can still send new invites with the button above.
          </div>
        ) : pending.length === 0 ? (
          <div className="px-5 py-8 text-sm text-muted-foreground text-center">
            No pending invites. Click "New Invite" to send one.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Clinic</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((invite) => {
                const expiringSoon = isExpiringSoon(invite.expires_at);
                return (
                  <TableRow key={invite.token}>
                    <TableCell className="font-medium">{invite.email}</TableCell>
                    <TableCell>{invite.clinic_name ?? "—"}</TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>{formatDateForTable(invite.created_at)}</span>
                        </TooltipTrigger>
                        <TooltipContent>{formatFullDateTime(invite.created_at)}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={cn(expiringSoon && "text-destructive font-medium")}>
                            {formatDateForTable(invite.expires_at)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{formatFullDateTime(invite.expires_at)}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyLink(invite.token)}
                              aria-label="Copy invite link"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy link</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => resendMutation.mutate(invite.token)}
                              disabled={resendMutation.isPending}
                              aria-label="Resend email"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Resend email</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setRevokeTarget(invite)}
                              aria-label="Revoke invite"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Revoke</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>

      <NewInviteModal open={newOpen} onOpenChange={setNewOpen} />

      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke invite?</AlertDialogTitle>
            <AlertDialogDescription>
              Revoke invite for <strong>{revokeTarget?.email}</strong>? The link will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeTarget && revokeMutation.mutate(revokeTarget.token)}
              disabled={revokeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
