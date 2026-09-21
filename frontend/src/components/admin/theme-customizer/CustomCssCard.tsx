import React, { useState } from 'react';
import { Code, Info, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ThemeConfig } from '../../../types/theme.types';
import { Card, CardContent } from "@/components/ui/card";

interface CustomCssCardProps {
  localTheme: ThemeConfig;
  customCss: string;
  onCustomCssChange: (newCss: string) => void;
}

export const CustomCssCard: React.FC<CustomCssCardProps> = ({
  localTheme,
  customCss,
  onCustomCssChange
}) => {
  const { t } = useTranslation();
  const [showCssInstructions, setShowCssInstructions] = useState(false);

  return (
    <Card className="p-6"><CardContent><h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Code className="w-5 h-5" />
              {t('branding.eventCustomCSS', 'Event-specific Custom CSS')}
            </h3>{/* Collapsible Instructions Panel */}<div className="mb-4">
              <button
                type="button"
                onClick={() => setShowCssInstructions(!showCssInstructions)}
                className="flex items-center gap-2 text-sm text-primary hover:opacity-80 font-medium"
              >
                <Info className="w-4 h-4" />
                {t('branding.cssInstructions.title', 'How to use Custom CSS')}
                <ChevronDown className={`w-4 h-4 transition-transform ${showCssInstructions ? 'rotate-180' : ''}`} />
              </button>

              {showCssInstructions && (
                <div className="mt-3 p-4 bg-muted rounded-lg border border-border text-sm space-y-4">
                  {/* Available CSS Variables */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">
                      {t('branding.cssInstructions.variables', 'Theme CSS Variables')}
                    </h4>
                    <p className="text-muted-foreground mb-2">
                      {t('branding.cssInstructions.variablesDesc', 'Use these CSS variables to match your theme presets:')}
                    </p>
                    <code className="block bg-neutral-800 text-green-400 p-3 rounded-sm text-xs overflow-x-auto">
      {`--background: ${localTheme.backgroundColor || '#fafafa'};
--card: ${localTheme.surfaceColor || '#ffffff'};
--muted: ${localTheme.elevatedColor || '#f5f5f5'};
--border: ${localTheme.surfaceBorderColor || '#e5e5e5'};
--foreground: ${localTheme.textColor || '#171717'};
--muted-foreground: ${localTheme.mutedTextColor || '#737373'};
--brand: ${localTheme.accentColor || '#22c55e'};
--primary: ${localTheme.accentDarkColor || localTheme.primaryColor || '#5C8762'};
--font-family: ${localTheme.fontFamily || 'Inter, sans-serif'};
--heading-font: ${localTheme.headingFontFamily || localTheme.fontFamily || 'Inter, sans-serif'};`}
                    </code>
                  </div>

                  {/* Custom Gallery Layouts */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">
                      {t('branding.cssInstructions.layouts', 'Custom Gallery Layouts')}
                    </h4>
                    <p className="text-muted-foreground mb-2">
                      {t('branding.cssInstructions.layoutsDesc', 'Target gallery elements with these selectors:')}
                    </p>
                    <code className="block bg-neutral-800 text-green-400 p-3 rounded-sm text-xs overflow-x-auto">
      {`.gallery-container { /* Main gallery wrapper */ }
.gallery-grid { /* Photo grid container */ }
.gallery-item { /* Individual photo card */ }
.gallery-header { /* Header section */ }
.gallery-hero { /* Hero image area */ }
.photo-overlay { /* Photo hover overlay */ }
.photo-actions { /* Like/favorite buttons */ }`}
                    </code>
                  </div>

                  {/* Glassmorphism Example */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">
                      {t('branding.cssInstructions.glassEffect', 'Glassmorphism Effect')}
                    </h4>
                    <p className="text-muted-foreground mb-2">
                      {t('branding.cssInstructions.glassEffectDesc', 'Create modern glass effects:')}
                    </p>
                    <code className="block bg-neutral-800 text-green-400 p-3 rounded-sm text-xs overflow-x-auto">
      {`.glass-panel {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 16px;
}`}
                    </code>
                  </div>

                  {/* Tips */}
                  <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-blue-800 dark:text-blue-200 text-xs">
                      <strong>{t('branding.cssInstructions.tip', 'Tip')}:</strong>{' '}
                      {t('branding.cssInstructions.tipText', 'Use CSS Templates from Settings > CSS Templates for pre-built designs like Apple Liquid Glass.')}
                    </div>
                  </div>
                </div>
              )}
            </div><textarea
              value={customCss}
              onChange={(e) => onCustomCssChange(e.target.value)}
              placeholder="/* Add custom CSS here */"
              className="w-full h-40 px-3 py-2 font-mono text-sm border border-border rounded-lg bg-muted text-foreground"
            /><p className="mt-2 text-sm text-muted-foreground">
              {t('branding.customCSSHelp')}
            </p></CardContent></Card>
  );
};
