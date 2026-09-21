import React from 'react';
import { SlidersHorizontal, Menu, Check, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ThemeConfig } from '../../../types/theme.types';
import { Card, CardContent } from "@/components/ui/card";

interface ControlsStyleCardProps {
  localTheme: ThemeConfig;
  handleChange: (key: keyof ThemeConfig, newValue: any) => void;
}

export const ControlsStyleCard: React.FC<ControlsStyleCardProps> = ({ localTheme, handleChange }) => {
  const { t } = useTranslation();

  return (
    <Card className="p-6"><CardContent><h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5" />
              {t('branding.controlsStyle', 'Controls Style')}
            </h3><p className="text-sm text-muted-foreground mb-4">
              {t('branding.controlsStyleDescription', 'Choose how gallery filters and controls are displayed.')}
            </p><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleChange('controlsStyle', 'classic')}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  (localTheme.controlsStyle || 'classic') === 'classic'
                    ? 'tile-selected'
                    : 'border-border'
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="mb-2 text-foreground">
                    <SlidersHorizontal className="w-6 h-6" />
                  </div>
                  <span className="font-medium text-sm text-foreground">
                    {t('branding.controlsStyleOptions.classic', 'Classic')}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {t('branding.controlsStyleDescriptions.classic', 'Inline filter bar below header')}
                  </span>
                </div>
                {(localTheme.controlsStyle || 'classic') === 'classic' && (
                  <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />
                )}
              </button>
              <button
                type="button"
                onClick={() => handleChange('controlsStyle', 'sidebar')}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  localTheme.controlsStyle === 'sidebar'
                    ? 'tile-selected'
                    : 'border-border'
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="mb-2 text-foreground">
                    <Menu className="w-6 h-6" />
                  </div>
                  <span className="font-medium text-sm text-foreground">
                    {t('branding.controlsStyleOptions.sidebar', 'Sidebar')}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {t('branding.controlsStyleDescriptions.sidebar', 'Menu button opens sidebar with filters')}
                  </span>
                </div>
                {localTheme.controlsStyle === 'sidebar' && (
                  <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />
                )}
              </button>
            </div>{/* Info about hero header */}{localTheme.headerStyle === 'hero' && localTheme.controlsStyle !== 'sidebar' && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  {t('branding.controlsStyleHeroWarning', 'Sidebar is recommended for hero headers to prevent controls appearing above the hero image.')}
                </p>
              </div>
            )}</CardContent></Card>
  );
};
