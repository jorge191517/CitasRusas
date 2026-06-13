import React from 'react';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-white/10 rounded ${className || ''}`} />
  );
}

export function ProfileCardSkeleton() {
  return (
    <div className="w-full rounded-[32px] overflow-hidden border border-white/5 bg-[#0D1530]/50 relative" style={{ height: "62vh", minHeight: "420px", maxHeight: "560px" }}>
      <div className="absolute inset-0 bg-white/5 animate-pulse" />
      <div className="absolute bottom-0 left-0 right-0 p-6 space-y-4">
        <Skeleton className="h-8 w-1/2 rounded-lg" />
        <Skeleton className="h-4 w-1/3 rounded-lg" />
        <Skeleton className="h-3 w-1/4 rounded-lg" />
        
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        
        <div className="flex justify-center gap-4 mt-6">
          <Skeleton className="w-14 h-14 rounded-full" />
          <Skeleton className="w-12 h-12 rounded-full" />
          <Skeleton className="w-16 h-16 rounded-full" />
          <Skeleton className="w-12 h-12 rounded-full" />
          <Skeleton className="w-12 h-12 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ChatListSkeleton() {
  return (
    <div className="w-full p-4 space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-3 w-8 rounded-md" />
            </div>
            <Skeleton className="h-3 w-48 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LikesGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#151F3C]/50 border border-white/5">
          <div className="absolute inset-0 bg-white/5 animate-pulse" />
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-[#0A1128] to-transparent pt-10">
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
