import React from 'react';
import { cn } from '../lib/utils';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div className={cn("animate-pulse bg-white/5 rounded-xl", className)} />
  );
};

export const EventCardSkeleton = () => (
  <div className="glass-card rounded-2xl p-0 overflow-hidden space-y-4">
    <Skeleton className="h-48 w-full rounded-none" />
    <div className="p-4 space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-6 w-12" />
      </div>
      <Skeleton className="h-4 w-1/2" />
      <div className="flex justify-between pt-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 gap-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
    <div className="space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  </div>
);
