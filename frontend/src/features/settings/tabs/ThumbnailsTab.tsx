import React, { useState, useEffect } from 'react';
import { Save, Image, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { Loading } from '../../../components/common';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { api } from '../../../config/api';
import { usePermission } from '../../../hooks/usePermission';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ThumbnailSettings {
  width: number;
  height: number;
  quality: number;
  fit: string;
  format: string;
  // Lightbox preview tier (#492). Off by default; admin opts in.
  lightbox_preview_enabled: boolean;
}

const defaultSettings: ThumbnailSettings = {
  width: 300,
  height: 300,
  quality: 85,
  fit: 'cover',
  format: 'jpeg',
  lightbox_preview_enabled: false,
};

// Backend returns the lightbox toggle as a JSON-stringified boolean
// per migration 104. Tolerate raw boolean / "true" / "false" / "1" /
// "0" coming back so the form mirrors whatever shape lands.
function parseLightboxFlag(raw: unknown): boolean {
  if (raw === true || raw === 1) return true;
  if (typeof raw !== 'string') return false;
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === 'true' || trimmed === '"true"' || trimmed === '1') return true;
  return false;
}

interface FetchedSettings {
  settings: Record<string, { value: string; description: string }>;
  fitOptions: Array<'cover' | 'contain' | 'fill' | 'inside' | 'outside'>;
  formatOptions: Array<'jpeg' | 'png' | 'webp'>;
}

