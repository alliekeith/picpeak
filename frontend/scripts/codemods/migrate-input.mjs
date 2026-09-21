/**
 * Migrates <Input> from the removed components/common wrapper to the stock
 * shadcn Input, which has no label / error / helperText / icon props.
 *
 * Each of those is expanded into the markup the wrapper used to render:
 *
 *   <div class="w-full">
 *     <Label class="block"><span class="mb-1.5 block">LABEL</span>
 *       <div class="relative">            (only when an icon is present)
 *         ICON
 *         <Input class="pl-10" aria-invalid={!!error} ... />
 *       </div>
 *     </Label>
 *     {error && <p role="alert" class="...text-destructive">{error}</p>}
 *     {helperText && <p class="...text-muted-foreground">{helperText}</p>}
 *   </div>
 *
 * Label association: the input is nested INSIDE the Label rather than linked
 * with htmlFor/id. Implicit association needs no generated id, which matters
 * because 12 of these inputs render inside .map() callbacks where a
 * component-level useId() would hand every row the same id.
 *
 * Field errors keep the wrapper's aria-describedby contract: the message gets
 * an id and the input points at it, which ContractEditorPage's tests assert
 * (issue #1447). The id comes from one React.useId() per component plus a
 * per-field index. Inputs rendered inside a callback such as .map() cannot
 * take part — a component-level useId() would hand every row the same id — so
 * those fall back to nesting the message inside the Label, where it is read
 * with the field on focus.
 *
 * The messages deliberately do NOT carry role="alert": several screens already
 * render a single role="alert" save-error summary, and marking each field
 * error as an alert too would announce them separately and break the
 * one-summary pattern those pages rely on.
 *
 * Inputs using none of those props only have their import swapped.
 */
import { Project, SyntaxKind } from 'ts-morph'

const project = new Project({ tsConfigFilePath: 'tsconfig.app.json' })
// .jsx is included: two admin screens are still plain JSX.
project.addSourceFilesAtPaths(['src/**/*.tsx', 'src/**/*.jsx'])

const attrName = a => a.getNameNode().getText()
const jsxAttrs = el => el.getAttributes().filter(a => a.getKind() === SyntaxKind.JsxAttribute)
const getAttr = (el, n) => jsxAttrs(el).find(a => attrName(a) === n)
const rawValue = a => {
  const init = a.getInitializer()
  if (!init) return { expr: 'true', literal: true }
  if (init.getKind() === SyntaxKind.JsxExpression)
    return { expr: init.getExpression()?.getText() ?? 'true', literal: false }
  return { expr: init.getText(), literal: true }   // keeps the quotes
}
const inputs = sf => [
  ...sf.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
  ...sf.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
].filter(el => el.getTagNameNode().getText() === 'Input')

const WRAP_PROPS = ['label', 'error', 'helperText', 'leftIcon', 'rightIcon']
const HOOK_VAR = '__fieldId'

/** Nearest ancestor that looks like a React component (Uppercase name). */
function enclosingComponent(node) {
  for (const a of node.getAncestors()) {
    const k = a.getKind()
    if (k === SyntaxKind.FunctionDeclaration) {
      const n = a.getName()
      if (n && /^[A-Z]/.test(n)) return a
    }
    if (k === SyntaxKind.ArrowFunction || k === SyntaxKind.FunctionExpression) {
      const vd = a.getParentIfKind(SyntaxKind.VariableDeclaration)
      const n = vd?.getName()
      if (n && /^[A-Z]/.test(n)) return a
    }
  }
  return null
}
/** True when the node sits inside a callback (.map, .filter, ...) below its component. */
function insideCallback(node, comp) {
  for (const a of node.getAncestors()) {
    if (a === comp) return false
    if (a.getKind() === SyntaxKind.ArrowFunction || a.getKind() === SyntaxKind.FunctionExpression) {
      const vd = a.getParentIfKind(SyntaxKind.VariableDeclaration)
      const n = vd?.getName()
      if (!(n && /^[A-Z]/.test(n))) return true
    }
  }
  return false
}
function ensureHook(comp) {
  const body = comp.getBody()
  if (!body || body.getKind() !== SyntaxKind.Block) return false
  const has = body.getStatements().some(st => st.getText().includes(`const ${HOOK_VAR} =`))
  if (!has) body.insertStatements(0, `const ${HOOK_VAR} = React.useId();`)
  return true
}
let files = 0, expanded = 0, plain = 0

