import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  AlertTriangle,
  Download,
  Eye,
  Clock,
  Plus,
  HardDrive,
  Image,
  Archive,
  Heart,
} from 'lucide-react';
import { parseISO } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useExpiryRefresh } from '../../hooks/useExpiryRefresh';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n/config';
import { useLocalizedDate } from '../../hooks/useLocalizedDate';

import { Loading } from '../../components/common';
import { UpdateNotification } from '../../components/admin/UpdateNotification';
import { WhatsNewBanner } from '../../components/admin/WhatsNewBanner';
import { useQuery } from '@tanstack/react-query';
import { eventsService } from '../../services/events.service';
import { adminService, ActivityType, type Activity } from '../../services/admin.service';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface StatCard {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

/**
 * Interpolation values for an `admin.activities.*` line.
 *
 * The activity's own metadata is spread in first: the keys interpolate
 * whatever the backend recorded for that type ({{name}} for
 * webhook_created, {{quoteNumber}} for quote_created, {{contractNumber}},
 * {{username}}, {{word}}, …). Before that, only a fixed five-value
 * allowlist was passed, so every other key rendered its raw "{{…}}"
 * placeholder in the activity feed (QA S7). The explicit entries below
 * stay as derived/defaulted overrides — they resolve from columns that
 * are not in metadata, or need a fallback when metadata is empty.
 */
export function buildActivityParams(activity: Activity): Record<string, unknown> {
  const t = i18n.t;
  return {
    ...activity.metadata,
    eventName: activity.eventName || t('common.unknown'),
    email: activity.metadata?.email || activity.actorName || '',
    count: activity.metadata?.count || 0,
    template: activity.metadata?.template_key || '',
    categoryName: activity.metadata?.category_name || '',
  };
}

export const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { format, formatDistanceToNow } = useLocalizedDate();

  // Fetch dashboard statistics
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: () => adminService.getDashboardStats(),
  });

  // Fetch recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: () => adminService.getRecentActivity(10),
  });

  // Fetch system health. 30s cadence is fine for a freshness dashboard,
  // but we explicitly opt out of background polling so an idle browser
  // tab doesn't keep pinging the backend (24 calls/hr → 0 calls/hr
  // when the admin tabs away). React-query's default for this flag is
  // already `false`, but making it explicit documents the intent so a
  // future refactor doesn't accidentally flip it on.
  // staleTime lets a focus-regain after <30s skip the immediate
  // refetch — the interval re-fires on its own schedule.
  const { data: systemHealth } = useQuery({
    queryKey: ['admin-system-health'],
    queryFn: () => adminService.getSystemHealth(),
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    staleTime: 30000,
  });

  // Fetch the next 5 expiring events directly from the server. Previously
  // this fetched the first 100 events and filtered client-side (#346 follow-up),
  // which silently missed any expiring event outside the first 100 rows.
  const { data: expiringEventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['admin-events-summary', 'expiring'],
    // Order by soonest expiry so the five shown rows ARE the earliest to
    // expire — useExpiryRefresh then schedules against the true next boundary
    // even when >5 events are expiring (#909 review round 3).
    queryFn: () => eventsService.getEvents(1, 5, 'expiring', undefined, 'expires_at', 'asc'),
  });

  // Keep the "expiring soon" card honest when a row crosses its expiry while
  // the dashboard sits open (#909 review). Filtering client-side desynced the
  // list from the cached total/stat; instead we refetch the whole set at the
  // boundary — the backend returns rows/total/stats that already exclude the
  // now-expired event, so everything stays consistent. Fixes the stale
  // "1 day left" for roles without the health poll (editor/viewer). Placed
  // with the other top-level hooks, above the loading early-return.
  const queryClient = useQueryClient();
  const refreshExpiring = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['admin-events-summary', 'expiring'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
  }, [queryClient]);
  useExpiryRefresh(
    (expiringEventsData?.events ?? []).map((e: any) => e.expires_at),
    refreshExpiring,
  );

  const isLoading = statsLoading || eventsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" text={t('admin.loadingDashboard')} />
      </div>
    );
  }

  const expiringEvents = expiringEventsData?.events ?? [];
  const expiringTotal = expiringEventsData?.pagination?.total ?? expiringEvents.length;

  // Format numbers for display
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Build statistics cards - always show 8 cards in 2x4 grid
  const stats: StatCard[] = [
    {
      title: t('admin.activeEvents'),
      value: dashboardStats?.activeEvents || 0,
      icon: Calendar,
      color: 'text-green-600',
    },
    {
      title: t('admin.expiringSoon'),
      value: dashboardStats?.expiringEvents || 0,
      change: t('admin.next7Days'),
      icon: AlertTriangle,
      color: 'text-orange-600',
    },
    {
      title: t('admin.totalPhotos'),
      value: formatNumber(dashboardStats?.totalPhotos || 0),
      icon: Image,
      color: 'text-blue-600',
    },
    {
      // Real bytes under the storage root (#1164). This used to be the summed
      // size of the catalogued originals, which on a reference-mode install is
      // the size of a NAS — the one number an admin reaches for when asking
      // "am I running out of disk" pointed away from the answer. `?? ` rather
      // than `|| `: null means the measurement failed and must read as
      // unavailable, not as 0 Bytes.
      title: t('admin.storageUsed'),
      // On an S3 backend there is no disk to measure, so the catalogued figure
      // IS the answer available and stands in — labelled by the subtitle below
      // rather than pretending a walk happened.
      value: dashboardStats?.storageUsed == null
        ? (dashboardStats?.storageMeasurement === 'catalog'
          ? adminService.formatBytes(dashboardStats.catalogedBytes)
          : t('admin.storageUnavailable', 'unavailable'))
        : `${adminService.formatBytes(dashboardStats.storageUsed)}${dashboardStats.storagePartial ? '+' : ''}`,
      // The catalogued figure alongside, so the difference is visible rather
      // than conflated. On a managed install they track each other; on a
      // reference one they are supposed to diverge.
      change: dashboardStats
        ? (dashboardStats.storageMeasurement === 'catalog'
          ? t('admin.catalogedMediaOnly', 'catalogued — objects live in S3')
          : t('admin.catalogedMedia', { size: adminService.formatBytes(dashboardStats.catalogedBytes) }))
        : undefined,
      icon: HardDrive,
      color: 'text-purple-600',
    },
    {
      title: t('admin.totalViews'),
      value: formatNumber(dashboardStats?.totalViews || 0),
      change: dashboardStats?.viewsTrend ? t('admin.percentFromLastWeek', { percent: `${dashboardStats.viewsTrend > 0 ? '+' : ''}${dashboardStats.viewsTrend}` }) : undefined,
      icon: Eye,
      color: 'text-indigo-600',
    },
    {
      title: t('admin.downloads'),
      value: formatNumber(dashboardStats?.totalDownloads || 0),
      change: dashboardStats?.downloadsTrend ? t('admin.percentFromLastWeek', { percent: `${dashboardStats.downloadsTrend > 0 ? '+' : ''}${dashboardStats.downloadsTrend}` }) : undefined,
      icon: Download,
      color: 'text-pink-600',
    },
    {
      title: t('admin.archivedEvents'),
      value: dashboardStats?.archivedEvents || 0,
      icon: Archive,
      color: 'text-gray-600',
    },
    {
      title: t('admin.systemHealth'),
      value: systemHealth ? t(`admin.health.${systemHealth.overall}`) : t('admin.health.checking'),
      icon: Heart,
      color: systemHealth?.overall === 'healthy' ? 'text-green-600' : systemHealth?.overall === 'warning' ? 'text-yellow-600' : 'text-red-600',
    },
  ];

  return (
    <div>
      {/* After-update "What's New" highlights (above the update banner) */}
      <WhatsNewBanner />
      {/* Update Notification */}
      <UpdateNotification />

      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('navigation.dashboard')}</h1>
          <p className="text-muted-foreground mt-1">{t('admin.dashboardSubtitle')}</p>
        </div>
        <Button
                        onClick={() => navigate('/admin/events/new')}
                      >
                        <Plus className="w-5 h-5" />{t('events.createEvent')}</Button>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title} className="p-6"><CardContent><div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                            <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                            {stat.change && (
                              <p className="text-sm text-muted-foreground mt-1">{stat.change}</p>
                            )}
                          </div>
                          <div className={`p-3 rounded-full bg-muted ${stat.color}`}>
                            <stat.icon className="w-6 h-6" />
                          </div>
                        </div></CardContent></Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expiring Events */}
        <div className="lg:col-span-2">
          <Card><CardContent><div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-foreground">{t('admin.eventsExpiringSoon')}</h2>
                                <AlertTriangle className="w-5 h-5 text-orange-600" />
                              </div>{expiringEvents.length === 0 ? (
                                <p className="text-muted-foreground py-8 text-center">{t('admin.noEventsExpiring')}</p>
                              ) : (
                                <div className="space-y-3">
                                  {expiringEvents.map((event) => {
                                    // Ceiling so the final partial day reads "1 day", not "0"
                                    // (#909); clamped since a row can sit at the boundary for the
                                    // instant before useExpiryRefresh refetches it away.
                                    const daysLeft = Math.max(1, Math.ceil((parseISO(event.expires_at!).getTime() - Date.now()) / 86400000));

                                    return (
                                      <div
                                        key={event.id}
                                        className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-800 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors"
                                        onClick={() => navigate(`/admin/events/${event.id}`)}
                                      >
                                        <div>
                                          <h3 className="font-medium text-foreground">{event.event_name}</h3>
                                          {event.event_date && (
                                            <p className="text-sm text-muted-foreground">
                                              {format(parseISO(event.event_date), 'PP')}
                                            </p>
                                          )}
                                        </div>
                                        <div className="text-right">
                                          <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                                            {t('admin.daysLeft', { count: daysLeft })}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {t('gallery.expires')} {format(parseISO(event.expires_at!), 'PP')}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}{expiringTotal > 5 && (
                                <button
                                  onClick={() => navigate('/admin/events?filter=expiring')}
                                  className="w-full mt-4 text-sm text-accent hover:opacity-80 font-medium"
                                >
                                  {t('admin.viewAllExpiringEvents', { count: expiringTotal })} →
                                </button>
                              )}</CardContent></Card>

        </div>

        {/* Recent Activity */}
        <Card><CardContent><div className="flex items-center justify-between mb-4">
                          <h2 className="text-lg font-semibold text-foreground">{t('admin.recentActivity')}</h2>
                          <Clock className="w-5 h-5 text-muted-foreground" />
                        </div><div className="space-y-4">
                          {!recentActivity || recentActivity.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">{t('admin.noRecentActivity')}</p>
                          ) : (
                            recentActivity.slice(0, 5).map((activity) => {
                              // Get color based on activity type
                              const getActivityColor = (type: ActivityType) => {
                                const colors: Partial<Record<ActivityType, string>> = {
                                  'event_created': 'bg-green-500',
                                  'photos_uploaded': 'bg-blue-500',
                                  'event_archived': 'bg-purple-500',
                                  'archive_restored': 'bg-indigo-500',
                                  'archive_deleted': 'bg-red-500',
                                  'bulk_download': 'bg-blue-500',
                                  'email_config_updated': 'bg-yellow-500',
                                  'branding_updated': 'bg-pink-500',
                                  'theme_updated': 'bg-purple-500',
                                  'gallery_password_entry': 'bg-gray-500',
                                };
                                return colors[type] || 'bg-gray-500';
                              };

                              // Format activity message with translations
                              const getActivityMessage = (): string => {
                                const params = buildActivityParams(activity);
                                const translated = t(`admin.activities.${activity.type}`, params);

                                // Translate; if key missing i18n returns the key string itself
                                if (!translated || translated === `admin.activities.${activity.type}`) {
                                  // Fallback: format a readable English message
                                  return adminService.formatActivityMessage(activity);
                                }
                                return translated as string;
                              };

                              return (
                                <div key={activity.id} className="flex items-start gap-3">
                                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getActivityColor(activity.type)}`} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-foreground break-words">
                                      {getActivityMessage()}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{activity.actorName}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {formatDistanceToNow(parseISO(activity.createdAt), { addSuffix: true })}
                                    </p>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div></CardContent></Card>
      </div>

      {/* CRM overview — quote / invoice pipeline + revenue +
          outstanding. The section internally gates on the `clients`
          feature flag (renders nothing when off), and further hides
          the quotes / invoices subsections individually when their
          sub-flag is off. Lives at the bottom so admins who don't
          use the CRM see no visual difference. */}

    </div>
  );
};

AdminDashboard.displayName = 'AdminDashboard';
