import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Download } from 'lucide-react';
import type { Event } from '../../../types';
import { useLocalizedDate } from '../../../hooks/useLocalizedDate';
import { archiveService } from '../../../services/archive.service';
import { safeParseDate } from './utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ArchiveStatusCardProps {
  event: Event;
  id: string | undefined;
}

export const ArchiveStatusCard: React.FC<ArchiveStatusCardProps> = ({ event, id }) => {
  const { t } = useTranslation();
  const { formatDateTime: fmtDateTime } = useLocalizedDate();

  return (
    <Card><CardContent><h2 className="text-lg font-semibold text-foreground mb-4">{t('events.archiveStatusTitle')}</h2><div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('events.archivedOn')}</p>
                <p className="text-sm text-foreground">
                  {event.archived_at && fmtDateTime(safeParseDate(event.archived_at)!)}
                </p>
              </div>

              {event.archive_path && (
                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        toast.info(t('events.downloadingArchive', { name: event.event_name }));
                                        await archiveService.downloadArchive(Number(id), `${event.slug}-archive.zip`);
                                        toast.success(t('events.downloadStarted'));
                                      } catch {
                                        toast.error(t('events.failedToDownloadArchive'));
                                      }
                                    }}
                                    className="w-full justify-center"
                                  >
                                    <Download className="w-4 h-4" />{t('events.downloadArchive')}</Button>
              )}
            </div></CardContent></Card>
  );
};
