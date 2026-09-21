/**
 * Replaces hardcoded neutral/white utility classes with the shadcn theme
 * tokens, so a photographer's branding and admin dark mode reach the whole UI
 * instead of only the parts that already used tokens.
 *
 * Most of these classes come in light/dark pairs:
 *
 *   text-neutral-900 dark:text-neutral-100   ->  text-foreground
 *   bg-white dark:bg-neutral-800             ->  bg-card
 *   border-neutral-200 dark:border-neutral-700 -> border-border
 *
 * Collapsing a pair removes the dark: half entirely — the token already
 * resolves differently per theme, so a dark: override is redundant and would
 * in fact defeat per-gallery branding by pinning a fixed colour.
 *
 * Pairing is done by parsing each class rather than matching fixed strings,
 * so arbitrary and stacked variants pair correctly too:
 *
 *   [&_.ProseMirror]:text-neutral-900 dark:[&_.ProseMirror]:text-neutral-100
 *   hover:bg-neutral-100 dark:hover:bg-neutral-700
 *
 * Deliberately left alone (see hasFixedDarkSurface / SKIP):
 *   - bg-neutral-800/900 and bg-black with no dark: counterpart. These are
 *     always-dark surfaces — code blocks, terminal output, toasts — that
 *     should not follow the theme, and the light text sitting on them must
 *     not be tokenised either.
 *   - text-white on a status fill (bg-red-600, bg-green-600, ...), which is
 *     a fixed colour pairing. text-white on bg-primary becomes
 *     text-primary-foreground, which is the brandable one.
 */
import { Project, SyntaxKind } from 'ts-morph'

const project = new Project({ tsConfigFilePath: 'tsconfig.app.json' })
project.addSourceFilesAtPaths(['src/**/*.tsx', 'src/**/*.jsx', 'src/**/*.ts'])

