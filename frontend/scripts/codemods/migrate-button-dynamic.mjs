/**
 * Second Button pass: variant/size values written as expressions rather than
 * plain strings, e.g. variant={isActive ? 'primary' : 'outline'}.
 *
 * The first pass deliberately skipped these (rewriting an arbitrary
 * expression blind is unsafe), so TypeScript flagged them. Here only the
 * string literals *inside* a Button's variant/size attribute are renamed,
 * which keeps the surrounding logic untouched.
 */
import { Project, SyntaxKind } from 'ts-morph'

const project = new Project({ tsConfigFilePath: 'tsconfig.app.json' })
project.addSourceFilesAtPaths(['src/**/*.tsx'])

const VARIANT = { primary: 'default' }          // secondary/outline/ghost already match
const SIZE = { md: 'default' }                  // sm/lg already match

const attrName = a => a.getNameNode().getText()
let edits = 0, files = new Set()

for (const sf of project.getSourceFiles()) {
  const p = sf.getFilePath()
  if (p.includes('/components/ui/') || p.includes('/components/common/')) continue

  for (const el of [
    ...sf.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...sf.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ]) {
    if (el.getTagNameNode().getText() !== 'Button') continue
    for (const a of el.getAttributes()) {
      if (a.getKind() !== SyntaxKind.JsxAttribute) continue
      const name = attrName(a)
      const map = name === 'variant' ? VARIANT : name === 'size' ? SIZE : null
      if (!map) continue
      const init = a.getInitializer()
      if (!init || init.getKind() !== SyntaxKind.JsxExpression) continue
      for (const lit of init.getDescendantsOfKind(SyntaxKind.StringLiteral)) {
        const v = lit.getLiteralValue()
        if (v in map) { lit.setLiteralValue(map[v]); edits++; files.add(p) }
      }
    }
  }
}

project.saveSync()
console.log(`Button (dynamic): ${edits} literals in ${files.size} files`)
