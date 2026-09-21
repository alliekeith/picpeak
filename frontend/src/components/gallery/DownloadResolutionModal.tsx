import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Check, AlertCircle, Loader2 } from 'lucide-react';
import { galleryService } from '../../services/gallery.service';
import type { DownloadResolutionChoice, DownloadJobStatus } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Resolution picker for gallery downloads (#858).
 *
 * Shown after "Download all"/"Download selected" when the gallery has the
 * picker enabled. A non-standard size has nothing cached behind it and can
 * take minutes to build, so the server prepares it as a job and this modal
 * walks the three states the build actually has:
 *
 *   choose → preparing (poll) → ready (click to download)
 *
 * The download itself is a native browser navigation, so the archive streams
 * with Content-Length and the browser shows a real progress bar rather than
 * us buffering a multi-GB blob in memory.
 */

const POLL_MS = 1500;
// Give up after ~10 minutes of polling. The job may well still finish server
// side; this only stops the modal spinning forever in front of the user.
const MAX_POLLS = (10 * 60 * 1000) / POLL_MS;

type Phase = 'choose' | 'preparing' | 'ready' | 'error';

interface DownloadResolutionModalProps {
  slug: string;
  choices: DownloadResolutionChoice[];
  /** The gallery's own standard size — served from the pre-built archive. */
  standardResolution?: string;
  /** Omitted = the whole gallery. */
  photoIds?: number[];
  onClose: () => void;
}

export const DownloadResolutionModal: React.FC<DownloadResolutionModalProps> = ({
  slug,
  choices,
  standardResolution,
  photoIds,
  onClose,
}) => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('choose');
  const [selected, setSelected] = useState<string>(choices[0]?.id ?? 'original');
  const [error, setError] = useState<string | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const tokenRef = useRef<string | null>(null);
  // Guards the polling loop against running on after unmount / close.
  const activeRef = useRef(true);

  useEffect(() => () => { activeRef.current = false; }, []);

  const filename = `${slug}-${selected === 'original' ? 'original' : selected}.zip`;

  const poll = useCallback(async (token: string) => {
    for (let i = 0; i < MAX_POLLS; i += 1) {
      if (!activeRef.current) return;
      await new Promise((r) => setTimeout(r, POLL_MS));
      if (!activeRef.current) return;
      try {
        const state = await galleryService.getDownloadJob(slug, token);
        setPhotoCount(state.photo_count || 0);
        if (state.status === 'ready') {
          setPhase('ready');
          return;
        }
        if (state.status === 'failed') {
          setError(state.error || t('gallery.downloadPrepFailed', 'Preparation failed'));
          setPhase('error');
          return;
        }
      } catch {
        setError(t('gallery.downloadPrepFailed', 'Preparation failed'));
        setPhase('error');
        return;
      }
    }
    setError(t('gallery.downloadPrepTimeout', 'This is taking longer than expected. Please try again.'));
    setPhase('error');
  }, [slug, t]);

  const start = useCallback(async () => {
    // Whole-gallery download at the gallery's OWN standard size is exactly
    // what the pre-built archive already contains — take it instead of
    // re-resizing and re-packaging the entire gallery for the same bytes.
    if (!photoIds && selected === standardResolution) {
      await galleryService.downloadAllPhotos(slug, true);
      onClose();
      return;
    }

    setPhase('preparing');
    setError(null);
    try {
      const job = await galleryService.startDownloadJob(slug, selected, photoIds);
      tokenRef.current = job.token;
      // A job can be deduped onto an already-finished build, in which case
      // there is nothing to wait for.
      if ((job.status as DownloadJobStatus) === 'ready') {
        setPhase('ready');
        return;
      }
      await poll(job.token);
    } catch {
      setError(t('gallery.downloadPrepFailed', 'Preparation failed'));
      setPhase('error');
    }
  }, [slug, selected, photoIds, poll, t, standardResolution, onClose]);

  const download = useCallback(() => {
    if (!tokenRef.current) return;
    galleryService.downloadJobFile(slug, tokenRef.current, filename);
    onClose();
  }, [slug, filename, onClose]);

  // Escape, the backdrop click, the focus trap and the close button all come
  // from the stock Dialog now; this component used to hand-roll each of them.

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('gallery.chooseResolution', 'Choose a download size')}</DialogTitle>
        </DialogHeader>
        {phase === 'choose' && (
                    <>
                      <div className="space-y-2 mb-5">
                        {choices.map((choice) => (
                          <label
                            key={choice.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              selected === choice.id
                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                                : 'border-border hover:bg-accent'
                            }`}
                          >
                            <input
                              type="radio"
                              name="download-resolution"
                              value={choice.id}
                              checked={selected === choice.id}
                              onChange={() => setSelected(choice.id)}
                              className="accent-brand-600"
                            />
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm font-medium text-foreground">
                                {choice.label}
                              </span>
                              {choice.width && choice.height && (
                                <span className="block text-xs text-muted-foreground">
                                  {t('gallery.resolutionUpTo', 'up to {{width}} × {{height}} px', {
                                    width: choice.width,
                                    height: choice.height,
                                  })}
                                </span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={onClose}>
                          {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button onClick={start}>
                                                    <Download className="w-4 h-4" />{t('gallery.prepareDownload', 'Prepare download')}</Button>
                      </div>
                    </>
        )}
        {phase === 'preparing' && (
                    <div className="py-6 text-center">
                      <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-brand-600" />
                      <p className="text-sm font-medium text-foreground">
                        {t('gallery.preparingDownload', 'Preparing your download…')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {photoCount > 0
                          ? t('gallery.preparingProgress', '{{count}} photos packaged', { count: photoCount })
                          : t('gallery.preparingHint', 'Resizing photos — this can take a moment for large galleries.')}
                      </p>
                    </div>
        )}
        {phase === 'ready' && (
                    <div className="py-6 text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <p className="text-sm font-medium text-foreground mb-4">
                        {t('gallery.downloadReady', 'Your download is ready')}
                      </p>
                      <Button onClick={download}>
                                              <Download className="w-4 h-4" />{t('gallery.downloadNow', 'Download')}</Button>
                    </div>
        )}
        {phase === 'error' && (
                    <div className="py-6 text-center">
                      <AlertCircle className="w-8 h-8 mx-auto mb-3 text-red-600 dark:text-red-400" />
                      <p className="text-sm text-foreground mb-4">{error}</p>
                      <div className="flex justify-center gap-2">
                        <Button variant="outline" onClick={onClose}>
                          {t('common.close', 'Close')}
                        </Button>
                        <Button onClick={() => setPhase('choose')}>
                          {t('common.retry', 'Try again')}
                        </Button>
                      </div>
                    </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
