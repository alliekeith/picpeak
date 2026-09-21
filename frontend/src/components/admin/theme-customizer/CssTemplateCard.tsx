import React from 'react';
import { FileCode, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { EnabledTemplate } from '../../../services/cssTemplates.service';
import { Card, CardContent } from "@/components/ui/card";

interface CssTemplateCardProps {
  cssTemplates: EnabledTemplate[];
  cssTemplateId?: number | null;
  onCssTemplateChange: (templateId: number | null) => void;
}

export const CssTemplateCard: React.FC<CssTemplateCardProps> = ({
  cssTemplates,
  cssTemplateId,
  onCssTemplateChange
}) => {
  const { t } = useTranslation();

  return (
    <Card className="p-6"><CardContent><h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileCode className="w-5 h-5" />
              {t('branding.cssTemplate', 'CSS Template')}
            </h3><p className="text-sm text-muted-foreground mb-4">
              {t('branding.cssTemplateDescription', 'Select a pre-built CSS template to apply application-wide styling to this gallery. Templates can be managed in Settings > CSS Templates.')}
            </p><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* No template option */}
              <button
                type="button"
                onClick={() => onCssTemplateChange(null)}
                className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                  !cssTemplateId
                    ? 'tile-selected'
                    : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-foreground">{t('branding.noTemplate', 'No Template')}</span>
                  {!cssTemplateId && (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground mt-1 block">
                  {t('branding.noTemplateDescription', 'Use only theme settings without a CSS template')}
                </span>
              </button>
              {/* Template options */}
              {cssTemplates.map((template) => (
                <button
                  type="button"
                  key={template.id}
                  onClick={() => onCssTemplateChange(template.id)}
                  className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                    cssTemplateId === template.id
                      ? 'tile-selected'
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-foreground">{template.name}</span>
                    {cssTemplateId === template.id && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 block">
                    {t('branding.templateSlot', 'Slot {{slot}}', { slot: template.slot_number })}
                  </span>
                </button>
              ))}
            </div></CardContent></Card>
  );
};
