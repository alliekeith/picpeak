import React from 'react';
import { useTranslation } from 'react-i18next';
import { Image } from 'lucide-react';
import type { Event } from '../../../types';
import type { EventDetailsTab } from './types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PhotoStatisticsCardProps {
  event: Event;
  categories: Array<{ id: number; name: string; slug: string; is_folder?: boolean }>;
  setActiveTab: (tab: EventDetailsTab) => void;
}

export const PhotoStatisticsCard: React.FC<PhotoStatisticsCardProps> = ({
  event,
  categories,
  setActiveTab
}) => {
  const { t } = useTranslation();

  return (
    <Card><CardContent><h2 className="text-lg font-semibold text-foreground mb-4">{t('events.photoStatistics')}</h2><div className="space-y-3">
              <div className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">{t('events.totalPhotos')}</span>
                <span className="text-sm font-medium text-foreground">{event.photo_count || 0}</span>
              </div>

              <div className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">{t('events.totalSize')}</span>
                <span className="text-sm font-medium text-foreground">
                  {event.total_size ? `${(event.total_size / (1024 * 1024)).toFixed(1)} MB` : '0 MB'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">{t('events.categories')}</span>
                <span className="text-sm font-medium text-foreground">{categories.length}</span>
              </div>

              {event.total_views !== undefined && (
                <div className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">{t('events.totalViews')}</span>
                  <span className="text-sm font-medium text-foreground">{event.total_views || 0}</span>
                </div>
              )}

              {event.total_downloads !== undefined && (
                <div className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">{t('events.totalDownloads')}</span>
                  <span className="text-sm font-medium text-foreground">{event.total_downloads || 0}</span>
                </div>
              )}

              {event.unique_visitors !== undefined && (
                <div className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">{t('events.uniqueVisitors')}</span>
                  <span className="text-sm font-medium text-foreground">{event.unique_visitors || 0}</span>
                </div>
              )}
            </div><div className="mt-4">
              <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setActiveTab('photos')}
                              className="w-full justify-center"
                            >
                              <Image className="w-4 h-4" />{t('events.managePhotos')}</Button>
            </div></CardContent></Card>
  );
};
