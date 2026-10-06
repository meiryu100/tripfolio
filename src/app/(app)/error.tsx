"use client";

import { ErrorState } from "@/components/ui";

export default function AppError({ retry }: { error: Error; retry: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <ErrorState body="We couldn't load this page." onRetry={retry} />
    </main>
  );
}
