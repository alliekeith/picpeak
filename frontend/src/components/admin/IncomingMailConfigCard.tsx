/**
 * Incoming mail (IMAP) configuration — a second block under the outgoing SMTP
 * settings, styled to match the SMTP card (icon inputs, password eye toggle,
 * full-width Save). Shown only when the `incomingMail` feature flag is on.
 *
 * The Folder field auto-detects: "Detect folders" lists the mailboxes on the
 * server and offers them as a dropdown (auto-selecting the inbox), instead of
 * making the admin type a path.
 */
import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Save, Server, User, Lock, Eye, EyeOff, FolderSearch, PlugZap, Mailbox, RefreshCw, Loader2 } from 'lucide-react';
import { Loading } from '../common';
import { emailService, type IncomingMailConfig, type ImapFolder } from '../../services/email.service';
import { useMutationWithToast, useModal } from '../../hooks';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const labelCls = 'block text-sm font-medium text-foreground mb-1';
const selectCls = 'w-full px-3 py-2 border border-border bg-card text-foreground rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-primary';

export const IncomingMailConfigCard: React.FC = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['incoming-mail-config'], queryFn: () => emailService.getIncomingConfig() });
  const [cfg, setCfg] = useState<IncomingMailConfig>({ imap_host: '', imap_port: 993, imap_secure: true, imap_user: '', imap_pass: '', imap_folder: 'INBOX' });
  const passwordVisibilityModal = useModal();
  const [folders, setFolders] = useState<ImapFolder[] | null>(null);

  useEffect(() => { if (data) setCfg(data); }, [data]);

  const set = (k: keyof IncomingMailConfig, v: any) => setCfg((c) => ({ ...c, [k]: v }));

  const save = useMutationWithToast({
    mutationFn: () => {
      // Mirror the SMTP card's client-side required guard. Host + port +
      // username are needed for the poller to authenticate (getImapConfig
      // returns null without host+user).
      if (!cfg.imap_host || !cfg.imap_port || !cfg.imap_user) {
        return Promise.reject(new Error(t('email.incoming.requiredFields', 'Host, port and username are required.')));
      }
      return emailService.updateIncomingConfig(cfg);
    },
    successMessage: t('email.incoming.savedToast', 'Incoming mail settings saved.'),
    invalidateKeys: [['incoming-mail-config']],
    errorMessage: (e: any) => e?.response?.data?.error || e?.response?.data?.errors?.[0]?.msg || e.message || 'Failed',
  });

  const test = useMutationWithToast({
    mutationFn: () => emailService.testIncoming(cfg),
    successMessage: (r) => t('email.incoming.testOk', 'Connected to {{folder}} — {{messages}} messages, {{unseen}} unread.', { folder: r.folder, messages: r.messages, unseen: r.unseen }),
    errorMessage: (e: any) => e?.response?.data?.error || e.message || t('email.incoming.testFailed', 'Connection failed.'),
  });

  const roundTrip = useMutationWithToast({
    mutationFn: () => emailService.roundTripIncoming(),
    successMessage: (r) => t('email.incoming.roundTripOk', 'Round-trip OK — delivered to {{recipient}} in {{seconds}}s.', { recipient: r.recipient, seconds: r.seconds }),
    errorMessage: (e: any) => e?.response?.data?.error || e.message || t('email.incoming.roundTripFailed', 'Round-trip test failed.'),
  });

  const poll = useMutation({
    mutationFn: () => emailService.pollIncoming(),
    onSuccess: (r) => {
      if (r.skipped === 'disabled') {
        toast.info(t('email.incoming.pollDisabled', 'Incoming mail is turned off — enable it under Settings → Features.'));
      } else if (r.skipped === 'unconfigured') {
        toast.info(t('email.incoming.pollUnconfigured', 'Save the incoming mail settings first.'));
      } else if (r.skipped === 'busy') {
        toast.info(t('email.incoming.pollBusy', 'A poll is already running — try again in a moment.'));
      } else {
        toast.success(t('email.incoming.pollOk', 'Checked mailbox — {{count}} new email(s) ingested.', { count: r.processed || 0 }));
        qc.invalidateQueries({ queryKey: ['received-emails'] });
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || e.message || t('email.incoming.pollFailed', 'Mailbox poll failed.')),
  });

  const detect = useMutation({
    mutationFn: () => emailService.listIncomingFolders(cfg),
    onSuccess: (list) => {
      setFolders(list);
      if (list.length) {
        // Auto-select the inbox (special-use '\Inbox', else a path named INBOX)
        // when the current folder isn't one of the detected ones.
        const has = list.some((f) => f.path === cfg.imap_folder);
        if (!has) {
          const inbox = list.find((f) => (f.specialUse || '').toLowerCase().includes('inbox'))
            || list.find((f) => f.path.toUpperCase() === 'INBOX') || list[0];
          if (inbox) set('imap_folder', inbox.path);
        }
        toast.success(t('email.incoming.foldersDetected', '{{count}} folders found.', { count: list.length }));
      } else {
        toast.info(t('email.incoming.noFolders', 'No folders returned by the server.'));
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || e.message || t('email.incoming.detectFailed', 'Could not detect folders.')),
  });

  if (isLoading) return <Loading />;

  return (
    <Card className="mt-6"><CardContent><h2 className="text-lg font-semibold text-foreground mb-1">{t('email.incoming.title', 'Incoming mail (IMAP)')}</h2><p className="text-sm text-muted-foreground mb-4">{t('email.incoming.subtitle', 'A dedicated mailbox polled every minute; attachments land in Accounting → Incoming invoices.')}</p><div className="space-y-4">
              <div>
                <label className={labelCls}>{t('email.incoming.host', 'IMAP Host')} <span className="text-red-500">*</span></label>
                <div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">{<Server className="w-5 h-5 text-muted-foreground" />}</div><Input
                                type="text"
                                value={cfg.imap_host}
                                onChange={(e) => set('imap_host', e.target.value)}
                                placeholder="imap.example.com" className="pl-10"
                              /></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t('email.incoming.port', 'Port')} <span className="text-red-500">*</span></label>
                  <Input type="number" value={cfg.imap_port} onChange={(e) => set('imap_port', parseInt(e.target.value, 10) || 0)} placeholder="993" />
                </div>
                <div>
                  <label className={labelCls}>{t('email.incoming.security', 'Security')}</label>
                  <select className={selectCls} value={cfg.imap_secure ? 'ssl' : 'plain'} onChange={(e) => set('imap_secure', e.target.value === 'ssl')}>
                    <option value="ssl">{t('email.incoming.ssl', 'SSL/TLS')}</option>
                    <option value="plain">{t('email.incoming.plain', 'None / STARTTLS')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>{t('email.incoming.user', 'Username')} <span className="text-red-500">*</span></label>
                <div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">{<User className="w-5 h-5 text-muted-foreground" />}</div><Input
                                type="text"
                                value={cfg.imap_user}
                                onChange={(e) => set('imap_user', e.target.value)}
                                autoComplete="off"
                                placeholder="rechnungen@yourdomain.com" className="pl-10"
                              /></div>
              </div>

              <div>
                <label className={labelCls}>{t('email.incoming.pass', 'Password')}</label>
                <div className="relative">
                  <div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">{<Lock className="w-5 h-5 text-muted-foreground" />}</div><Input
                                      type={passwordVisibilityModal.isOpen ? 'text' : 'password'}
                                      value={cfg.imap_pass}
                                      onChange={(e) => set('imap_pass', e.target.value)}
                                      autoComplete="new-password"
                                      placeholder={t('email.enterPassword', 'Enter password')} className="pl-10"
                                    /></div>
                  <button type="button" onClick={passwordVisibilityModal.toggle} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
                    {passwordVisibilityModal.isOpen ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={labelCls}>{t('email.incoming.folder', 'Folder')}</label>
                <div className="flex gap-2">
                  {folders && folders.length > 0 ? (
                    <select className={selectCls} value={cfg.imap_folder} onChange={(e) => set('imap_folder', e.target.value)}>
                      {folders.some((f) => f.path === cfg.imap_folder) ? null : <option value={cfg.imap_folder}>{cfg.imap_folder}</option>}
                      {folders.map((f) => <option key={f.path} value={f.path}>{f.path}</option>)}
                    </select>
                  ) : (
                    <Input type="text" value={cfg.imap_folder} onChange={(e) => set('imap_folder', e.target.value)} placeholder="INBOX" />
                  )}
                  <Button
                                          variant="outline"
                                          onClick={() => detect.mutate()}
                                          className="whitespace-nowrap" disabled={!cfg.imap_host || !cfg.imap_user || detect.isPending}
                                        >
                                          {detect.isPending && <Loader2 className="animate-spin" />}<FolderSearch className="w-4 h-4" />{t('email.incoming.detectFolders', 'Detect')}</Button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t('email.incoming.folderHint', 'Enter host, username and password, then Detect to list the mailbox folders.')}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                                    variant="outline"
                                    onClick={() => test.mutate()}
                                    className="whitespace-nowrap" disabled={!cfg.imap_host || !cfg.imap_user || test.isPending}
                                  >
                                    {test.isPending && <Loader2 className="animate-spin" />}<PlugZap className="w-5 h-5" />{t('email.incoming.test', 'Test connection')}</Button>
                <Button
                                    variant="outline"
                                    onClick={() => roundTrip.mutate()}
                                    className="whitespace-nowrap"
                                    title={t('email.incoming.roundTripHint', 'Sends a test email via your SMTP settings to this mailbox and confirms it arrives. Save both first.') as string} disabled={!cfg.imap_host || !cfg.imap_user || roundTrip.isPending}
                                  >
                                    {roundTrip.isPending && <Loader2 className="animate-spin" />}<Mailbox className="w-5 h-5" />{t('email.incoming.roundTrip', 'Round-trip test')}</Button>
                <Button
                                    variant="outline"
                                    onClick={() => poll.mutate()}
                                    className="whitespace-nowrap"
                                    title={t('email.incoming.pollHint', 'Check the mailbox now instead of waiting for the 60-second poll. Ingests unread attachments into Incoming invoices.') as string} disabled={!cfg.imap_host || !cfg.imap_user || poll.isPending}
                                  >
                                    {poll.isPending && <Loader2 className="animate-spin" />}<RefreshCw className="w-5 h-5" />{t('email.incoming.poll', 'Check now')}</Button>
                <Button onClick={() => save.mutate()} className="flex-1 min-w-48" disabled={save.isPending}>
                                    {save.isPending && <Loader2 className="animate-spin" />}<Save className="w-5 h-5" />{t('email.incoming.save', 'Save Incoming Mail Settings')}</Button>
              </div>
            </div></CardContent></Card>
  );
};

export default IncomingMailConfigCard;
