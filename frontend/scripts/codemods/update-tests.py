"""Update the two tests that assert the pre-shadcn implementation.

Both guards keep their original purpose; only the mechanism they check
changes, because the thing they were guarding is now implemented differently.
"""
# --- 1. Tailwind 4 is configured in CSS, so there is no tailwind.config.js ---
p = 'src/__tests__/tailwindTypography.test.ts'
s = open(p).read()
s = s.replace("""  const config = readFileSync(resolve(root, 'tailwind.config.js'), 'utf8');

  it('is registered in the tailwind config', () => {
    expect(config).toMatch(/require\\(['"]@tailwindcss\\/typography['"]\\)/);
  });""",
"""  // Tailwind 4 is configured in CSS rather than JS: tailwind.config.js is
  // gone and plugins are registered with @plugin in the stylesheet. The guard
  // is unchanged in purpose — a missing plugin still produces no error and no
  // warning, the prose classes simply stop existing.
  const css = readFileSync(resolve(root, 'src/index.css'), 'utf8');

  it('is registered in the stylesheet', () => {
    expect(css).toMatch(/@plugin\\s+['"]@tailwindcss\\/typography['"]/);
  });""", 1)
open(p, 'w').write(s)

# --- 2. Skeleton's colour is a class now, and aria-busy moved to the wrapper ---
p = 'src/components/common/__tests__/Skeleton.test.tsx'
s = open(p).read()
s = s.replace("""  it('uses var(--border) for the placeholder background', () => {
    const { container } = render(<Skeleton />);
    const div = container.querySelector('div');
    expect(div).not.toBeNull();
    expect(div!.style.backgroundColor).toBe('var(--border, #e5e5e5)');
  });""",
"""  // The placeholder colour is no longer an inline style. The stock shadcn
  // Skeleton carries bg-accent, which resolves through the same theme
  // variables ThemeContext writes, so the guard against #358 becomes "does it
  // use a theme token" rather than "is this exact inline value present".
  it('uses a theme token for the placeholder background', () => {
    const { container } = render(<Skeleton />);
    const div = container.querySelector('div');
    expect(div).not.toBeNull();
    expect(div!.className).toMatch(/\\bbg-accent\\b/);
  });""", 1)
s = s.replace("""    const { container } = render(<SkeletonGalleryGrid count={3} />);
    // Tiles are the Skeleton components — direct children of the
    // gallery-grid wrapper. They carry aria-busy="true" while the
    // wrapper does not, which is the cleanest way to select them.
    const tiles = container.querySelectorAll('[aria-busy="true"]');
    expect(tiles.length).toBe(3);
    tiles.forEach((tile) => {
      expect((tile as HTMLElement).style.backgroundColor).toBe(
        'var(--border, #e5e5e5)'""",
"""    const { container } = render(<SkeletonGalleryGrid count={3} />);
    // aria-busy now sits on the grid wrapper rather than on each tile: the
    // stock Skeleton sets no aria attributes, and one busy region per loading
    // block reads better than one announcement per placeholder.
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    const tiles = container.querySelectorAll('[data-slot="skeleton"]');
    expect(tiles.length).toBe(3);
    tiles.forEach((tile) => {
      expect((tile as HTMLElement).className).toMatch(
        /\\bbg-accent\\b/""", 1)
open(p, 'w').write(s)
print('   tests updated for the new implementations')
