/**
 * Migrates <Button> from the removed components/common wrapper to the stock
 * shadcn Button in @/components/ui/button.
 *
 *   variant="primary" -> omitted ("default" is shadcn's default)
 *   size="md"         -> omitted (shadcn's default)
 *   isLoading={x}     -> disabled merged with x, plus a <Loader2/> child
 *   leftIcon={<I/>}   -> <I/> hoisted to first child
 *   rightIcon={<I/>}  -> <I/> appended as last child
 *
 * Stock shadcn Button supplies gap-2 and sizes svg children to 4x4, so a
 * hoisted icon renders where leftIcon used to.
 *
 * Structural edits invalidate ts-morph nodes, so they are applied one at a
 * time and the file is re-queried after each.
 */
import { Project, SyntaxKind } from 'ts-morph'

const project = new Project({ tsConfigFilePath: 'tsconfig.app.json' })
// .jsx is included: two admin screens are still plain JSX.
project.addSourceFilesAtPaths(['src/**/*.tsx', 'src/**/*.jsx'])

const VARIANT = { primary: null, secondary: 'secondary', outline: 'outline', ghost: 'ghost' }
const SIZE = { md: null, sm: 'sm', lg: 'lg' }

const jsxAttrs = (el) =>
  el.getAttributes().filter(a => a.getKind() === SyntaxKind.JsxAttribute)
// ts-morph 28 dropped JsxAttribute#getName(); read the name node instead.
const attrName = (a) => a.getNameNode().getText()
const getAttr = (el, name) => jsxAttrs(el).find(a => attrName(a) === name)
const valueOf = (a) => {
  const init = a.getInitializer()
  if (!init) return 'true'
  if (init.getKind() === SyntaxKind.JsxExpression) return init.getExpression()?.getText() ?? 'true'
  return init.getText().replace(/^["']|["']$/g, '')
}
const buttonOpens = (sf) => [
  ...sf.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
  ...sf.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
].filter(el => el.getTagNameNode().getText() === 'Button')

let files = 0, attrEdits = 0, structEdits = 0, loaderFiles = 0

for (const sf of project.getSourceFiles()) {
  const p = sf.getFilePath()
  if (p.includes('/components/ui/')) continue

  const impGuard = sf.getImportDeclarations().find(d => {
    const m = d.getModuleSpecifierValue()
    return (m.includes('components/common') || m.endsWith('/common') ||
            m.startsWith('@/components/ui/')) &&
      d.getNamedImports().some(n => n.getNameNode().getText() === 'Button')
  })
  if (!impGuard) continue

  let touched = false, needsLoader = false

  // ---- pass 1: attribute-only rewrites (no structural change) ----
  for (const el of buttonOpens(sf)) {
    for (const [name, map] of [['variant', VARIANT], ['size', SIZE]]) {
      const a = getAttr(el, name)
      if (!a) continue
      const init = a.getInitializer()
      if (!init || init.getKind() === SyntaxKind.JsxExpression) continue // dynamic -> leave
      const cur = init.getText().replace(/^["']|["']$/g, '')
      if (!(cur in map)) continue
      if (map[cur] === null) a.remove()
      else a.setInitializer(`"${map[cur]}"`)
      attrEdits++; touched = true
    }
  }

  // ---- pass 2: structural rewrites, one at a time ----
  for (;;) {
    const target = buttonOpens(sf).find(el =>
      getAttr(el, 'isLoading') || getAttr(el, 'leftIcon') || getAttr(el, 'rightIcon'))
    if (!target) break

    const loading = getAttr(target, 'isLoading')
    const left = getAttr(target, 'leftIcon')
    const right = getAttr(target, 'rightIcon')

    const cond = loading ? valueOf(loading) : null
    const leftTxt = left ? valueOf(left) : null
    const rightTxt = right ? valueOf(right) : null

    if (loading) {
      const dis = getAttr(target, 'disabled')
      const merged = dis ? `${valueOf(dis)} || ${cond}` : cond
      if (dis) dis.remove()
      loading.remove()
      target.addAttribute({ name: 'disabled', initializer: `{${merged}}` })
      needsLoader = true
    }
    if (left) left.remove()
    if (right) right.remove()

    // A bare JSX element does not need to be wrapped in braces as a child;
    // anything else (a variable, a call) still does.
    const asChild = (t) => (/^<[\s\S]*>$/.test(t.trim()) ? t.trim() : `{${t}}`)

    const spinner = cond ? `{${cond} && <Loader2 className="animate-spin" />}` : null
    const pre = [spinner, leftTxt ? asChild(leftTxt) : null].filter(Boolean).join('')
    const post = rightTxt ? asChild(rightTxt) : ''

    const isSelfClosing = target.getKind() === SyntaxKind.JsxSelfClosingElement
    // Indentation of the line the element starts on, so inserted children
    // line up with the surrounding JSX instead of collapsing onto one line.
    const col = target.getStartLinePos()
    const lineStart = target.getSourceFile().getFullText().slice(col).match(/^[ \t]*/)[0]
    const pad = lineStart + '  '

    if (isSelfClosing) {
      const openText = target.getText().replace(/\s*\/>$/, '>')
      const kids = [pre, post].filter(Boolean).map(k => `\n${pad}${k}`).join('')
      target.replaceWithText(`${openText}${kids}\n${lineStart}</Button>`)
    } else {
      const parent = target.getParentIfKind(SyntaxKind.JsxElement)
      const inner = parent.getJsxChildren().map(c => c.getText()).join('')
      const head = pre ? `\n${pad}${pre}` : ''
      const tail = post ? `\n${pad}${post}` : ''
      parent.replaceWithText(
        `${target.getText()}${head}${inner}${tail}${parent.getClosingElement().getText()}`)
    }
    structEdits++; touched = true
  }

  if (!touched) continue

  // ---- imports ----
  // Structural replaceWithText above can invalidate previously held nodes,
  // so the import declaration is looked up again rather than reused.
  const imp2 = sf.getImportDeclarations().find(d => {
    const m = d.getModuleSpecifierValue()
    return (m.includes('components/common') || m.endsWith('/common') ||
            m.startsWith('@/components/ui/')) &&
      d.getNamedImports().some(n => n.getNameNode().getText() === 'Button')
  })
  if (!imp2) { files++; continue }
  const imp = imp2
  const named = imp.getNamedImports()
  if (named.length === 1) imp.remove()
  else named.find(n => n.getNameNode().getText() === 'Button').remove()
  sf.addImportDeclaration({ moduleSpecifier: '@/components/ui/button', namedImports: ['Button'] })

  if (needsLoader) {
    const lucide = sf.getImportDeclarations()
      .find(d => d.getModuleSpecifierValue() === 'lucide-react')
    if (lucide) {
      if (!lucide.getNamedImports().some(n => n.getNameNode().getText() === 'Loader2')) lucide.addNamedImport('Loader2')
    } else {
      sf.addImportDeclaration({ moduleSpecifier: 'lucide-react', namedImports: ['Loader2'] })
    }
    loaderFiles++
  }
  files++
}

project.saveSync()
console.log(`Button: ${files} files | ${attrEdits} prop rewrites | ${structEdits} structural rewrites | ${loaderFiles} files gained Loader2`)
