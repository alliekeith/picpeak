import React from 'react';
import {
  ToggleRight,
  Save,
  AlertCircle,
  Images,
  BellRing,
  Smartphone,
  BarChart3,
  Users,
  MonitorPlay,
  Send,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '../../../components/common';
import { FeatureCard } from '../components/FeatureCard';
import { SidebarPreview } from '../components/SidebarPreview';
import { useFeatureFlags } from '../../../contexts/FeatureFlagsContext';
import type { FeatureStatus } from '../components/StatusBadge';

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <section className="mt-6 first:mt-0">
    <h3 className="px-1 mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
      {title}
    </h3>
    <ul className="space-y-3">{children}</ul>
  </section>
);

export const FeaturesTab: React.FC = () => {
  const { t } = useTranslation();
  const { staged, setFlag, save, reset, isDirty, isSaving } = useFeatureFlags();

  // The localized label shown in StatusBadge — short, uppercased internally.
  const statusLabel = (status: FeatureStatus): string => {
    const map: Record<FeatureStatus, string> = {
      stable: t('settings.features.status.stable', 'stable'),
      beta: t('settings.features.status.beta', 'beta'),
      new: t('settings.features.status.new', 'new'),
      experimental: t('settings.features.status.experimental', 'experimental'),
      roadmap: t('settings.features.status.roadmap', 'roadmap'),
    };
    return map[status];
  };

  // Localized "no sidebar item" caption used by the Reminder Emails card.
  const sidebarHiddenLabel = t(
    'settings.features.sidebarHidden',
    'No sidebar item — runs in the background',
  );

  return (
    <div className="space-y-6">
      <Card padding="md">
        {/* Header */}
        <div className="mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-soft text-on-accent-soft flex items-center justify-center">
              <ToggleRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {t('settings.features.title', 'Features')}
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5 max-w-2xl">
                {t(
                  'settings.features.intro',
                  'Turn product surfaces on or off. Enabled features appear in the left navigation and become available to your team. Some features are still in beta — flip them on to try them, off to hide them.',
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Core */}
        <Section title={t('settings.features.sections.core', 'Core')}>
          <FeatureCard
            icon={Images}
            title={t('settings.features.galleries.title', 'Galleries')}
            description={t(
              'settings.features.galleries.description',
              'The core PicPeak surface. Always available.',
            )}
            status="stable"
            statusLabel={statusLabel('stable')}
            sidebarLabel={t('navigation.events')}
            enabled={staged.galleries}
            onToggle={() => { /* locked */ }}
            disabled
            lockedReason={t(
              'settings.features.galleries.locked',
              "Galleries are the foundation of PicPeak and can't be turned off.",
            )}
          />

          <FeatureCard
            icon={MonitorPlay}
            title={t('settings.features.slideshow.title', 'Live Slideshow')}
            description={t(
              'settings.features.slideshow.description',
              'A separate fullscreen "Diashow" link per event for projectors at live events — auto-picks-up new uploads, with per-event-type presets and global watermark defaults under Settings → Slideshow.',
            )}
            status="new"
            statusLabel={statusLabel('new')}
            sidebarHidden
            sidebarHiddenLabel={sidebarHiddenLabel}
            enabled={staged.slideshow}
            onToggle={(next) => setFlag('slideshow', next)}
          />

          <FeatureCard
            icon={Send}
            title={t('settings.features.transfers.title', 'PicTransfer')}
            description={t(
              'settings.features.transfers.description',
              'Send original files from any event(s) as a secure, token-protected download link, with an optional client-upload code so clients can send you logos and files back. Strictly opt-in.',
            )}
            status="new"
            statusLabel={statusLabel('new')}
            sidebarLabel={t('settings.features.transfers.sidebar', 'PicTransfer')}
            enabled={staged.transfers}
            onToggle={(next) => setFlag('transfers', next)}
          />

        </Section>

        {/* Automation — the visual workflow engine. Master kill-switch for the
            Workflows admin area and the runtime; off by default. */}

        {/* Clients (#354 follow-up). Visual grouping for the CRM-area
            sub-features. The "Clients" sidebar section itself is gated
            by a derived `clients` flag (computed from whether any
            child below is on), so there's no explicit parent toggle —
            admins just enable the specific feature they want and the
            section appears automatically. */}

        {/* Communication */}
        <Section title={t('settings.features.sections.communication', 'Communication')}>
          <FeatureCard
            icon={BellRing}
            title={t('settings.features.reminderEmails.title', 'Reminder Emails')}
            description={t(
              'settings.features.reminderEmails.description',
              'Automatic pre-event nudge to customers N days before their event date. Per-category templates (concert, corporate, wedding, …) editable in Settings → Reminder templates; per-event override on the event detail page.',
            )}
            status="beta"
            statusLabel={statusLabel('beta')}
            sidebarHidden
            sidebarHiddenLabel={sidebarHiddenLabel}
            enabled={staged.reminderEmails}
            onToggle={(next) => setFlag('reminderEmails', next)}
          />


          <FeatureCard
            icon={Smartphone}
            title={t('settings.features.whatsapp.title', 'WhatsApp')}
            description={t(
              'settings.features.whatsapp.description',
              'Deliver the gallery-ready notification via WhatsApp Business API in addition to email. Requires a Meta Business Account, an approved message template, and a customer phone number on the event. Configure credentials under Settings → WhatsApp.',
            )}
            status="new"
            statusLabel={statusLabel('new')}
            sidebarHidden
            sidebarHiddenLabel={sidebarHiddenLabel}
            enabled={staged.whatsapp}
            onToggle={(next) => setFlag('whatsapp', next)}
          />

        </Section>

        {/* Scheduling */}

        {/* Sales */}

        {/* Accounting — top-level master + sub-toggles. The Tax export
            relocated here permanently out of CRM. Sub-toggles are disabled
            until the Accounting master is on. */}

        {/* Insights & Access */}
        <Section title={t('settings.features.sections.insights', 'Insights & Access')}>
          <FeatureCard
            icon={BarChart3}
            title={t('settings.features.analytics.title', 'Analytics')}
            description={t(
              'settings.features.analytics.description',
              'Storage usage, gallery views, download counts, and per-event stats.',
            )}
            status="stable"
            statusLabel={statusLabel('stable')}
            sidebarLabel={t('admin.analytics', 'Analytics')}
            enabled={staged.analytics}
            onToggle={(next) => setFlag('analytics', next)}
          />

          <FeatureCard
            icon={Users}
            title={t('settings.features.userManagement.title', 'User Management')}
            description={t(
              'settings.features.userManagement.description',
              "Multi-admin support with role-based permissions. Turn off if you're a single-operator studio.",
            )}
            status="stable"
            statusLabel={statusLabel('stable')}
            sidebarLabel={t('navigation.users', 'Users')}
            enabled={staged.userManagement}
            onToggle={(next) => setFlag('userManagement', next)}
            warning={t(
              'settings.features.userManagement.warning',
              'Existing user accounts stay valid; the admin UI for managing them will be hidden until you re-enable this.',
            )}
          />

        </Section>
      </Card>

      <SidebarPreview staged={staged} />

      {/* Save bar */}
      <div className="flex items-center justify-end gap-2 pt-2">
        {isDirty && (
          <span className="mr-auto text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            {t('settings.features.unsavedChanges', 'You have unsaved changes')}
          </span>
        )}
        <Button variant="outline" disabled={!isDirty || isSaving} onClick={reset}>
          {t('common.discard', 'Discard')}
        </Button>
        <Button
          variant="primary"
          disabled={!isDirty || isSaving}
          isLoading={isSaving}
          onClick={() => { void save(); }}
          leftIcon={<Save className="w-4 h-4" />}
        >
          {t('common.saveChanges', 'Save changes')}
        </Button>
      </div>
    </div>
  );
};
