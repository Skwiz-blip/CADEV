import { MessagesSquare } from "lucide-react";

export default function MessagesIndexPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <MessagesSquare className="size-6" aria-hidden />
      </span>
      <p className="mt-4 font-semibold text-ink">Choisis une conversation</p>
      <p className="mt-1 max-w-xs text-sm text-muted">Tes échanges avec les autres développeurs s&apos;affichent ici.</p>
    </div>
  );
}
