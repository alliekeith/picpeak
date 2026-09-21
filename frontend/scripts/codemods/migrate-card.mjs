/**
 * Migrates <Card> from the removed components/common wrapper to stock shadcn.
 *
 * PicPeak's Card was a plain box with uniform padding. Stock shadcn's Card is
 * a vertical flex container with py-6 that expects CardHeader/CardContent/
 * CardFooter children to supply px-6. So a card's children are wrapped in a
 * CardContent, which reproduces the old uniform padding through shadcn's own
 * composition rather than by overriding it:
 *
 *   padding="none" -> Card py-0  + CardContent px-0
 *   padding="sm"   -> Card py-4  + CardContent px-4
 *   padding="md"   -> shadcn's defaults (py-6 / px-6)   [the old default]
 *   padding="lg"   -> Card py-8  + CardContent px-8
 *
 * Cards whose children are already shadcn sub-components are left composed
 * as they are, and only lose the padding prop.
 */
import { Project, SyntaxKind } from 'ts-morph'

const project = new Project({ tsConfigFilePath: 'tsconfig.app.json' })
// .jsx is included: two admin screens are still plain JSX.
project.addSourceFilesAtPaths(['src/**/*.tsx', 'src/**/*.jsx'])

const PAD = {
  none: ['py-0', 'px-0'],
  sm:   ['py-4', 'px-4'],
  md:   [null, null],
  lg:   ['py-8', 'px-8'],
}
const SUBS = ['CardHeader', 'CardContent', 'CardFooter', 'CardTitle', 'CardDescription', 'CardAction']

const attrName = a => a.getNameNode().getText()
const jsxAttrs = el => el.getAttributes().filter(a => a.getKind() === SyntaxKind.JsxAttribute)
const getAttr = (el, n) => jsxAttrs(el).find(a => attrName(a) === n)
const cards = sf => [
  ...sf.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
  ...sf.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
].filter(el => el.getTagNameNode().getText() === 'Card')

let files = 0, wrapped = 0, padOnly = 0

for (const sf of project.getSourceFiles()) {
  const p = sf.getFilePath()
  if (p.includes('/components/ui/')) continue

  const usesCommonCard = sf.getImportDeclarations().some(d => {
    const m = d.getModuleSpecifierValue()
    return (m.includes('components/common') || m.endsWith('/common') ||
            m.startsWith('@/components/ui/')) &&
      d.getNamedImports().some(n => ['Card', ...SUBS].includes(n.getNameNode().getText()))
  })
  if (!usesCommonCard) continue

  let touched = false, needsContent = false

  for (;;) {
    const target = cards(sf).find(el => getAttr(el, 'padding') || el.__done !== true)
    if (!target) break
    target.__done = true

    const padAttr = getAttr(target, 'padding')
    const init = padAttr?.getInitializer()
    const dynamic = init && init.getKind() === SyntaxKind.JsxExpression
    const key = padAttr && !dynamic
      ? init.getText().replace(/^["']|["']$/g, '')
      : padAttr ? null : 'md'
    if (key === null) continue          // dynamic padding: leave for review
    if (!(key in PAD)) continue

    const [pyCls, pxCls] = PAD[key]
    if (padAttr) padAttr.remove()

    if (pyCls) {
      const cls = getAttr(target, 'className')
      if (!cls) target.addAttribute({ name: 'className', initializer: `"${pyCls}"` })
      else {
        const ci = cls.getInitializer()
        if (ci.getKind() === SyntaxKind.StringLiteral)
          cls.setInitializer(`"${pyCls} ${ci.getText().replace(/^["']|["']$/g, '')}"`)
        else
          cls.setInitializer(`{cn("${pyCls}", ${ci.getExpression().getText()})}`)
      }
    }

    const parent = target.getKind() === SyntaxKind.JsxOpeningElement
      ? target.getParentIfKind(SyntaxKind.JsxElement) : null
    if (!parent) { padOnly++; touched = true; continue }

    const kids = parent.getJsxChildren()
    const alreadyComposed = kids.some(c => {
      const t = c.getKind() === SyntaxKind.JsxElement ? c.getOpeningElement().getTagNameNode().getText()
        : c.getKind() === SyntaxKind.JsxSelfClosingElement ? c.getTagNameNode().getText() : null
      return t && SUBS.includes(t)
    })
    if (alreadyComposed) { padOnly++; touched = true; continue }

    const inner = kids.map(c => c.getText()).join('')
    if (!inner.trim()) { padOnly++; touched = true; continue }

    const openTag = pxCls ? `<CardContent className="${pxCls}">` : '<CardContent>'
    parent.replaceWithText(
      `${target.getText()}${openTag}${inner}</CardContent>${parent.getClosingElement().getText()}`)
    wrapped++; needsContent = true; touched = true
  }

  if (!touched) continue

  // --- imports: move Card* from components/common to @/components/ui/card ---
  const imp = sf.getImportDeclarations().find(d => {
    const m = d.getModuleSpecifierValue()
    return (m.includes('components/common') || m.endsWith('/common') ||
            m.startsWith('@/components/ui/')) &&
      d.getNamedImports().some(n => ['Card', ...SUBS].includes(n.getNameNode().getText()))
  })
  const moved = new Set()
  if (imp) {
    for (const n of [...imp.getNamedImports()]) {
      const nm = n.getNameNode().getText()
      if (nm === 'Card' || SUBS.includes(nm)) { moved.add(nm); n.remove() }
    }
    if (imp.getNamedImports().length === 0 && !imp.getDefaultImport()) imp.remove()
  }
  if (needsContent) moved.add('CardContent')
  if (moved.size) {
    const existing = sf.getImportDeclarations()
      .find(d => d.getModuleSpecifierValue() === '@/components/ui/card')
    if (existing) {
      for (const m of moved)
        if (!existing.getNamedImports().some(n => n.getNameNode().getText() === m))
          existing.addNamedImport(m)
    } else {
      sf.addImportDeclaration({ moduleSpecifier: '@/components/ui/card', namedImports: [...moved].sort() })
    }
  }
  files++
}

project.saveSync()
console.log(`Card: ${files} files | ${wrapped} wrapped in CardContent | ${padOnly} padding-only`)
