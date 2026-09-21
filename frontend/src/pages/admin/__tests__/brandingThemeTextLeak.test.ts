/**
 * Guards against the branding-theme text colour leak (QA S3 / S4 / S13).
 *
 * The original symptom: ThemeContext.applyTheme() wrote the instance
 * branding's `--foreground` as an inline style on <html>, and
 * GlobalThemeProvider applied that theme on every non-gallery route — the
 * admin panel included. Headings that shipped without their own colour class
 * inherited the themed body colour through `body { color: var(--foreground) }`
 * and rendered near-white on white as soon as an install picked a dark-toned
 * branding theme.
 *
 * It was first fixed per heading, then by scoping admin out of branding with
 * `.unbranded-surface`. Both are gone: the colour system is now stock
 * shadcn/ui and nothing writes colour tokens at runtime, so there is no
 * branded value left to leak anywhere. These tests assert that property
 * directly — if colour branding is ever reintroduced, the leak has to be
 * reasoned about again and these will fail first.
 */
import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

const SRC = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

describe('branding-theme text colour leak (QA S3 / S4 / S13)', () => {
  const css = read('index.css');
  const themeContext = read('contexts/ThemeContext.tsx');

  it('writes no colour tokens at runtime', () => {
    // The leak was only possible because applyTheme() set colour custom
    // properties on <html>. Nothing may write these again.
    for (const token of [
      '--background',
      '--foreground',
      '--card',
      '--muted',
      '--muted-foreground',
      '--border',
      '--primary',
      '--primary-foreground',
    ]) {
      expect(themeContext).not.toContain(`setProperty('${token}'`);
    }
  });

  it('keeps no brand palette alongside the shadcn tokens', () => {
    // --brand / --brand-light / --brand-dark were PicPeak's own layer on top
    // of shadcn and the vehicle for per-instance colour.
    expect(css).not.toMatch(/--brand(-light|-dark|-foreground)?\s*:/);
    expect(css).not.toContain('.unbranded-surface');
  });

  it('defines the stock shadcn light and dark palettes', () => {
    const root = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    const dark = /\.dark\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    // Stock new-york-v4 values: near-black primary on light, near-white on dark.
    expect(root).toContain('--primary: oklch(0.205 0 0)');
    expect(root).toContain('--background: oklch(1 0 0)');
    expect(dark).toContain('--primary: oklch(0.922 0 0)');
    expect(dark).toContain('--background: oklch(0.145 0 0)');
    // The chart and sidebar families ship with stock shadcn.
    expect(root).toContain('--chart-1:');
    expect(root).toContain('--sidebar:');
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
