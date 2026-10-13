"use client";

import { Ban, Flag, ShieldCheck, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button, Sheet, SheetClose, Textarea } from "@/components/ui";
import { errorMessage } from "@/lib/api-client";
import type { UserSummary } from "@/lib/types";
import { toast } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { REPORT_REASONS } from "@/lib/validation";
import { reportUser, useChatAction } from "./api";

/** A short yes/no question in a sheet. */
export function ConfirmSheet({
  open,
  onClose,
  title,
  body,
  confirm,
  danger,
  loading,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body: ReactNode;
  confirm: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} label={title} className="sm:max-w-sm" z={60}>
      <div className="px-6 pt-5 pb-6 text-center">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-2 text-sm text-muted">{body}</p>
        <div className="mt-6 grid gap-2">
          <Button variant={danger ? "danger" : "primary"} loading={loading} onClick={onConfirm}>
            {confirm}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

const REASON_LABELS: Record<(typeof REPORT_REASONS)[number], string> = {
  spam: "It's spam",
  harassment: "Harassment or bullying",
  inappropriate: "Inappropriate content",
  other: "Something else",
};

export function ReportSheet({
  user,
  messageId,
  open,
  onClose,
}: {
  user: UserSummary;
  messageId?: string;
  open: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number] | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const close = () => {
    setReason(null);
    setDetails("");
    onClose();
  };
  const submit = async () => {
    if (!reason) return;
    setBusy(true);
    try {
      await reportUser(user.username, { reason, details, messageId });
      toast("Thanks for letting us know. We'll review it.");
      close();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={close} label={`Report @${user.username}`} z={60}>
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="font-bold">{messageId ? "Report message" : `Report @${user.username}`}</h2>
        <SheetClose onClick={close} />
      </div>
      <div className="overflow-y-auto px-5 py-4">
        <p className="text-sm text-muted">Why are you reporting this? {user.firstName} won&apos;t know who reported them.</p>
        <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Reason">
          {REPORT_REASONS.map((r) => (
            <button
              key={r}
              role="radio"
              aria-checked={reason === r}
              onClick={() => setReason(r)}
              className={cn(
                "flex min-h-12 items-center justify-between rounded-xl border px-4 text-left font-medium transition duration-200",
                reason === r ? "border-brand-bright bg-brand-soft text-brand" : "border-border hover:bg-surface-2",
              )}
            >
              {REASON_LABELS[r]}
              <span className={cn("size-4.5 rounded-full border-2", reason === r ? "border-brand-bright bg-brand-bright shadow-[inset_0_0_0_3px_var(--surface)]" : "border-border")} />
            </button>
          ))}
        </div>
        <Textarea label="Anything else?" optional className="mt-4" value={details} maxLength={1000} onChange={(e) => setDetails(e.target.value)} />
        <Button className="mt-5 w-full" disabled={!reason} loading={busy} onClick={submit}>
          Submit report
        </Button>
      </div>
    </Sheet>
  );
}

/** Profile / chat "⋯" menu: view profile, report, block or unblock, and (in a chat) delete it. */
export function UserActionsSheet({
  user,
  blocked,
  open,
  onClose,
  onDeleteChat,
  showProfileLink,
}: {
  user: UserSummary;
  blocked: boolean;
  open: boolean;
  onClose: () => void;
  onDeleteChat?: () => void;
  showProfileLink?: boolean;
}) {
  const action = useChatAction(user.username);
  const [confirm, setConfirm] = useState<"block" | "delete" | null>(null);
  const [reporting, setReporting] = useState(false);

  const run = (what: "block" | "unblock") =>
    action.mutate(what, {
      onSuccess: () => {
        toast(what === "block" ? `You blocked @${user.username}` : `You unblocked @${user.username}`, "info");
        setConfirm(null);
        onClose();
      },
      onError: (e) => toast(errorMessage(e), "error"),
    });

  const item = "flex min-h-13 w-full items-center gap-3 px-5 py-3 text-left font-medium transition duration-200 hover:bg-surface-2";
  return (
    <>
      <Sheet open={open && !confirm && !reporting} onClose={onClose} label={`${user.firstName} ${user.lastName}`} className="sm:max-w-sm">
        <div className="divide-y divide-border pb-2">
          {showProfileLink && (
            <Link href={`/u/${user.username}`} className={item} onClick={onClose}>
              <UserRound className="size-5 text-muted" aria-hidden /> View profile
            </Link>
          )}
          <button className={item} onClick={() => setReporting(true)}>
            <Flag className="size-5 text-muted" aria-hidden /> Report
          </button>
          {blocked ? (
            <button className={item} onClick={() => run("unblock")} disabled={action.isPending}>
              <ShieldCheck className="size-5 text-muted" aria-hidden /> Unblock
            </button>
          ) : (
            <button className={cn(item, "text-danger")} onClick={() => setConfirm("block")}>
              <Ban className="size-5" aria-hidden /> Block
            </button>
          )}
          {onDeleteChat && (
            <button className={cn(item, "text-danger")} onClick={() => setConfirm("delete")}>
              <Trash2 className="size-5" aria-hidden /> Delete chat
            </button>
          )}
          <button className={cn(item, "justify-center text-muted")} onClick={onClose}>
            Cancel
          </button>
        </div>
      </Sheet>
      <ConfirmSheet
        open={confirm === "block"}
        onClose={() => setConfirm(null)}
        title={`Block ${user.firstName}?`}
        body={`They won't be able to message you, and you'll stop following each other. They won't be told you blocked them.`}
        confirm="Block"
        danger
        loading={action.isPending}
        onConfirm={() => run("block")}
      />
      <ConfirmSheet
        open={confirm === "delete"}
        onClose={() => setConfirm(null)}
        title="Delete chat?"
        body={`It will be removed for you only. ${user.firstName} will still see it.`}
        confirm="Delete"
        danger
        onConfirm={() => {
          setConfirm(null);
          onClose();
          onDeleteChat?.();
        }}
      />
      <ReportSheet
        user={user}
        open={reporting}
        onClose={() => {
          setReporting(false);
          onClose();
        }}
      />
    </>
  );
}
