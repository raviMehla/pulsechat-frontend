import { Skeleton } from "../ui/Skeleton";

export function ChatListSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          {/* Avatar Skeleton */}
          <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
          
          {/* Text Skeletons */}
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-8 h-3" />
            </div>
            <Skeleton className="w-full h-3 opacity-60" />
          </div>
        </div>
      ))}
    </div>
  );
}