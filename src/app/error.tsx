"use client";

import { ErrorView } from "@/components/shared/error-view";

export default function RootError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="contenu" className="flex min-h-dvh items-center justify-center bg-canvas">
      <ErrorView {...props} />
    </main>
  );
}
