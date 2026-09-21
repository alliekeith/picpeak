import React from 'react';
import { Palette, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ThemeConfig } from '../../../types/theme.types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ColorCustomizationCardProps {
  localTheme: ThemeConfig;
  handleColorModeSelect: (mode: 'light' | 'dark' | 'auto') => void;
  forcedColorActive: boolean;
  isBrandingContext: boolean;
  forceColorMode?: 'dark' | 'light' | null;
  onForceColorModeChange?: (mode: 'dark' | 'light' | null) => void;
  onSyncFromBranding?: () => void;
}

export const ColorCustomizationCard: React.FC<ColorCustomizationCardProps> = ({
  localTheme,
  handleColorModeSelect,
  forcedColorActive,
  isBrandingContext,
  forceColorMode,
  onForceColorModeChange,
  onSyncFromBranding
}) => {
  const { t } = useTranslation();

  return (
    <Card className="p-6"><CardContent><div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Palette className="w-5 h-5" />
                {t('branding.colors')}
              </h3>
              {/* "Sync from Branding" — caller-supplied so the customizer
                  doesn't have to know how to resolve the Branding theme.
                  Used in event create/edit to reset palette to site colours. */}
              {onSyncFromBranding && (
                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={onSyncFromBranding}
                                  >
                                    <RotateCcw className="w-4 h-4" />{t('branding.syncFromBranding', 'Sync from Branding')}</Button>
              )}
            </div>{/* Color Mode Selector */}<div className="mb-6">
              {forcedColorActive && (
                <div className="mb-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                  {isBrandingContext
                    ? t('branding.forcedModeBrandingHint', 'Light/dark is locked site-wide by the Force control below — the per-theme mode picker is hidden because it would have no effect.')
                    : t('branding.forcedModeGalleryNote', 'A site-wide color lock is active, so this gallery follows the locked light/dark mode. Color and light/dark options are hidden here and can’t be overridden per gallery.')}
                </div>
              )}
              {!forcedColorActive && (<>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('branding.colorMode', 'Color Mode')}
              </label>
              <div className="flex gap-2">
                {(['light', 'dark', 'auto'] as const).map((mode) => (
                  <button
                    type="button"
                    key={mode}
                    onClick={() => handleColorModeSelect(mode)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      (localTheme.colorMode || 'light') === mode
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {mode === 'light' ? t('branding.colorModeLight', 'Light') :
                     mode === 'dark' ? t('branding.colorModeDark', 'Dark') :
                     t('branding.colorModeAuto', 'Auto')}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('branding.colorModeHelp', 'Auto follows the visitor\'s system preference.')}
              </p>
              </>)}

              {/*
               * Force color mode (instance-wide). Lives next to the per-theme
               * Color Mode picker so the admin can find both controls in one
               * place. The data flows through props from BrandingPage which
               * persists it to branding settings; only renders when the
               * onForceColorModeChange handler is provided (i.e. only on the
               * Branding admin page, not in event-level theme editors).
               */}
              {onForceColorModeChange && (
                <div className="mt-5 pt-5 border-t border-border">
                  <h4 className="block text-sm font-medium text-foreground mb-1">
                    {t('branding.forceColorMode', 'Force color mode')}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    {t(
                      'branding.forceColorModeHelp',
                      'Lock the entire admin and public site to dark or light. The user-facing dark/light toggle is hidden whenever a lock is active. Per-event themes that try to override the colour mode are also forced to follow.'
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { value: null, label: t('branding.forceColorModeNone', 'No force (user choice)') },
                      { value: 'dark', label: t('branding.forceColorModeDark', 'Force dark') },
                      { value: 'light', label: t('branding.forceColorModeLight', 'Force light') },
                    ] as const).map(({ value, label }) => {
                      const active = (forceColorMode ?? null) === value;
                      return (
                        <button
                          type="button"
                          key={String(value)}
                          onClick={() => onForceColorModeChange(value)}
                          className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                            active
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border text-muted-foreground hover:bg-accent'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>{/*
             * 8-token CI palette pickers, grouped by role.
             * Each token writes directly to the same field name on ThemeConfig
             * (kebab → camel mapping happens via handleChange's first arg).
             * Translation keys fall back to inline strings — German/English
             * coverage only (per user language profile); other locales will
             * show the fallback until reviewed by a native speaker.
             */}</CardContent></Card>
  );
};
