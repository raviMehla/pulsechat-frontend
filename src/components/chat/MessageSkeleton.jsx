import { Skeleton } from "../ui/Skeleton";

export function MessageSkeleton() {
  return (
    <div className="flex-1 flex flex-col p-4 space-y-6 overflow-hidden">
      {[...Array(4)].map((_, i) => {
        const isRight = i % 2 !== 0; // Alternates alignment to look like a real conversation
        return (
          <div 
            key={i} 
            className={`flex w-full ${isRight ? "justify-end" : "justify-start"}`}
          >
            <div className={`flex flex-col gap-1 ${isRight ? "items-end" : "items-start"} max-w-[60%]`}>
              {/* Message content block */}
              <Skeleton className={`h-10 ${isRight ? "w-48" : "w-64"} rounded-xl ${isRight ? "rounded-br-none" : "rounded-bl-none"}`} />
              {/* Timestamp placeholder */}
              <Skeleton className="w-12 h-2 mt-1 opacity-40" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