// property -> light shade -> token
const TEXT_STRONG = new Set(['900', '800', '700'])
const TEXT_STRONG_HOVER = new Set(['900', '800', '700', '600'])
const TEXT_MUTED = new Set(['600', '500', '400', '300'])
const BG_SUBTLE = new Set(['50', '100', '200', '300'])
const BORDER_ANY = new Set(['100', '200', '300', '400'])
const HOVERISH = /(^|:)(hover|focus|focus-visible|group-hover|active|aria-selected|data-\[state=)/

/** Split "dark:hover:text-neutral-900" into its parts. */
function parseClass(cls) {
  const isDark = cls.startsWith('dark:')
  const rest = isDark ? cls.slice(5) : cls
  // variants are everything before the final utility; arbitrary variants may
  // contain colons inside brackets, so split on colons outside [] only
  const parts = []
  let buf = '', depth = 0
  for (const ch of rest) {
    if (ch === '[') depth++
    else if (ch === ']') depth--
    if (ch === ':' && depth === 0) { parts.push(buf); buf = '' } else buf += ch
  }
  parts.push(buf)
  const util = parts.pop()
  const prefix = parts.length ? parts.join(':') + ':' : ''
  const m = /^(text|bg|border)-(white|black|neutral-(\d{2,3}))(\/\d+)?$/.exec(util)
  if (!m) return null
  return { isDark, prefix, prop: m[1], value: m[2], shade: m[3] ?? null, alpha: m[4] ?? '', util }
}

function tokenFor(prop, shade, value, prefix) {
  const hoverish = HOVERISH.test(prefix)
  if (prop === 'text') {
    if (value === 'white') return null
    // A hover state here almost always means "darken on hover" (e.g.
    // text-neutral-400 hover:text-neutral-600). With only two text tokens,
    // mapping both ends by absolute shade collapses them to the same value
    // and silently drops the affordance, so on hover the threshold moves:
    // anything 600 or darker becomes foreground.
    const strong = hoverish ? TEXT_STRONG_HOVER : TEXT_STRONG
    if (shade && strong.has(shade)) return 'text-foreground'
    if (shade && TEXT_MUTED.has(shade)) return 'text-muted-foreground'
    return null
  }
  if (prop === 'bg') {
    if (value === 'white') return hoverish ? 'bg-accent' : 'bg-card'
    if (shade && BG_SUBTLE.has(shade)) return hoverish ? 'bg-accent' : 'bg-muted'
    return null
  }
  if (prop === 'border') {
    if (shade && BORDER_ANY.has(shade)) return 'border-border'
    return null
  }
  return null
}

/** An always-dark surface in the same class list pins everything on it. */
function hasFixedDarkSurface(classes) {
  return classes.some(c => {
    const p = parseClass(c)
    if (!p || p.isDark || p.prop !== 'bg') return false
    return p.value === 'black' || (p.shade && ['700', '800', '900', '950'].includes(p.shade))
  })
}

let files = 0, pairs = 0, singles = 0, whiteOnPrimary = 0, skipped = 0, redundant = 0

function rewrite(text) {
  if (!/(?:text|bg|border)-(?:white|neutral-\d)/.test(text)) return text
  // No structural guard here on purpose. An earlier version rejected any
  // string containing brackets or parentheses, which silently skipped every
  // class list using an arbitrary value such as w-[calc(100%-2rem)] or
  // [&>svg]:size-4. Only the specific neutral/white utilities below are ever
  // rewritten and every other character is passed through untouched, so a
  // string that is not a class list simply comes back unchanged.

  const classes = text.split(/(\s+)/)       // keep the separators
  const toks = classes.filter(c => c.trim())
  const fixedSurface = hasFixedDarkSurface(toks)

  // index the dark: halves by prefix+prop so a light class can find its pair
  const darkIndex = new Map()
  toks.forEach(c => {
    const p = parseClass(c)
    if (p?.isDark) darkIndex.set(p.prefix + p.prop, c)
  })

  const consumedDark = new Set()
  let changed = false

  const out = classes.map(chunk => {
    if (!chunk.trim()) return chunk
    const p = parseClass(chunk)
    if (!p) return chunk
    if (p.isDark) return chunk               // handled via its light partner
    if (p.alpha) return chunk                // bg-black/50 etc: leave opacity fills

    const key = p.prefix + p.prop
    const darkPartner = darkIndex.get(key)

    // text-white on the brandable fill becomes its foreground token
    if (p.prop === 'text' && p.value === 'white') {
      const onPrimary = toks.some(c => /^(hover:|focus:)?bg-(primary|brand-[56]00)$/.test(c))
      if (onPrimary && !darkPartner) {
        changed = true; whiteOnPrimary++
        return p.prefix + 'text-primary-foreground'
      }
      return chunk
    }

    if (fixedSurface && (p.prop === 'text' || p.prop === 'border')) { skipped++; return chunk }

    const token = tokenFor(p.prop, p.shade, p.value, p.prefix)
    if (!token) { if (p.prop === 'bg') skipped++; return chunk }

    if (darkPartner) { consumedDark.add(darkPartner); pairs++ } else { singles++ }
    changed = true
    return p.prefix + token
  })

  if (!changed) return text

  // Rebuild without disturbing whitespace: `classes` alternates token and
  // separator, so a consumed dark: class takes exactly one adjacent
  // separator with it. Collapsing runs of whitespace instead would destroy
  // the indentation of multi-line class strings, and trimming the ends would
  // eat the space before a `${...}` in a template literal, silently gluing
  // two classes together.
  const keep = []
  for (let i = 0; i < out.length; i++) {
    const chunk = out[i]
    if (chunk.trim() && consumedDark.has(chunk)) {
      // drop the separator that follows, or the one before if it is last
      if (i + 1 < out.length && !out[i + 1].trim()) i++
      else if (keep.length && !keep[keep.length - 1].trim()) keep.pop()
      continue
    }
    keep.push(chunk)
  }

  // Drop a hover variant that ended up identical to the base class; it is a
  // no-op now and only adds noise.
  const bare = new Set(keep.filter(c => c.trim() && !/:/.test(c)))
  const deduped = []
  for (let i = 0; i < keep.length; i++) {
    const c = keep[i]
    const m = /^(?:hover|focus|focus-visible|group-hover|active):(.+)$/.exec(c.trim())
    if (m && bare.has(m[1])) {
      if (i + 1 < keep.length && !keep[i + 1].trim()) i++
      else if (deduped.length && !deduped[deduped.length - 1].trim()) deduped.pop()
      redundant++
      continue
    }
    deduped.push(c)
  }
  return deduped.join('')
}

for (const sf of project.getSourceFiles()) {
  if (sf.getFilePath().includes('/components/ui/')) continue
  let touched = false
  const kinds = [
    SyntaxKind.StringLiteral,
    SyntaxKind.NoSubstitutionTemplateLiteral,
    SyntaxKind.TemplateHead,
    SyntaxKind.TemplateMiddle,
    SyntaxKind.TemplateTail,
  ]
  for (const kind of kinds) {
    for (const node of sf.getDescendantsOfKind(kind)) {
      const raw = node.getLiteralText()
      const next = rewrite(raw)
      if (next !== raw) {
        const full = node.getText()
        node.replaceWithText(full.replace(raw, next))
        touched = true
      }
    }
  }
  if (touched) files++
}

project.saveSync()
console.log(`neutrals: ${files} files | ${pairs} light/dark pairs collapsed | ${singles} unpaired converted | ${whiteOnPrimary} text-white on primary | ${skipped} left fixed | ${redundant} no-op hovers dropped`)
