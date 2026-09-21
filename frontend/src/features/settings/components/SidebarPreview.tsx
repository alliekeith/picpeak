import React, { useMemo } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { adminNavigation } from '../../../components/admin/AdminSidebar';
import type { FeatureFlags } from '../../../contexts/FeatureFlagsContext';
import { Card, CardContent } from "@/components/ui/card";

interface PreviewItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  featureDriven: boolean;
}

interface SidebarPreviewProps {
  staged: FeatureFlags;
}

/**
 * Renders the live shape of the main admin sidebar based on the user's
 * staged (unsaved) feature flags. Items in green (primary tint) are
 * controlled by toggles above; greyscale items are unconditional.
 *
 * Derived from AdminSidebar's own `adminNavigation` declaration so every
 * feature-gated entry is covered automatically — the previous hand-kept
 * copy had drifted to 2 of the gates (QA J.14). Permissions are
 * deliberately NOT applied here: the preview answers "what do these flags
 * do to the sidebar", not "what can this particular admin see".
 */
export const SidebarPreview: React.FC<SidebarPreviewProps> = ({ staged }) => {
  const { t } = useTranslation();

  const items = useMemo<PreviewItem[]>(() => adminNavigation
    .filter((it) => (!it.featureFlag || staged[it.featureFlag])
      && (!it.featureFlagsAny?.length || it.featureFlagsAny.some((k) => staged[k])))
    .map((it) => ({
      key: it.nameKey,
      label: t(it.nameKey),
      icon: it.icon,
      featureDriven: Boolean(it.featureFlag || it.featureFlagsAny?.length),
    })), [staged, t]);

  return (
    <Card><CardContent><div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">
                {t('settings.features.preview.title', 'Sidebar preview')}
              </h3>
              <span className="text-xs text-muted-foreground">
                {t('settings.features.preview.note', 'Reflects unsaved changes')}
              </span>
            </div><ul className="flex flex-wrap gap-2">
              {items.map((item) => (
                <li
                  key={item.key}
                  className={clsx(
                    'inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium border',
                    // Feature-driven pills pick up the admin's CI accent via
                    // .bg-accent / .border-border, with
                    // .text-accent-foreground as the legible foreground (the
                    // accent token itself washes out on its own tint).
                    item.featureDriven
                      ? 'border-border bg-accent text-accent-foreground'
                      : 'border-border bg-muted text-foreground',
                  )}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </li>
              ))}
            </ul><p className="mt-3 text-xs text-muted-foreground">
              {t(
                'settings.features.preview.legend',
                'Accent-tinted items are controlled by toggles above.',
              )}
            </p></CardContent></Card>
  );
};
