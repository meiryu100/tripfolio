"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { resendVerification } from "@/features/auth/api";
import { errorMessage } from "@/lib/api-client";
import { toast } from "@/lib/ui";

/** "Send the link again" for an unconfirmed email; pauses after each send so it isn't spammed. */
export function ResendVerification({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const resend = async () => {
    setBusy(true);
    try {
      await resendVerification(email);
      toast("Sent — check your inbox ✓");
      setSent(true);
      setTimeout(() => setSent(false), 30_000);
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="secondary" size="lg" className="w-full" loading={busy} disabled={sent} onClick={resend}>
      {sent ? "Link sent" : "Send the link again"}
    </Button>
  );
}
