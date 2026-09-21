"""Drop the local Skeleton primitive; keep the app-specific loading layouts.

SkeletonCard / SkeletonTable / SkeletonGalleryGrid are composed from the
primitive, which is the pattern shadcn's own docs recommend, so they stay --
they just build on the stock Skeleton now.

aria-busy moves from each tile onto the group wrapper: the stock Skeleton does
not set it, and one busy region per loading block is the better announcement
anyway than one per placeholder tile.
"""
p = 'src/components/common/Skeleton.tsx'
s = open(p).read()

start = s.index('interface SkeletonProps')
end = s.index('// Skeleton group for consistent loading states')
s = s[:start] + s[end:]

s = s.replace("""import React from 'react';
import { cn } from '../../lib/utils';""",
"""import React from 'react';
import { cn } from '../../lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

/*
 * The Skeleton primitive that used to live here is gone; the stock shadcn one
 * is used instead. What remains are PicPeak's loading layouts composed from
 * it, which is how shadcn's own documentation suggests building these.
 */

export { Skeleton };""", 1)
# The old primitive set aria-busy/aria-live on every placeholder; the stock
# one sets neither. Put aria-busy on each loading block's wrapper instead —
# one busy region per block is a better announcement than one per tile.
s = s.replace("""  <div className={cn('gallery-grid', className)}>""",
              """  <div className={cn('gallery-grid', className)} aria-busy="true" aria-live="polite">""", 1)

open(p, 'w').write(s)
print('   Skeleton composites now build on stock Skeleton')
