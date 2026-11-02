import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";

export function PageSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className={cn("mx-auto w-full px-6 pt-10 md:pt-14", wide ? "max-w-[96rem]" : "max-w-6xl")}>
      <Skeleton className="h-6 w-64 rounded-full" />
      <Skeleton className="mt-5 h-14 w-full max-w-2xl" />
      <Skeleton className="mt-4 h-6 w-full max-w-xl" />
      <Skeleton className="mt-8 h-14 w-full rounded-2xl" />
      <div className="mt-4 flex gap-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex gap-3.5 bg-card px-4 py-3.5">
            <Skeleton className="size-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
