import React from 'react';
import { Save, Globe, Mail, User, Loader2 } from 'lucide-react';
import { Loading } from '../../../components/common';
import { useTranslation } from 'react-i18next';
import type { GeneralSettings } from '../hooks/useSettingsState';
import { MAX_FILES_PER_UPLOAD_LIMIT } from '../hooks/useSettingsState';
import { SUPPORTED_LANGUAGES } from "../../../components/common/LanguageSelector.tsx";
import { MfaSettingsCard } from '../components/MfaSettingsCard';
import { isAbsoluteHttpUrl } from '../../../utils/url';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface GeneralTabProps {
  generalSettings: GeneralSettings;
  setGeneralSettings: React.Dispatch<React.SetStateAction<GeneralSettings>>;
  saveGeneralMutation: {
    mutate: () => void;
    isPending: boolean;
  };
  accountForm: { username: string; email: string };
  accountErrors: Record<string, string>;
  handleAccountChange: (field: 'username' | 'email') => (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAccountSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  updateAdminProfileMutation: { isPending: boolean };
  adminProfileLoading: boolean;
}

export const GeneralTab: React.FC<GeneralTabProps> = ({
  generalSettings,
  setGeneralSettings,
  saveGeneralMutation,
  accountForm,
  accountErrors,
  handleAccountChange,
  handleAccountSubmit,
  updateAdminProfileMutation,
  adminProfileLoading,
}) => {
    const __fieldId = React.useId();
  const { t } = useTranslation();

  // The public address reaches the CORS allowlist and the
  // Access-Control-Allow-Origin header since #705, not just email links — and
  // the `type="url"` constraint never fires because this input isn't inside a
  // <form>. Validate it here so a schemeless value can't be saved, mirroring
  // the server-side check in adminSettings.js (#1104).
  //
  // Only once the admin has actually touched the field. The key was free-text
  // until #1104, so an upgraded install can hold a schemeless value nobody
  // typed today — and flagging that on load would disable Save for every
  // General setting. An admin with `settings.edit` but not `settings.domains`
  // could not clear it either: correcting the address is a change to a
  // protected key and 403s. They would simply be locked out of the tab.
  const siteUrlDirty = generalSettings.site_url !== generalSettings.site_url_stored;
  const siteUrlError = !generalSettings.site_url_env_pinned
    && siteUrlDirty
    && generalSettings.site_url.trim()
    && !isAbsoluteHttpUrl(generalSettings.site_url)
    ? t('settings.general.siteUrlInvalid', 'Enter the full address including http:// or https://, for example https://gallery.example.com')
    : undefined;

  return (
    <div className="space-y-6">
      <Card><CardContent><h2 className="text-lg font-semibold text-foreground mb-4">{t('settings.general.accountSection')}</h2>{adminProfileLoading ? (
                    <div className="py-8 flex justify-center">
                      <Loading size="md" />
                    </div>
                  ) : (
                    <form className="space-y-4" onSubmit={handleAccountSubmit}>
                      <div>
                        <label htmlFor="admin-account-username" className="block text-sm font-medium text-foreground mb-1">
                          {t('settings.general.accountUsername')}
                        </label>
                        <div className="w-full"><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">{<User className="w-5 h-5 text-muted-foreground" />}</div><Input
                                                    id="admin-account-username"
                                                    type="text"
                                                    value={accountForm.username}
                                                    onChange={handleAccountChange('username')}
                                                    placeholder="admin" className="pl-10" aria-invalid={!!(accountErrors.username)} aria-describedby={(accountErrors.username) ? "admin-account-username-error" : undefined}
                                                  /></div>{(accountErrors.username) && <p id={"admin-account-username-error"} className="mt-1.5 text-sm text-destructive">{accountErrors.username}</p>}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('settings.general.accountUsernameHelp')}
                        </p>
                      </div>

                      <div>
                        <label htmlFor="admin-account-email" className="block text-sm font-medium text-foreground mb-1">
                          {t('settings.general.accountEmail')}
                        </label>
                        <div className="w-full"><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">{<Mail className="w-5 h-5 text-muted-foreground" />}</div><Input
                                                    id="admin-account-email"
                                                    type="email"
                                                    value={accountForm.email}
                                                    onChange={handleAccountChange('email')}
                                                    placeholder="admin@example.com" className="pl-10" aria-invalid={!!(accountErrors.email)} aria-describedby={(accountErrors.email) ? "admin-account-email-error" : undefined}
                                                  /></div>{(accountErrors.email) && <p id={"admin-account-email-error"} className="mt-1.5 text-sm text-destructive">{accountErrors.email}</p>}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('settings.general.accountEmailHelp')}
                        </p>
                      </div>

                      <div className="pt-2">
                        <Button
                                                        type="submit" disabled={updateAdminProfileMutation.isPending}
                                                      >
                                                        {updateAdminProfileMutation.isPending && <Loader2 className="animate-spin" />}<Save className="w-5 h-5" />{t('settings.general.accountSaveButton')}</Button>
                      </div>
                    </form>
                  )}</CardContent></Card>

      {/* Per-user two-factor authentication (issue #738) — lives beside the
          admin's own account details rather than the admin-wide Security tab. */}
      <MfaSettingsCard />

      <Card><CardContent><h2 className="text-lg font-semibold text-foreground mb-4">{t('settings.general.siteConfiguration')}</h2><div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {t('settings.general.siteUrl')}
                      </label>
                      <div className="w-full"><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">{<Globe className="w-5 h-5 text-muted-foreground" />}</div><Input
                                          type="url"
                                          value={generalSettings.site_url}
                                          onChange={(e) => setGeneralSettings(prev => ({ ...prev, site_url: e.target.value }))}
                                          placeholder="https://yourdomain.com"
                                          disabled={generalSettings.site_url_env_pinned} className="pl-10" aria-invalid={!!(siteUrlError)} aria-describedby={(siteUrlError) ? `${__fieldId}-0-error` : undefined}
                                        /></div>{(siteUrlError) && <p id={`${__fieldId}-0-error`} className="mt-1.5 text-sm text-destructive">{siteUrlError}</p>}</div>
                      {!siteUrlError && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {generalSettings.site_url_env_pinned
                            ? t('settings.general.siteUrlEnvPinned', 'Pinned by the FRONTEND_URL environment variable, which overrides this setting. Remove it from your .env (or container environment) and restart to manage the address here.')
                            : t('settings.general.siteUrlHelp')}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          {t('settings.general.defaultExpiration')}
                        </label>
                        <Input
                          type="number"
                          value={generalSettings.default_expiration_days}
                          onChange={(e) => setGeneralSettings(prev => ({ ...prev, default_expiration_days: parseInt(e.target.value) || 30 }))}
                          min="1"
                          max="365"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          {t('settings.general.maxFileSize')}
                        </label>
                        <Input
                          type="number"
                          value={generalSettings.max_file_size_mb}
                          onChange={(e) => setGeneralSettings(prev => ({ ...prev, max_file_size_mb: parseInt(e.target.value) || 50 }))}
                          min="1"
                          max="500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          {t('settings.general.maxVideoSize', 'Max Video Size (MB)')}
                        </label>
                        <Input
                          type="number"
                          value={generalSettings.max_video_size_mb}
                          onChange={(e) => setGeneralSettings(prev => ({ ...prev, max_video_size_mb: parseInt(e.target.value) || 500 }))}
                          min="1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('settings.general.maxVideoSizeHelp', 'Separate per-file limit for video uploads, so photos can keep a smaller limit.')}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          {t('settings.general.maxFilesPerUpload')}
                        </label>
                        <Input
                          type="number"
                          value={generalSettings.max_files_per_upload}
                          onChange={(e) => {
                            const parsed = parseInt(e.target.value, 10);
                            setGeneralSettings(prev => ({
                              ...prev,
                              max_files_per_upload: Number.isFinite(parsed)
                                ? Math.min(MAX_FILES_PER_UPLOAD_LIMIT, Math.max(1, parsed))
                                : prev.max_files_per_upload
                            }));
                          }}
                          min="1"
                          max={MAX_FILES_PER_UPLOAD_LIMIT}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('settings.general.maxFilesPerUploadHelp', { max: MAX_FILES_PER_UPLOAD_LIMIT })}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          {t('settings.general.maxUploadBatchSize')}
                        </label>
                        <Input
                          type="number"
                          value={generalSettings.max_upload_batch_size_mb}
                          onChange={(e) => {
                            const parsed = parseInt(e.target.value, 10);
                            setGeneralSettings(prev => ({
                              ...prev,
                              max_upload_batch_size_mb: Number.isFinite(parsed)
                                ? Math.max(1, parsed)
                                : prev.max_upload_batch_size_mb
                            }));
                          }}
                          min="1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('settings.general.maxUploadBatchSizeHelp')}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {t('settings.general.allowedFileTypes')}
                      </label>
                      <Input
                        type="text"
                        value={generalSettings.allowed_file_types}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, allowed_file_types: e.target.value }))}
                        placeholder="jpg,jpeg,png,gif"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('settings.general.allowedFileTypesHelp')}
                      </p>
                    </div>
                  </div></CardContent></Card>

      <Card><CardContent><h2 className="text-lg font-semibold text-foreground mb-4">{t('settings.general.featureToggles')}</h2><div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={generalSettings.enable_analytics}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, enable_analytics: e.target.checked }))}
                        className="w-4 h-4 text-primary rounded-sm focus:ring-ring"
                      />
                      <span className="ml-2 text-sm text-foreground">{t('settings.general.enableAnalytics')}</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={generalSettings.enable_registration}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, enable_registration: e.target.checked }))}
                        className="w-4 h-4 text-primary rounded-sm focus:ring-ring"
                      />
                      <span className="ml-2 text-sm text-foreground">{t('settings.general.enableRegistration')}</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={generalSettings.maintenance_mode}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, maintenance_mode: e.target.checked }))}
                        className="w-4 h-4 text-primary rounded-sm focus:ring-ring"
                      />
                      <span className="ml-2 text-sm text-foreground">{t('settings.general.maintenanceMode')}</span>
                    </label>

                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={generalSettings.short_gallery_urls}
                          onChange={(e) => setGeneralSettings(prev => ({ ...prev, short_gallery_urls: e.target.checked }))}
                          className="w-4 h-4 text-primary rounded-sm focus:ring-ring"
                        />
                        <span className="ml-2 text-sm text-foreground">{t('settings.general.enableShortGalleryUrls')}</span>
                      </label>
                      <p className="text-xs text-muted-foreground ml-6 mt-1">
                        {t('settings.general.enableShortGalleryUrlsHelp')}
                      </p>
                    </div>

                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={generalSettings.use_original_filenames_for_downloads}
                          onChange={(e) => setGeneralSettings(prev => ({ ...prev, use_original_filenames_for_downloads: e.target.checked }))}
                          className="w-4 h-4 text-primary rounded-sm focus:ring-ring"
                        />
                        <span className="ml-2 text-sm text-foreground">{t('settings.general.useOriginalFilenames')}</span>
                      </label>
                      <p className="text-xs text-muted-foreground ml-6 mt-1">
                        {t('settings.general.useOriginalFilenamesHelp')}
                      </p>
                    </div>
                  </div></CardContent></Card>

      <Card><CardContent><h2 className="text-lg font-semibold text-foreground mb-4">{t('settings.general.language')}</h2><div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t('settings.general.language')}
                      </label>
                      <select
                        value={generalSettings.default_language}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, default_language: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-primary"
                      >
                        {SUPPORTED_LANGUAGES.map(lang => (
                          <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('settings.general.defaultLanguageHelp')}
                      </p>
                    </div>
                  </div></CardContent></Card>

      <Card><CardContent><h2 className="text-lg font-semibold text-foreground mb-4">{t('settings.general.dateTimeFormat')}</h2><div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t('settings.general.dateFormat')}
                      </label>
                      <select
                        value={generalSettings.date_format?.format || 'dd/MM/yyyy'}
                        onChange={(e) => {
                          const format = e.target.value;
                          const locale = format === 'MM/dd/yyyy' ? 'en-US' : 'en-GB';
                          setGeneralSettings(prev => ({
                            ...prev,
                            date_format: { format, locale }
                          }));
                        }}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-primary"
                      >
                        <option value="dd/MM/yyyy">DD/MM/YYYY (European)</option>
                        <option value="MM/dd/yyyy">MM/DD/YYYY (US)</option>
                        <option value="yyyy-MM-dd">YYYY-MM-DD (ISO)</option>
                        <option value="dd.MM.yyyy">DD.MM.YYYY (German)</option>
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('settings.general.dateFormatHelp')}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t('settings.general.timeFormat', 'Time format')}
                      </label>
                      <select
                        value={generalSettings.time_format || '24h'}
                        onChange={(e) => {
                          const time_format = e.target.value === '12h' ? '12h' : '24h';
                          setGeneralSettings(prev => ({ ...prev, time_format }));
                        }}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-primary"
                      >
                        <option value="24h">{t('settings.general.timeFormat24h', '24-hour (14:30)')}</option>
                        <option value="12h">{t('settings.general.timeFormat12h', '12-hour (2:30 PM)')}</option>
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('settings.general.timeFormatHelp',
                          'Controls how times render across admin views, customer-facing pages, and PDFs. Storage stays 24-hour (HH:mm); only the display switches.')}
                      </p>
                    </div>
                  </div><div className="mt-6">
                    <Button
                                        onClick={() => saveGeneralMutation.mutate()} disabled={!!siteUrlError || saveGeneralMutation.isPending}
                                      >
                                        {saveGeneralMutation.isPending && <Loader2 className="animate-spin" />}<Save className="w-5 h-5" />{t('settings.general.saveGeneralSettings')}</Button>
                  </div></CardContent></Card>
    </div>
  );
};
