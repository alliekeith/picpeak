/**
 * Received-emails feed — read-only, paginated view of the received_emails log
 * (the IMAP poller's audit trail). Rendered as the "Received emails" tab in
 * EmailConfigPage, next to "Sent emails".
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Inbox, Paperclip } from 'lucide-react';
import { Loading } from '../common';
import { useLocalizedDate } from '../../hooks/useLocalizedDate';
import { emailService } from '../../services/email.service';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const statusClass = (s: string): string =>
  s === 'ingested' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
    : s === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
      : 'bg-muted text-foreground';

export const ReceivedEmailsPanel: React.FC = () => {
  const { t } = useTranslation();
  const { formatDateTime: fmtDateTime } = useLocalizedDate();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ['received-emails', page], queryFn: () => emailService.listReceived({ page, pageSize: 25 }), refetchInterval: 30000, refetchOnWindowFocus: true });

  if (isLoading) return <Loading />;
  const items = data?.items ?? [];
  const pg = data?.pagination;

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center"><CardContent><Inbox className="w-10 h-10 mx-auto mb-3 text-muted-foreground" /><p className="text-sm text-muted-foreground">{t('email.received.empty', 'No received emails yet. Enable incoming mail and configure the mailbox.')}</p></CardContent></Card>
    );
  }

  return (
    <Card className="p-0 overflow-hidden"><CardContent><table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">{t('email.received.from', 'From')}</th>
                  <th className="px-4 py-2">{t('email.received.subject', 'Subject')}</th>
                  <th className="px-4 py-2">{t('email.received.received', 'Received')}</th>
                  <th className="px-4 py-2">{t('email.received.status', 'Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {items.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 text-foreground truncate max-w-56">{r.from_address || '—'}</td>
                    <td className="px-4 py-2 text-foreground">
                      <span className="truncate inline-block max-w-[18rem] align-middle">{r.subject || '—'}</span>
                      {r.attachment_count > 0 && (
                        <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Paperclip className="w-3 h-3" />{r.attachment_count}
                          {r.inbound_document_id && <Link to="/admin/accounting/inbox" className="ml-1 text-brand-600 hover:underline">{t('email.received.inbox', 'inbox')}</Link>}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{r.received_at ? fmtDateTime(r.received_at) : '—'}</td>
                    <td className="px-4 py-2"><span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-medium ${statusClass(r.status)}`}>{t(`email.received.statusValue.${r.status}`, r.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>{pg && pg.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>{t('common.previous', 'Previous')}</Button>
                <span className="text-muted-foreground">{page} / {pg.totalPages}</span>
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(pg.totalPages, p + 1))} disabled={page >= pg.totalPages}>{t('common.next', 'Next')}</Button>
              </div>
            )}</CardContent></Card>
  );
};

export default ReceivedEmailsPanel;
