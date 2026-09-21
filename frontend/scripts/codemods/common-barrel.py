"""Drop Button / Input / Card from the components/common barrel."""
p = 'src/components/common/index.ts'
s = open(p).read()
for line in ("export { Button } from './Button';\n",
             "export { Input } from './Input';\n",
             "export { Card, CardHeader, CardContent, CardFooter } from './Card';\n"):
    s = s.replace(line, "")
s = ("""/*
 * App-level shared components.
 *
 * Button, Input and Card used to be re-exported from here as PicPeak's own
 * design-system layer. They are gone: the stock shadcn equivalents are
 * imported directly from @/components/ui/* at each call site. What is left
 * below is PicPeak-specific and has no shadcn counterpart.
 */
""" + s)
open(p, 'w').write(s)
print('   components/common barrel updated')
