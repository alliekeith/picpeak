/**
 * Migrates <Skeleton> from the removed components/common wrapper to the stock
 * shadcn Skeleton, which takes only className.
 *
 *   variant="text"        -> rounded-sm     (rectangular is shadcn's own
 *   variant="circular"    -> rounded-full    rounded-md, so it is dropped)
 *   animation="wave"      -> animate-shimmer
 *   animation="none"      -> animate-none
 *   width / height        -> style={{ ... }}, as before
 *
 * The wrapper forced backgroundColor: var(--border) so tiles stayed legible
 * on dark gallery themes (issue #358). Stock Skeleton uses bg-accent, which
 * now resolves through the same theme tokens, so that override is no longer
 * needed and is not carried over.
 */
import { Project, SyntaxKind } from 'ts-morph'

const project = new Project({ tsConfigFilePath: 'tsconfig.app.json' })
// .jsx is included: two admin screens are still plain JSX.
project.addSourceFilesAtPaths(['src/**/*.tsx', 'src/**/*.jsx'])

const attrName = a => a.getNameNode().getText()
const jsxAttrs = el => el.getAttributes().filter(a => a.getKind() === SyntaxKind.JsxAttribute)
const getAttr = (el, n) => jsxAttrs(el).find(a => attrName(a) === n)
const litOf = a => {
  const i = a.getInitializer()
  if (!i || i.getKind() === SyntaxKind.JsxExpression) return null
  return i.getText().replace(/^["']|["']$/g, '')
}
const VARIANT = { text: 'rounded-sm', circular: 'rounded-full', rectangular: null }
const ANIM = { pulse: null, wave: 'animate-shimmer', none: 'animate-none' }

let files = 0, els = 0
for (const sf of project.getSourceFiles()) {
  const p = sf.getFilePath()
  if (p.includes('/components/ui/')) continue

  const imp = sf.getImportDeclarations().find(d => {
    const m = d.getModuleSpecifierValue()
    return (m.includes('components/common') || m.endsWith('/common') ||
            m.startsWith('@/components/ui/')) &&
      d.getNamedImports().some(n => n.getNameNode().getText() === 'Skeleton')
  })
  if (!imp) continue

  let touched = false
  for (const el of [
    ...sf.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...sf.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ]) {
    if (el.getTagNameNode().getText() !== 'Skeleton') continue
    const add = []
    for (const [name, map] of [['variant', VARIANT], ['animation', ANIM]]) {
      const a = getAttr(el, name)
      if (!a) continue
      const v = litOf(a)
      if (v === null || !(v in map)) continue
      if (map[v]) add.push(map[v])
      a.remove(); touched = true
    }
    // width / height -> inline style, matching the wrapper's behaviour
    const styleParts = []
    for (const dim of ['width', 'height']) {
      const a = getAttr(el, dim)
      if (!a) continue
      const i = a.getInitializer()
      const node = i.getKind() === SyntaxKind.JsxExpression ? i.getExpression() : i
      const expr = node.getText()
      // Resolve literals at codemod time: emitting a typeof check around a
      // constant produces `typeof (20) === 'number'`, which is dead code and
      // an eslint no-constant-condition error.
      if (node.getKind() === SyntaxKind.NumericLiteral) {
        styleParts.push(`${dim}: '${node.getLiteralValue()}px'`)
      } else if (node.getKind() === SyntaxKind.StringLiteral) {
        styleParts.push(`${dim}: ${JSON.stringify(node.getLiteralValue())}`)
      } else {
        styleParts.push(`${dim}: typeof (${expr}) === 'number' ? \`\${${expr}}px\` : (${expr})`)
      }
      a.remove(); touched = true
    }
    if (styleParts.length && !getAttr(el, 'style'))
      el.addAttribute({ name: 'style', initializer: `{{ ${styleParts.join(', ')} }}` })

    if (add.length) {
      const cls = getAttr(el, 'className')
      if (!cls) el.addAttribute({ name: 'className', initializer: `"${add.join(' ')}"` })
      else {
        const ci = cls.getInitializer()
        if (ci.getKind() === SyntaxKind.StringLiteral)
          cls.setInitializer(`"${add.join(' ')} ${ci.getText().replace(/^["']|["']$/g, '')}"`)
        else
          cls.setInitializer(`{cn("${add.join(' ')}", ${ci.getExpression().getText()})}`)
      }
      touched = true
    }
    els++
  }
  if (!touched) continue

  const named = imp.getNamedImports()
  if (named.length === 1 && !imp.getDefaultImport()) imp.remove()
  else named.find(n => n.getNameNode().getText() === 'Skeleton').remove()
  sf.addImportDeclaration({ moduleSpecifier: '@/components/ui/skeleton', namedImports: ['Skeleton'] })
  files++
}
project.saveSync()
console.log(`Skeleton: ${files} files | ${els} elements`)
