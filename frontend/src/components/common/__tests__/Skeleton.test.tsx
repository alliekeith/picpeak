import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Skeleton, SkeletonGalleryGrid, SkeletonCard } from '../Skeleton';

/**
 * Regression for #358. The Skeleton placeholders used to hard-code
 * `bg-neutral-200`, which rendered as bright light grey on dark
 * gallery themes (Rekoo-PS's "most annoying" frame). They must instead
 * use the active theme's surface-border colour so the placeholders
 * track whatever the theme defines for both light and dark modes.
 */
describe('Skeleton — theme-aware colour', () => {
  // The placeholder colour is no longer an inline style. The stock shadcn
  // Skeleton carries bg-accent, which resolves through the same theme
  // variables ThemeContext writes, so the guard against #358 becomes "does it
  // use a theme token" rather than "is this exact inline value present".
  it('uses a theme token for the placeholder background', () => {
    const { container } = render(<Skeleton />);
    const div = container.querySelector('div');
    expect(div).not.toBeNull();
    expect(div!.className).toMatch(/\bbg-accent\b/);
  });

  it('does NOT add the legacy hard-coded bg-neutral-200 class', () => {
    const { container } = render(<Skeleton />);
    const div = container.querySelector('div');
    expect(div!.className).not.toMatch(/bg-neutral-200/);
  });

  it('SkeletonGalleryGrid tiles inherit the theme colour', () => {
    const { container } = render(<SkeletonGalleryGrid count={3} />);
    // aria-busy now sits on the grid wrapper rather than on each tile: the
    // stock Skeleton sets no aria attributes, and one busy region per loading
    // block reads better than one announcement per placeholder.
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    const tiles = container.querySelectorAll('[data-slot="skeleton"]');
    expect(tiles.length).toBe(3);
    tiles.forEach((tile) => {
      expect((tile as HTMLElement).className).toMatch(
        /\bbg-accent\b/
      );
    });
  });

  it('SkeletonCard surface uses var(--card)', () => {
    const { container } = render(<SkeletonCard />);
    const card = container.firstElementChild as HTMLElement;
    expect(card).not.toBeNull();
    expect(card.style.backgroundColor).toBe('var(--card, #ffffff)');
    // Sanity: should not retain the old bg-white class either
    expect(card.className).not.toMatch(/bg-white/);
  });
});
