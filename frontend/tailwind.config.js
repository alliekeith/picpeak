/**
 * shadcn/ui token bridge.
 *
 * PicPeak stores its theme colours as HEX in CSS variables that
 * ThemeContext.applyTheme() writes at runtime (per-gallery photographer
 * branding) — e.g. `--color-surface: #ffffff`. Upstream shadcn instead
 * expects HSL *channel triplets* so it can do `hsl(var(--x) / <alpha>)`.
 *
 * Converting PicPeak to triplets would mean changing the colour format the
 * admin colour pickers and the backend persist, so instead we bridge: this
 * helper keeps the hex variables as the single source of truth and
 * re-implements Tailwind's opacity modifier (`bg-primary/90`) with
 * color-mix(), which this project already relies on elsewhere in index.css
 * and which every browser we ship supports (Chromium 111+, Safari 16.2+,
 * Firefox 113+).
 *
 * Net effect: shadcn components inherit white-label branding and admin dark
 * mode automatically, because both simply rewrite the same `--color-*` vars.
 */
const themeColor = (variable) => ({ opacityValue } = {}) => {
  // Tailwind calls this three ways:
  //   1. no opacity modifier at all          -> opacityValue === undefined
  //   2. an opacity modifier, e.g. bg-x/90   -> opacityValue === '0.9'
  //   3. no modifier, but an opacity utility -> opacityValue === 'var(--tw-bg-opacity, 1)'
  // Only case 2 may become a color-mix(). Feeding the case-3 CSS variable
  // string through Number() yields NaN, and `color-mix(... NaN% ...)` is
  // invalid CSS that the browser drops entirely — which renders the element
  // transparent rather than branded.
  if (opacityValue === undefined) return `var(${variable})`
  const alpha = Number(opacityValue)
  if (!Number.isFinite(alpha) || alpha >= 1) return `var(${variable})`
  return `color-mix(in srgb, var(${variable}) ${alpha * 100}%, transparent)`
}

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 8-token CI palette aliases — these read CSS variables that are set
        // either by ThemeContext.applyTheme (gallery + branding) or by the
        // :root.dark { } block in index.css (admin dark mode). Use these in
        // place of bg-white / text-neutral-900 / border-neutral-200 so that
        // every component flips with dark/light mode automatically.
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        elevated: 'var(--color-elevated)',
        'border-token': 'var(--color-surface-border)',
        'text-primary': 'var(--color-text)',
        'text-secondary': 'var(--color-muted-text)',
        // `accent` / `accent-dark` keep their existing PicPeak meaning (the
        // brand colour), so the ~370 existing bg-accent/text-accent call
        // sites are untouched. The `.foreground` keys are additive and give
        // shadcn components a guaranteed-readable colour to place on top —
        // ThemeContext computes them with getReadableForeground().
        accent: {
          DEFAULT: themeColor('--color-accent'),
          foreground: themeColor('--color-accent-fg'),
        },
        'accent-dark': {
          DEFAULT: themeColor('--color-accent-dark'),
          foreground: themeColor('--color-accent-dark-fg'),
        },

        // --- shadcn/ui semantic tokens -------------------------------------
        // All additive. Each points at an existing PicPeak theme variable so
        // there is exactly one source of truth per colour.
        foreground: themeColor('--color-text'),
        muted: {
          DEFAULT: themeColor('--color-elevated'),
          foreground: themeColor('--color-muted-text'),
        },
        card: {
          DEFAULT: themeColor('--color-surface'),
          foreground: themeColor('--color-text'),
        },
        popover: {
          DEFAULT: themeColor('--color-surface'),
          foreground: themeColor('--color-text'),
        },
        destructive: {
          DEFAULT: themeColor('--color-destructive'),
          foreground: themeColor('--color-destructive-fg'),
        },
        border: themeColor('--color-surface-border'),
        input: themeColor('--color-surface-border'),
        ring: themeColor('--color-accent'),
        primary: {
          // DEFAULT/foreground are additive: `bg-primary` now resolves to the
          // themed CTA colour used by .btn-primary, while the numeric scale
          // below (413 existing call sites such as `bg-primary-600`) keeps
          // its exact hardcoded values.
          DEFAULT: themeColor('--color-accent-dark'),
          foreground: themeColor('--color-accent-dark-fg'),
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#5C8762', // Main brand color from scrappbook.de
          700: '#4a6f4f',
          800: '#3f5d42',
          900: '#365238',
        },
        sand: {
          50: '#fdfcfb',
          100: '#f7f5f2',
          200: '#f0ebe5',
          300: '#e6ddd4',
          400: '#d4c2b0',
          500: '#c2a68c',
          600: '#b18b68',
        },
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        // Bound to the customizer's border-radius setting. shadcn components
        // use `rounded-theme` rather than redefining Tailwind's built-in
        // rounded-md/lg, which would have restyled every existing call site.
        theme: 'var(--border-radius)',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'large': '0 8px 32px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  safelist: [
    // Dynamic grid-cols classes used by thumbnail scale offsets
    ...Array.from({ length: 12 }, (_, i) => `grid-cols-${i + 1}`),
    ...Array.from({ length: 12 }, (_, i) => `sm:grid-cols-${i + 1}`),
    ...Array.from({ length: 12 }, (_, i) => `lg:grid-cols-${i + 1}`),
    ...Array.from({ length: 12 }, (_, i) => `xl:grid-cols-${i + 1}`),
  ],
  plugins: [
    // Tailwind's Preflight resets h1-h6 to inherit their size and weight, and
    // strips list-style and padding from ul/ol. Ten places in this app render
    // rich text inside a `prose` container and rely on this plugin to put that
    // typography back — the CMS editor and its preview, the public CMS page,
    // release notes, and the gallery welcome message among them.
    //
    // Without it every `prose*` class is a no-op, so applying a heading or a
    // list in the CMS editor changed the document and changed NOTHING on
    // screen: the toolbar button lit up (the editor state was correct) while
    // the text stayed visually a paragraph. That is issue #1288.
    require('@tailwindcss/typography'),
    // Enter/exit animations (data-[state=open]:animate-in etc.) used by the
    // Radix-backed shadcn primitives in src/components/ui.
    require('tailwindcss-animate'),
  ],
}

