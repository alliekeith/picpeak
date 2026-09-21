import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, AlertTriangle } from 'lucide-react';
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
} from '@/components/ui/alert-dialog';

/**
 * Promise-based confirm dialog (#640 part C, ported from 8digit/picpeak@88bfde1).
 *
 * Replaces `window.confirm()` with a styled, themed, accessible in-app modal.
 * Usage:
 *
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title: 'Delete event?',
 *     message: 'This will permanently remove the gallery and all photos.',
 *     variant: 'danger',
 *     confirmLabel: 'Delete',
 *   });
 *   if (ok) doDelete();
 *
 * Wraps once at the App level via <ConfirmDialogProvider />; every component
 * below it gets `useConfirm()` for free. Variants:
 *   - 'primary' (default) — plain confirm, no icon
 *   - 'danger'            — red AlertCircle, red confirm button
 *   - 'warning'           — amber AlertTriangle
 *
 * Keyboard: Escape cancels, Enter confirms. The cancel button is focused by
 * default so a stray Enter doesn't accidentally confirm a destructive action.
 *
 * Rendering is the stock shadcn AlertDialog. AlertDialog rather than Dialog is
 * deliberate: it will not close on a backdrop click, which suits a yes/no
 * question about a destructive action, and it brings real focus trapping,
 * inert background content and the aria wiring the previous hand-rolled
 * overlay never had.
 *
 * This is the generic primitive. Existing inline-modal flows (PublishGalleryDialog,
 * DuplicateEventDialog, PasswordResetModal, etc.) stay as-is — they collect
 * structured input, not a simple yes/no. Call-site sweeps of `window.confirm()`
 * follow in later PRs.
 */

export type ConfirmVariant = 'primary' | 'danger' | 'warning';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

type Resolver = (value: boolean) => void;

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export const useConfirm = (): ((options: ConfirmOptions) => Promise<boolean>) => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmDialogProvider');
  }
  return ctx.confirm;
};

export const ConfirmDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<Resolver | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      // If a prior confirm is still open (shouldn't happen in practice but
      // guard anyway), resolve it as cancelled before opening the new one.
      if (resolverRef.current) {
        resolverRef.current(false);
      }
      resolverRef.current = resolve;
      setOptions(opts);
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    if (resolverRef.current) {
      resolverRef.current(value);
      resolverRef.current = null;
    }
    setOptions(null);
  }, []);

  useEffect(() => {
    if (!options) return;
    cancelButtonRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        settle(false);
      } else if (e.key === 'Enter') {
        // Don't hijack Enter when the focus is in an editable element — covers
        // the (unusual) case where a confirm is open over an open input.
        const tag = (document.activeElement as HTMLElement | null)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        settle(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [options, settle]);

  const variant = options?.variant ?? 'primary';
  const Icon = variant === 'danger' ? AlertCircle : variant === 'warning' ? AlertTriangle : null;
  const iconClass =
    variant === 'danger'
      ? 'text-red-600 dark:text-red-400'
      : variant === 'warning'
        ? 'text-amber-600 dark:text-amber-400'
        : '';

  // Danger uses shadcn's own destructive button styling rather than an
  // inline red override.

  const open = options !== null && options !== undefined;

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
