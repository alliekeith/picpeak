"""Point ConfirmDialog's rendering at the stock shadcn AlertDialog.

The promise-based useConfirm() API is unchanged: shadcn has no equivalent,
and it is app logic rather than a design-system component. Only what it
renders changes, which is where the focus trapping and aria wiring come from.
"""
p = 'src/components/common/ConfirmDialog.tsx'
s = open(p).read()

s = s.replace("""import { AlertCircle, AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';""",
"""import { AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';""", 1)

s = s.replace(""" * Keyboard: Escape cancels, Enter confirms, backdrop click cancels. The cancel
 * button is focused by default so a stray Enter doesn't accidentally confirm a
 * destructive action.""",
""" * Keyboard: Escape cancels, Enter confirms. The cancel button is focused by
 * default so a stray Enter doesn't accidentally confirm a destructive action.
 *
 * Rendering is the stock shadcn AlertDialog. AlertDialog rather than Dialog is
 * deliberate: it will not close on a backdrop click, which suits a yes/no
 * question about a destructive action, and it brings real focus trapping,
 * inert background content and the aria wiring the previous hand-rolled
 * overlay never had.""", 1)

s = s.replace("""  // Danger uses the outline button + an inline red override so the visual
  // weight matches the action without redefining a Button variant for one case.
  const confirmButtonVariant: 'primary' | 'outline' = variant === 'danger' ? 'outline' : 'primary';
  const confirmButtonClass = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
    : '';

""", """  // Danger uses shadcn's own destructive button styling rather than an
  // inline red override.

""", 1)

start = s.index("  return (\n    <ConfirmContext.Provider")
s = s[:start] + '''  const open = options !== null && options !== undefined;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog open={open} onOpenChange={(next) => { if (!next) settle(false); }}>
        {options && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-start gap-3">
                {Icon && <Icon className={`size-6 shrink-0 mt-0.5 ${iconClass}`} />}
                <div className="flex-1 min-w-0">
                  {options.title && <AlertDialogTitle>{options.title}</AlertDialogTitle>}
                  <AlertDialogDescription className="whitespace-pre-line wrap-break-word">
                    {options.message}
                  </AlertDialogDescription>
                </div>
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel ref={cancelButtonRef} onClick={() => settle(false)}>
                {options.cancelLabel ?? t('common.cancel', 'Cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => settle(true)}
                className={cn(variant === 'danger' && buttonVariants({ variant: 'destructive' }))}
              >
                {options.confirmLabel ?? t('common.confirm', 'Confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </ConfirmContext.Provider>
  );
};
'''
open(p, 'w').write(s)
print('   ConfirmDialog rendered by stock AlertDialog')
