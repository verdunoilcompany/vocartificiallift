import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid w-full gap-6 p-4 md:p-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Skeleton className="h-[480px]" />
        <Skeleton className="h-[480px]" />
      </div>
    </div>
  );
}
