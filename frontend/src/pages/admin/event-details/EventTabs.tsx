import React from 'react';
import { useTranslation } from 'react-i18next';
import { Image } from 'lucide-react';
import type { Event } from '../../../types';
import type { FeedbackSettings as FeedbackSettingsType } from '../../../services/feedback.service';
import type { EventDetailsTab } from './types';

interface EventTabsProps {
  event: Event;
  eventFeedbackSettings: FeedbackSettingsType | undefined;
  activeTab: EventDetailsTab;
  setActiveTab: (tab: EventDetailsTab) => void;
}

export const EventTabs: React.FC<EventTabsProps> = ({
  event,
  eventFeedbackSettings,
  activeTab,
  setActiveTab
}) => {
  const { t } = useTranslation();

  return (
    <div className="mb-6 border-b border-border">
      <nav className="-mb-px flex space-x-8">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'overview'
              ? 'border-brand text-brand'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
        >
          {t('events.overview')}
        </button>
        <button
          onClick={() => setActiveTab('photos')}
          className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
            activeTab === 'photos'
              ? 'border-brand text-brand'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
        >
          <Image className="w-4 h-4" />
          <span>{t('events.photos')}</span>
          {event.photo_count !== undefined && event.photo_count > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-muted text-foreground rounded-full">
              {event.photo_count}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'categories'
              ? 'border-brand text-brand'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
        >
          {t('events.categories')}
        </button>
        {eventFeedbackSettings?.identity_mode === 'guest' && (
          <button
            onClick={() => setActiveTab('guests')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'guests'
                ? 'border-brand text-brand'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {t('admin.events.tabs.guests', 'Guests')}
          </button>
        )}
      </nav>
    </div>
  );
};
