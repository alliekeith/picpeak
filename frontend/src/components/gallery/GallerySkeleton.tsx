import React, { useEffect, useState } from 'react';
import { SkeletonGalleryGrid } from '../common';
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholder shown while a gallery is resolving (slug → info →
 * auto-login → photos). The tile grid is delayed 300ms so fast loads
 * never flash an empty grid before the real photos render (#321 follow-up).
 */
export const GallerySkeleton: React.FC = () => {
  const [showGrid, setShowGrid] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowGrid(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background, #fafafa)' }}>
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="mb-2" style={{ width: '200px', height: '32px' }} />
              <Skeleton style={{ width: '300px', height: '20px' }} />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton style={{ width: '120px', height: '40px' }} />
              <Skeleton style={{ width: '100px', height: '40px' }} />
            </div>
          </div>
        </div>
      </header>
      {showGrid && (
        <div className="container mt-6">
          <Skeleton className="mb-6" style={{ height: '80px' }} />
          <SkeletonGalleryGrid count={12} />
        </div>
      )}
    </div>
  );
};
