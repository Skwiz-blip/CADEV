import { Skeleton } from "@/components/ui/primitives";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-2 w-full rounded-full" />
      <Skeleton className="h-[28rem] rounded-3xl" />
    </div>
  );
}
