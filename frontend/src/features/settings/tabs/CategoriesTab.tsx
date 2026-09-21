import React from 'react';
import { Image } from 'lucide-react';
import { CategoryManager } from '../../../components/admin/CategoryManager';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from "@/components/ui/card";

export const CategoriesTab: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Card><CardContent><CategoryManager /></CardContent></Card>

      <Card><CardContent><div className="flex items-start gap-3">
                    <Image className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div>
                      <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">{t('settings.categories.about')}</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        {t('settings.categories.aboutText')}
                      </p>
                    </div>
                  </div></CardContent></Card>
    </div>
  );
};
