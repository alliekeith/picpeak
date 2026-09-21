import React, { useEffect, useRef, useState } from 'react';
import type { TFunction } from 'i18next';
import { useMutation } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { X, Send as SendIcon, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { emailService } from '../../../services/email.service';
import { Button } from "@/components/ui/button";

/**
 * Compose / reply modal. The body is pre-loaded with the rendered template (or a
 * reply stub) and is FULLY EDITABLE — the admin can rewrite it or drop a note
 * anywhere before sending. On send it goes out as-is (server-sanitized), no
 * template re-render, and is recorded as a manual send (Customers ▸ Sent).
 */
export interface ComposerInit {
  to: string;
  cc?: string;
  subject: string;
  html: string;
  replyToReceivedId?: number;
}

const inputCls = 'flex-1 px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-brand';

export const MessageComposer: React.FC<{
  init: ComposerInit;
  title?: string;
  accountKey?: string;
  onClose: () => void;
  onSent: () => void;
  t: TFunction;
}> = ({ init, title, accountKey, onClose, onSent, t }) => {
  const [to, setTo] = useState(init.to);
  const [cc, setCc] = useState(init.cc || '');
  const [subject, setSubject] = useState(init.subject);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Sanitize before it hits the contentEditable innerHTML — the initial body
    // can include untrusted text (e.g. an inbound sender name in a reply stub).
    if (bodyRef.current) bodyRef.current.innerHTML = DOMPurify.sanitize(init.html || '');
    // Load initial body exactly once; further edits are the admin's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const send = useMutation({
    mutationFn: () => emailService.sendMessage({
      to: to.trim(),
      cc: cc.trim() || undefined,
      subject: subject.trim(),
      html: bodyRef.current?.innerHTML || '',
      replyToReceivedId: init.replyToReceivedId,
      accountKey,
    }),
    onSuccess: () => { toast.success(t('messages.sentToast', 'Message sent.')); onSent(); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.error || e.message || t('messages.sendFailed', 'Failed to send message.')),
  });

  const canSend = !!to.trim() && !!subject.trim() && !send.isPending;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" onClick={onClose}>
      <div className="bg-card rounded-xl w-[min(920px,97vw)] h-[min(780px,92vh)] flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground">{title || t('messages.compose', 'Compose message')}</span>
          <button onClick={onClose} className="ml-auto w-8 h-8 grid place-items-center rounded-lg text-muted-foreground hover:bg-accent" aria-label={t('messages.close', 'Close')}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3 overflow-y-auto flex-1 min-h-0">
          <label className="flex items-center gap-2 text-sm">
            <span className="w-16 text-muted-foreground">{t('messages.to', 'To')}</span>
            <input className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@example.com" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="w-16 text-muted-foreground">Cc</span>
            <input className={inputCls} value={cc} onChange={(e) => setCc(e.target.value)} placeholder={t('messages.optional', 'optional')} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="w-16 text-muted-foreground">{t('messages.subject', 'Subject')}</span>
            <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="text-xs text-muted-foreground mb-1">
              {t('messages.bodyHint', 'Edit the message freely — add a note anywhere before sending.')}
            </div>
            <div
              ref={bodyRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              className="min-h-[240px] flex-1 overflow-y-auto rounded-lg border border-border bg-card p-3 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
          <span className="text-xs text-muted-foreground">{t('messages.sendsFromHint', 'Sends from your configured outgoing address.')}</span>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={onClose}>{t('messages.cancel', 'Cancel')}</Button>
            <Button onClick={() => send.mutate()} disabled={!canSend || send.isPending}>
                                    {send.isPending && <Loader2 className="animate-spin" />}<SendIcon className="w-4 h-4" />{t('messages.send', 'Send')}</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageComposer;