export const ThumbnailsTab: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<ThumbnailSettings>(defaultSettings);
  const [isDirty, setIsDirty] = useState(false);
  // These settings shape every gallery's renditions, and the regenerate
  // buttons rebuild the whole library: both need settings.edit on the server.
  const canEdit = usePermission('settings.edit');
  const regenerateErrorMessage = (err: unknown, fallback: string) => (
    (err as { response?: { data?: { code?: string } } })?.response?.data?.code === 'REGENERATION_RUNNING'
      ? t('settings.thumbnails.regenerateRunning', 'A regeneration is already running. Try again once it has finished.')
      : fallback
  );

  const { data: fetchedData, isLoading, error } = useQuery<FetchedSettings>({
    queryKey: ['thumbnail-settings'],
    queryFn: async () => {
      const response = await api.get('/admin/thumbnails/settings');
      return response.data;
    },
  });

  useEffect(() => {
    if (fetchedData?.settings) {
      const s = fetchedData.settings;
      setSettings({
        width: parseInt(s.thumbnail_width?.value) || defaultSettings.width,
        height: parseInt(s.thumbnail_height?.value) || defaultSettings.height,
        quality: parseInt(s.thumbnail_quality?.value) || defaultSettings.quality,
        fit: s.thumbnail_fit?.value || defaultSettings.fit,
        format: s.thumbnail_format?.value || defaultSettings.format,
        lightbox_preview_enabled: parseLightboxFlag(s.lightbox_preview_enabled?.value),
      });
    }
  }, [fetchedData]);

  const saveMutation = useMutation({
    mutationFn: async (newSettings: ThumbnailSettings) => {
      const response = await api.put('/admin/thumbnails/settings', newSettings);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thumbnail-settings'] });
      toast.success(t('settings.thumbnails.saveSuccess', 'Thumbnail settings saved'));
      setIsDirty(false);
    },
    onError: () => {
      toast.error(t('settings.thumbnails.saveError', 'Failed to save thumbnail settings'));
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/admin/thumbnails/regenerate');
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || t('settings.thumbnails.regenerateStarted', 'Thumbnail regeneration started'));
    },
    onError: (err) => {
      toast.error(regenerateErrorMessage(err, t('settings.thumbnails.regenerateError', 'Failed to start thumbnail regeneration')));
    },
  });

  // Lightbox preview tier (#492). Eager regeneration counterpart to
  // ensurePreviewImage's lazy on-first-open generation. Useful after
  // flipping the toggle on so guests don't pay the lazy-cost on the
  // very first lightbox open per gallery.
  const regeneratePreviewsMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/admin/thumbnails/regenerate-previews');
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || t('settings.thumbnails.previewsRegenerateStarted', 'Lightbox preview regeneration started'));
    },
    onError: (err) => {
      toast.error(regenerateErrorMessage(err, t('settings.thumbnails.previewsRegenerateError', 'Failed to start preview regeneration')));
    },
  });

  const handleChange = <K extends keyof ThumbnailSettings>(
    key: K,
    value: ThumbnailSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  const handleReset = () => {
    if (fetchedData?.settings) {
      const s = fetchedData.settings;
      setSettings({
        width: parseInt(s.thumbnail_width?.value) || defaultSettings.width,
        height: parseInt(s.thumbnail_height?.value) || defaultSettings.height,
        quality: parseInt(s.thumbnail_quality?.value) || defaultSettings.quality,
        fit: s.thumbnail_fit?.value || defaultSettings.fit,
        format: s.thumbnail_format?.value || defaultSettings.format,
        lightbox_preview_enabled: parseLightboxFlag(s.lightbox_preview_enabled?.value),
      });
      setIsDirty(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loading size="lg" text={t('common.loading')} />
      </div>
    );
  }

  if (error) {
    return (
      <Card><CardContent><div className="flex items-center gap-3 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                  <p>{t('settings.thumbnails.loadError', 'Failed to load thumbnail settings')}</p>
                </div></CardContent></Card>
    );
  }

  const fitOptions = fetchedData?.fitOptions || ['cover', 'contain', 'fill', 'inside', 'outside'];
  const formatOptions = fetchedData?.formatOptions || ['jpeg', 'png', 'webp'];

  return (
    <div className="space-y-6">
      {!canEdit && (
        <Card className="bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800"><CardContent><div className="flex items-start gap-3 text-sm text-amber-800 dark:text-amber-200">
                          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                          <p>{t('settings.thumbnails.readOnly', 'Only admins who can edit settings can change these values or regenerate the whole library.')}</p>
                        </div></CardContent></Card>
      )}
      <fieldset disabled={!canEdit} className="space-y-6 min-w-0">
      {/* Dimensions & Quality */}
      <Card><CardContent><h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Image className="w-5 h-5 text-brand-600" />
                        {t('settings.thumbnails.dimensionsTitle', 'Thumbnail Dimensions & Quality')}
                      </h2><p className="text-sm text-muted-foreground mb-4">
                        {t('settings.thumbnails.dimensionsHelp', 'Configure the size and quality of auto-generated thumbnails. Higher values produce better-looking previews but increase storage and load times.')}
                      </p><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            {t('settings.thumbnails.width', 'Width (px)')}
                          </label>
                          <input
                            type="number"
                            min="50"
                            max="1000"
                            value={settings.width}
                            onChange={(e) => handleChange('width', parseInt(e.target.value) || 300)}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('settings.thumbnails.widthHelp', '50-1000 pixels')}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            {t('settings.thumbnails.height', 'Height (px)')}
                          </label>
                          <input
                            type="number"
                            min="50"
                            max="1000"
                            value={settings.height}
                            onChange={(e) => handleChange('height', parseInt(e.target.value) || 300)}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('settings.thumbnails.heightHelp', '50-1000 pixels')}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            {t('settings.thumbnails.quality', 'Quality')}
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={settings.quality}
                            onChange={(e) => handleChange('quality', parseInt(e.target.value) || 85)}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('settings.thumbnails.qualityHelp', '1-100, higher = better quality but larger files')}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            {t('settings.thumbnails.format', 'Format')}
                          </label>
                          <select
                            value={settings.format}
                            onChange={(e) => handleChange('format', e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          >
                            {formatOptions.map((fmt) => (
                              <option key={fmt} value={fmt}>{fmt.toUpperCase()}</option>
                            ))}
                          </select>
                        </div>
                      </div><div className="mt-4">
                        <label className="block text-sm font-medium text-foreground mb-1">
                          {t('settings.thumbnails.fit', 'Fit Mode')}
                        </label>
                        <select
                          value={settings.fit}
                          onChange={(e) => handleChange('fit', e.target.value)}
                          className="w-full sm:w-64 px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        >
                          {fitOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {t(`settings.thumbnails.fit_${opt}`, opt.charAt(0).toUpperCase() + opt.slice(1))}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('settings.thumbnails.fitHelp', 'How images are resized to fit the thumbnail dimensions. "Cover" crops to fill, "Contain" fits within bounds.')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {t('settings.thumbnails.fitRecommendation', 'Recommendation: use "Inside" for masonry / mosaic / justified layouts (preserves aspect ratio); "Cover" for uniform 1:1 grid tiles.')}
                        </p>
                      </div></CardContent></Card>

      {/* Regenerate */}
      <Card><CardContent><h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-brand-600" />
                        {t('settings.thumbnails.regenerateTitle', 'Regenerate Thumbnails')}
                      </h2><p className="text-sm text-muted-foreground mb-4">
                        {t('settings.thumbnails.regenerateHelp', 'After changing thumbnail settings, regenerate all existing thumbnails to apply the new configuration. This runs in the background and may take a while for large galleries.')}
                      </p><Button
                                          variant="outline"
                                          onClick={() => regenerateMutation.mutate()} disabled={regenerateMutation.isPending}
                                        >
                                          {regenerateMutation.isPending && <Loader2 className="animate-spin" />}{regenerateMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}{t('settings.thumbnails.regenerateButton', 'Regenerate All Thumbnails')}</Button></CardContent></Card>

      {/* Lightbox preview tier (#492). The toggle no longer decides whether
          the lightbox uses previews — since #1166 it always does, falling back
          to slideshow_url, which the server emits for every image. Saving it
          does not itself generate anything, so the copy does not claim to:
          what it does is unlock the regenerate button below and keep
          preview_url emitted. */}
      <Card><CardContent><h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                        <Image className="w-5 h-5 text-brand-600" />
                        {t('settings.thumbnails.lightboxTitle', 'Lightbox Preview Tier')}
                      </h2><p className="text-sm text-muted-foreground mb-4">
                        {t('settings.thumbnails.lightboxHelp', 'The lightbox shows an aspect-preserved ~1920px JPEG (typically 200–500 KB) rather than the full original (often 5–12 MB). Originals are still served when guests click Download. Previews cost roughly one extra file per photo on disk and are stored in /previews.')}
                      </p><label className="flex items-start gap-3 cursor-pointer mb-4">
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded-sm border-border text-brand focus:ring-brand-500"
                          checked={settings.lightbox_preview_enabled}
                          onChange={(e) => handleChange('lightbox_preview_enabled', e.target.checked)}
                        />
                        <span className="text-sm">
                          <span className="font-medium text-foreground">
                            {t('settings.thumbnails.lightboxToggle', 'Enable eager preview generation')}
                          </span>
                          <span className="block text-xs text-muted-foreground mt-0.5">
                            {t('settings.thumbnails.lightboxToggleHelp', 'Off by default: each preview is built the first time a guest opens that photo. Turning this on unlocks the button below, which builds them all up front.')}
                          </span>
                        </span>
                      </label>{/* Eager regeneration so guests don't pay the lazy first-open
                          cost. Only useful after the toggle is on; gated so admins
                          don't accidentally kick off a job that won't be visible. */}<Button
                                          variant="outline"
                                          onClick={() => regeneratePreviewsMutation.mutate()} disabled={!settings.lightbox_preview_enabled || regeneratePreviewsMutation.isPending}
                                        >
                                          {regeneratePreviewsMutation.isPending && <Loader2 className="animate-spin" />}{regeneratePreviewsMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}{t('settings.thumbnails.regeneratePreviewsButton', 'Regenerate All Previews')}</Button></CardContent></Card>

      {/* Info Box */}
      <Card className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800"><CardContent><div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800 dark:text-blue-200">
                          <p className="font-medium mb-1">{t('settings.thumbnails.infoTitle', 'About Thumbnails')}</p>
                          <p>
                            {t('settings.thumbnails.infoText', 'Thumbnails are smaller preview images generated from your originals. Increasing the size or quality improves how photos look in the gallery grid but uses more storage and bandwidth. After changing settings, use "Regenerate All Thumbnails" to update existing photos.')}
                          </p>
                        </div>
                      </div></CardContent></Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
                            onClick={handleSave} disabled={!isDirty || saveMutation.isPending}
                          >
                            {saveMutation.isPending && <Loader2 className="animate-spin" />}<Save className="w-5 h-5" />{t('common.saveChanges', 'Save Changes')}</Button>

        {isDirty && (
          <Button
                                  variant="outline"
                                  onClick={handleReset}
                                >
                                  <RefreshCw className="w-5 h-5" />{t('common.resetChanges', 'Reset Changes')}</Button>
        )}
      </div>
      </fieldset>
    </div>
  );
};