for (const sf of project.getSourceFiles()) {
  const p = sf.getFilePath()
  if (p.includes('/components/ui/') || p.includes('/components/common/')) continue

  const usesCommonInput = sf.getImportDeclarations().some(d => {
    const m = d.getModuleSpecifierValue()
    return (m.includes('components/common') || m.endsWith('/common')) &&
      d.getNamedImports().some(n => n.getNameNode().getText() === 'Input')
  })
  if (!usesCommonInput) continue

  let touched = false, needLabel = false

  // pass A: one React.useId() per component that owns an error-bearing input
  const idCounters = new Map()
  for (const el of inputs(sf)) {
    if (!getAttr(el, 'error')) continue
    const comp = enclosingComponent(el)
    if (!comp || insideCallback(el, comp)) continue
    ensureHook(comp)
  }

  for (;;) {
    const el = inputs(sf).find(e => WRAP_PROPS.some(n => getAttr(e, n)))
    if (!el) break

    const label = getAttr(el, 'label')
    const error = getAttr(el, 'error')
    const helper = getAttr(el, 'helperText')
    const left = getAttr(el, 'leftIcon')
    const right = getAttr(el, 'rightIcon')

    const labelV = label && rawValue(label)
    const errorV = error && rawValue(error)
    const helperV = helper && rawValue(helper)
    const leftV = left && rawValue(left)
    const rightV = right && rawValue(right)

    for (const a of [label, error, helper, left, right]) if (a) a.remove()

    // padding for icon gutters, merged into any existing className
    const extra = [leftV ? 'pl-10' : null, rightV ? 'pr-10' : null].filter(Boolean).join(' ')
    if (extra) {
      const cls = getAttr(el, 'className')
      if (!cls) el.addAttribute({ name: 'className', initializer: `"${extra}"` })
      else {
        const ci = cls.getInitializer()
        if (ci.getKind() === SyntaxKind.StringLiteral)
          cls.setInitializer(`"${extra} ${ci.getText().replace(/^["']|["']$/g, '')}"`)
        else
          cls.setInitializer(`{cn("${extra}", ${ci.getExpression().getText()})}`)
      }
    }
    if (errorV && !getAttr(el, 'aria-invalid'))
      el.addAttribute({ name: 'aria-invalid', initializer: `{!!${errorV.literal ? errorV.expr : `(${errorV.expr})`}}` })

    // Give the message an id and point the input at it, where a component
    // level useId() is usable (see the note at the top of this file).
    let errorId = null
    if (errorV) {
      const explicitId = getAttr(el, 'id')
      if (explicitId) {
        const iv = explicitId.getInitializer()
        const idExpr = iv.getKind() === SyntaxKind.JsxExpression ? iv.getExpression().getText()
          : iv.getText().replace(/^["']|["']$/g, '')
        errorId = iv.getKind() === SyntaxKind.JsxExpression
          ? '`${' + idExpr + '}-error`' : `"${idExpr}-error"`
      } else {
        const comp = enclosingComponent(el)
        if (comp && !insideCallback(el, comp)) {
          const key = comp.getPos()
          const i = idCounters.get(key) ?? 0
          idCounters.set(key, i + 1)
          errorId = '`${' + HOOK_VAR + `}-${i}-error\``
        }
      }
      if (errorId && !getAttr(el, 'aria-describedby')) {
        const cond = errorV.literal ? errorV.expr : `(${errorV.expr})`
        el.addAttribute({ name: 'aria-describedby', initializer: `{${cond} ? ${errorId} : undefined}` })
      }
    }

    // self-closing is the only shape an Input takes
    const selfText = el.getText()

    const iconSpan = (v, side) =>
      `<div className="absolute inset-y-0 ${side}-0 ${side === 'left' ? 'pl-3' : 'pr-3'} flex items-center ${side === 'left' ? 'pointer-events-none ' : ''}text-muted-foreground">${v.literal ? v.expr : `{${v.expr}}`}</div>`

    let core = selfText
    if (leftV || rightV) {
      core = `<div className="relative">${leftV ? iconSpan(leftV, 'left') : ''}${selfText}${rightV ? iconSpan(rightV, 'right') : ''}</div>`
    }

    let labelInner = ''
    if (labelV) {
      labelInner = labelV.literal ? labelV.expr.replace(/^"|"$/g, '') : `{${labelV.expr}}`
      needLabel = true
    }

    const msg = (v, cls, id) => {
      const body = v.literal ? v.expr.replace(/^"|"$/g, '') : `{${v.expr}}`
      const tag = `<p ${id ? `id={${id}} ` : ''}className="${cls}">${body}</p>`
      // The expression must be parenthesised: && binds tighter than ||, so
      // `a || b && <p/>` would parse as `a || (b && <p/>)` and the message
      // would never render for an error prop written as `err || undefined`.
      return v.literal ? tag : `{(${v.expr}) && ${tag}}`
    }
    const errP = errorV ? msg(errorV, 'mt-1.5 text-sm text-destructive', errorId) : ''
    const helpP = helperV ? msg(helperV, 'mt-1.5 text-sm text-muted-foreground') : ''

    // With a label present the messages go inside it (see the note above);
    // otherwise they sit beside the input in the wrapper.
    const out = labelV
      ? `<div className="w-full"><Label className="block"><span className="mb-1.5 block">${labelInner}</span>${core}${errP}${helpP}</Label></div>`
      : (errorV || helperV) ? `<div className="w-full">${core}${errP}${helpP}</div>` : core

    el.replaceWithText(out)
    expanded++; touched = true
  }

  // Pass A inserts the useId() hook optimistically, before it is known
  // whether a field will need a generated id (one with an explicit id
  // attribute does not). Drop the ones nothing ended up referencing.
  for (const fn of [
    ...sf.getDescendantsOfKind(SyntaxKind.FunctionDeclaration),
    ...sf.getDescendantsOfKind(SyntaxKind.ArrowFunction),
    ...sf.getDescendantsOfKind(SyntaxKind.FunctionExpression),
  ]) {
    const body = fn.getBody?.()
    if (!body || body.getKind() !== SyntaxKind.Block) continue
    const decl = body.getStatements().find(st => st.getText().includes(`const ${HOOK_VAR} =`))
    if (!decl) continue
    const uses = (body.getText().match(new RegExp(HOOK_VAR, 'g')) || []).length
    if (uses <= 1) decl.remove()
  }

  // remaining Inputs just change import
  if (inputs(sf).length) { plain += inputs(sf).length; touched = true }
  if (!touched) continue

  const imp = sf.getImportDeclarations().find(d => {
    const m = d.getModuleSpecifierValue()
    return (m.includes('components/common') || m.endsWith('/common')) &&
      d.getNamedImports().some(n => n.getNameNode().getText() === 'Input')
  })
  if (imp) {
    const named = imp.getNamedImports()
    if (named.length === 1 && !imp.getDefaultImport()) imp.remove()
    else named.find(n => n.getNameNode().getText() === 'Input').remove()
  }
  sf.addImportDeclaration({ moduleSpecifier: '@/components/ui/input', namedImports: ['Input'] })
  if (needLabel) sf.addImportDeclaration({ moduleSpecifier: '@/components/ui/label', namedImports: ['Label'] })
  files++
}

project.saveSync()
console.log(`Input: ${files} files | ${expanded} expanded | ${plain} import-only`)
