import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bell, Save, Mail, Send, RefreshCw, Loader2 } from 'lucide-react';
import { api } from '../../../config/api';
import { toast } from 'react-toastify';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UpdateNotificationSettingsData {
  enabled: boolean;
  recipients: string;
  lastNotifiedVersion: string;
}

async function fetchNotificationSettings(): Promise<UpdateNotificationSettingsData> {
  const response = await api.get<UpdateNotificationSettingsData>('/admin/system/updates/notifications');
  return response.data;
}

async function updateNotificationSettings(data: Partial<UpdateNotificationSettingsData>): Promise<UpdateNotificationSettingsData> {
  const response = await api.put<{ success: boolean; settings: UpdateNotificationSettingsData }>(
    '/admin/system/updates/notifications',
    data
  );
  return response.data.settings;
}

async function sendTestNotification(): Promise<{ success: boolean; message?: string; successCount?: number }> {
  const response = await api.post('/admin/system/updates/notifications/send');
  return response.data;
}

async function checkForNotifications(): Promise<{ notified: boolean; reason?: string }> {
  const response = await api.post('/admin/system/updates/notifications/check');
  return response.data;
}

export const UpdateNotificationSettings: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['update-notification-settings'],
    queryFn: fetchNotificationSettings
  });

  const [localEnabled, setLocalEnabled] = React.useState<boolean>(false);
  const [localRecipients, setLocalRecipients] = React.useState<string>('');
  const [isDirty, setIsDirty] = React.useState(false);

  // Sync local state when data is loaded
  React.useEffect(() => {
    if (settings && !isDirty) {
      setLocalEnabled(settings.enabled);
      setLocalRecipients(settings.recipients || '');
    }
  }, [settings, isDirty]);

  const updateMutation = useMutation({
    mutationFn: updateNotificationSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(['update-notification-settings'], data);
      setIsDirty(false);
      toast.success(t('settings.updateNotifications.saved', 'Settings saved'));
    },
    onError: () => {
      toast.error(t('settings.updateNotifications.saveError', 'Failed to save settings'));
    }
  });

  const sendMutation = useMutation({
    mutationFn: sendTestNotification,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(
          t('settings.updateNotifications.emailSent', 'Notification email sent to {{count}} recipients', {
            count: data.successCount || 0
          })
        );
      } else {
        toast.error(data.message || t('settings.updateNotifications.emailFailed', 'Failed to send notification'));
      }
    },
    onError: () => {
      toast.error(t('settings.updateNotifications.emailFailed', 'Failed to send notification'));
    }
  });

  const checkMutation = useMutation({
    mutationFn: checkForNotifications,
    onSuccess: (data) => {
      if (data.notified) {
        toast.success(t('settings.updateNotifications.checkSuccess', 'Notification sent for new version'));
      } else {
        toast.success(
          t('settings.updateNotifications.checkNoAction', 'No notification needed: {{reason}}', {
            reason: data.reason || 'unknown'
          })
        );
      }
    },
    onError: () => {
      toast.error(t('settings.updateNotifications.checkError', 'Failed to check for updates'));
    }
  });

  const handleSave = () => {
    updateMutation.mutate({
      enabled: localEnabled,
      recipients: localRecipients
    });
  };

  const handleToggleEnabled = (value: boolean) => {
    setLocalEnabled(value);
    setIsDirty(true);
  };

  const handleRecipientsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalRecipients(e.target.value);
    setIsDirty(true);
  };

  if (isLoading) {
    return (
      <Card><CardContent><div className="animate-pulse space-y-4">
                  <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded-sm w-1/3"></div>
                  <div className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded-sm"></div>
                  <div className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded-sm"></div>
                </div></CardContent></Card>
    );
  }

  return (
    <Card><CardContent><h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              {t('settings.updateNotifications.title', 'Update Notifications')}
            </h2><p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              {t('settings.updateNotifications.description', 'Receive email notifications when new versions of PicPeak are available.')}
            </p><div className="space-y-4">
              {/* Enable/Disable Toggle */}
              <label className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={localEnabled}
                  onChange={(e) => handleToggleEnabled(e.target.checked)}
                  className="w-4 h-4 text-brand-600 bg-neutral-100 border-neutral-300 rounded-sm focus:ring-brand-500"
                />
                <div>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">
                    {t('settings.updateNotifications.enableEmails', 'Enable email notifications')}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {t('settings.updateNotifications.enableEmailsDesc', 'Send email to admins when a new version is available')}
                  </p>
                </div>
              </label>

              {/* Recipients */}
              <div>
                <div className="w-full"><Label className="block"><span className="mb-1.5 block">{t('settings.updateNotifications.recipients', 'Email Recipients')}</span><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">{<Mail className="w-4 h-4 text-neutral-400" />}</div><Input
                                    type="text"
                                    value={localRecipients}
                                    onChange={handleRecipientsChange}
                                    placeholder={t('settings.updateNotifications.recipientsPlaceholder', 'admin@example.com, other@example.com')}
                                    disabled={!localEnabled} className="pl-10"
                                  /></div>{(t('settings.updateNotifications.recipientsHelper', 'Comma-separated email addresses. Leave empty to send to all admin users.')) && <p className="mt-1.5 text-sm text-muted-foreground">{t('settings.updateNotifications.recipientsHelper', 'Comma-separated email addresses. Leave empty to send to all admin users.')}</p>}</Label></div>
              </div>

              {/* Last notified version */}
              {settings?.lastNotifiedVersion && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {t('settings.updateNotifications.lastNotified', 'Last notification sent for version: {{version}}', {
                      version: settings.lastNotifiedVersion
                    })}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <div className="flex flex-wrap gap-2">
                  <Button
                                          variant="secondary"
                                          size="sm"
                                          onClick={() => checkMutation.mutate()} disabled={!localEnabled || checkMutation.isPending}
                                        >
                                          {checkMutation.isPending && <Loader2 className="animate-spin" />}<RefreshCw className="w-4 h-4" />{t('settings.updateNotifications.checkNow', 'Check & Notify')}</Button>
                  <Button
                                          variant="secondary"
                                          size="sm"
                                          onClick={() => sendMutation.mutate()} disabled={!localEnabled || sendMutation.isPending}
                                        >
                                          {sendMutation.isPending && <Loader2 className="animate-spin" />}<Send className="w-4 h-4" />{t('settings.updateNotifications.sendTest', 'Send Test Email')}</Button>
                </div>
                <Button
                                    size="sm"
                                    onClick={handleSave} disabled={!isDirty || updateMutation.isPending}
                                  >
                                    {updateMutation.isPending && <Loader2 className="animate-spin" />}<Save className="w-4 h-4" />{t('common.save', 'Save')}</Button>
              </div>
            </div></CardContent></Card>
  );
};
