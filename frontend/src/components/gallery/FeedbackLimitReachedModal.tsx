import React from 'react';
import { Heart, Bookmark } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Per-guest cap modal (#655). Shown when the guest clicks the heart or
 * thumbs-up on a photo that would exceed the per-event cap set by the
 * photographer.
 *
 * Single OK button rather than confirm/cancel — this is an acknowledgement,
 * not a decision.
 *
 * Built on the stock shadcn Dialog, which replaces what this component used
 * to do by hand: its own portal, its own Escape listener, its own backdrop
 * click handling and its own initial focus call. Radix also adds the parts
 * that were missing — a focus trap, focus restored to the trigger on close,
 * and background content marked inert for screen readers.
 *
 * z-index note: the lightbox sits at z-50 and DialogContent/DialogOverlay are
 * also z-50, but the dialog portals to the end of <body>, so it paints above
 * the lightbox in document order.
 */
export interface FeedbackLimitReachedModalProps {
  open: boolean;
  feedbackType: 'favorite' | 'like';
  limit: number;
  currentCount: number;
  onClose: () => void;
}

export const FeedbackLimitReachedModal: React.FC<FeedbackLimitReachedModalProps> = ({
  open,
  feedbackType,
  limit,
  currentCount,
  onClose,
}) => {
  const { t } = useTranslation();

  const isFavorite = feedbackType === 'favorite';
  const Icon = isFavorite ? Bookmark : Heart;
  const title = isFavorite
    ? t('feedback.limit.favoriteTitle', 'Favorite limit reached')
    : t('feedback.limit.likeTitle', 'Like limit reached');
  const body = isFavorite
    ? t(
      'feedback.limit.favoriteBody',
      'You can favorite up to {{limit}} photos in this gallery. Remove one to add a new one.',
      { limit },
    )
    : t(
      'feedback.limit.likeBody',
      'You can like up to {{limit}} photos in this gallery. Remove one to add a new one.',
      { limit },
    );

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div
              className={`shrink-0 size-11 sm:size-12 rounded-full flex items-center justify-center ${
                isFavorite ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-rose-100 dark:bg-rose-900/40'
              }`}
            >
              <Icon
                className={`size-6 ${isFavorite ? 'text-amber-600 dark:text-amber-300' : 'text-rose-600 dark:text-rose-300'}`}
                aria-hidden="true"
              />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-1 leading-relaxed">{body}</DialogDescription>
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-foreground bg-muted rounded-full px-3 py-1">
                {t('feedback.limit.counter', '{{current}} of {{limit}} used', {
                  current: currentCount,
                  limit,
                })}
              </p>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          {/* autoFocus keeps the old behaviour of landing on OK, so the modal
              can be dismissed straight away with Enter or Space. */}
          <Button autoFocus onClick={onClose} className="w-full sm:w-auto">
            {t('feedback.limit.ok', 'Got it')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
