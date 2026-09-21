/**
 * Guards the fix for the branding-theme text colour leak (QA S3 / S4 / S13).
 *
 * The original symptom: ThemeContext.applyTheme() writes the instance
 * branding's `--foreground` as an inline style on <html>, and
 * GlobalThemeProvider applies that theme on every non-gallery route — the
 * admin panel included. Headings that shipped without their own colour class
 * inherited the themed body colour through `body { color: var(--foreground) }`
 * and rendered near-white on white as soon as an install picked a dark-toned
 * branding theme.
 *
 * That was originally fixed per heading, by giving each one a hardcoded
 * colour. It is now fixed at the cause: the admin panel is scoped out of
 * branding entirely (`.unbranded-surface` on <body> for /admin and /setup),
 * so its tokens always resolve to the built-in palette however the instance
 * is branded, and a heading using `text-foreground` is safe again.
 *
 * These tests therefore assert the scoping mechanism rather than the old
 * per-heading workaround. What must never regress is that admin text and the
 * surface behind it come from the same palette.
 */
import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

const SRC = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

describe('branding-theme text colour leak (QA S3 / S4 / S13)', () => {
  const css = read('index.css');
  const scope = read('components/UnbrandedSurfaceScope.tsx');

  it('declares an unbranded scope that re-points the base tokens at the defaults', () => {
    const block = /\.unbranded-surface\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(block).not.toBe('');
    // Every token applyTheme() writes must be reset, or branding leaks in
    // through whichever one was missed.
    for (const token of [
      '--background',
      '--foreground',
      '--card',
      '--muted',
      '--muted-foreground',
      '--border',
      '--primary',
      '--primary-foreground',
      '--brand',
    ]) {
      expect(block).toContain(`${token}: var(--default-${token.slice(2)})`);
    }
  });

  it('applies that scope to the admin and setup routes', () => {
    expect(scope).toMatch(/UNBRANDED_PREFIXES\s*=\s*\[[^\]]*'\/admin'[^\]]*\]/);
    expect(scope).toMatch(/UNBRANDED_PREFIXES\s*=\s*\[[^\]]*'\/setup'[^\]]*\]/);
  });

  it('puts the scope on <body>, so portalled dialogs and toasts are covered', () => {
    // A scope on a layout element would leave anything portalled to body
    // outside it, rendering branded over an unbranded page.
    expect(scope).toContain("document.body.classList.toggle('unbranded-surface'");
  });

  it('mounts the scope inside the router so it reacts to navigation', () => {
    const app = read('App.tsx');
    expect(app).toContain('<UnbrandedSurfaceScope />');
    const routerAt = app.indexOf('<Router>');
    expect(routerAt).toBeGreaterThan(-1);
    expect(app.indexOf('<UnbrandedSurfaceScope />')).toBeGreaterThan(routerAt);
  });

  it('keeps the dark palette reachable through the defaults', () => {
    // `.dark` must redefine the --default-* values, not the live tokens,
    // otherwise the unbranded scope would pin admin to the light palette and
    // the admin dark-mode switch would stop working.
    const darkBlock = /\.dark\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(darkBlock).toContain('--default-background:');
    expect(darkBlock).toContain('--default-foreground:');
  });

  it('keeps the themed page background outside @layer base', () => {
    // index.html ships an anti-flash `html, body { background-color: ... }`
    // in <head>. Tailwind 4 emits @layer base as a real cascade layer and
    // unlayered rules beat layered ones, so a themed body rule inside the
    // layer loses to the bootstrap and pins every page to it.
    const themedBody = /\n\}\s*\n\nbody \{\n\s*background-color: var\(--background\);\n\s*color: var\(--foreground\);\n\}/.test(css)
      || /^body \{\s*\n\s*background-color: var\(--background\);/m.test(css);
    expect(themedBody).toBe(true);
  });

  it('keeps the CMS 404 card surface on the same theme tokens as its text', () => {
    // CMSContentBlock intentionally renders themed text (var(--foreground));
    // the card surface has to follow it.
    const source = read('components/common/CMSContentBlock.tsx');
    expect(source).toContain("backgroundColor: 'var(--card)'");
    expect(source).toContain("color: 'var(--foreground)'");
  });
});
