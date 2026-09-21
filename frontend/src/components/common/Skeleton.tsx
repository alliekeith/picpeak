import React from 'react';
import { cn } from '../../lib/utils';
import { Skeleton } from "@/components/ui/skeleton";

/*
 * The Skeleton primitive that used to live here is gone; the stock shadcn one
 * is used instead. What remains are PicPeak's loading layouts composed from
 * it, which is how shadcn's own documentation suggests building these.
 */

export { Skeleton };

// Skeleton group for consistent loading states
interface SkeletonGroupProps {
  count?: number;
  className?: string;
  children?: React.ReactNode;
}

export const SkeletonGroup: React.FC<SkeletonGroupProps> = ({
  count = 1,
  className,
  children
}) => {
  if (children) {
    return <div className={cn('space-y-3', className)}>{children}</div>;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} style={{ height: '20px' }} />
      ))}
    </div>
  );
};

// Theme-aware container surface — same reasoning as the Skeleton
// itself. Reads var(--card) so the card sits on the right
// background regardless of the active theme's colour mode.
const SURFACE_STYLE: React.CSSProperties = {
  backgroundColor: 'var(--card, #ffffff)',
};

// Common skeleton patterns
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('rounded-lg shadow-xs p-6', className)} style={SURFACE_STYLE}>
    <Skeleton className="mb-4" style={{ width: "60%", height: '24px' }} />
    <SkeletonGroup count={3} />
    <div className="flex gap-3 mt-6">
      <Skeleton style={{ width: '100px', height: '36px' }} />
      <Skeleton style={{ width: '100px', height: '36px' }} />
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; className?: string }> = ({
  rows = 5,
  className
}) => (
  <div className={cn('rounded-lg shadow-xs overflow-hidden', className)} style={SURFACE_STYLE}>
    <div className="border-b border-border p-4">
      <div className="flex gap-4">
        <Skeleton style={{ width: "30%", height: '20px' }} />
        <Skeleton style={{ width: "25%", height: '20px' }} />
        <Skeleton style={{ width: "20%", height: '20px' }} />
        <Skeleton style={{ width: "25%", height: '20px' }} />
      </div>
    </div>
    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="p-4">
          <div className="flex gap-4">
            <Skeleton style={{ width: "30%", height: '16px' }} />
            <Skeleton style={{ width: "25%", height: '16px' }} />
            <Skeleton style={{ width: "20%", height: '16px' }} />
            <Skeleton style={{ width: "25%", height: '16px' }} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonGalleryGrid: React.FC<{ count?: number; className?: string }> = ({ 
  count = 12, 
  className 
}) => (
  <div className={cn('gallery-grid', className)} aria-busy="true" aria-live="polite">
    {Array.from({ length: count }).map((_, index) => (
      <Skeleton
        key={index}
        className="aspect-square w-full"
      />
    ))}
  </div>
);

export const SkeletonList: React.FC<{ count?: number; className?: string }> = ({ 
  count = 5, 
  className 
}) => (
  <div className={cn('space-y-4', className)}>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="flex items-center gap-4">
        <Skeleton style={{ width: '48px', height: '48px' }} className="rounded-full" />
        <div className="flex-1">
          <Skeleton className="mb-2" style={{ width: "70%", height: '20px' }} />
          <Skeleton style={{ width: "40%", height: '16px' }} />
        </div>
      </div>
    ))}
  </div>
);