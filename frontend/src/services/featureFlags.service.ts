import { api } from '../config/api';

export type FeatureKey =
  | 'galleries'
  | 'reminderEmails'
  | 'analytics'
  | 'userManagement'
  // WhatsApp Business API delivery channel (migration 136, #640D).
  // Strictly opt-in — requires a Meta Business Account, an approved
  // message template, and a Meta access token. Independent of email; both
  // can fire on the same event.
  | 'whatsapp'
  // Live Slideshow ("Diashow") — per-event fullscreen kiosk link + presets +
  // global watermark settings tab. Strictly opt-in; gates all slideshow UI.
  | 'slideshow'
  // PicTransfer (migration 170) — cross-event file transfers:
  // a token-protected recipient download link plus an optional client-upload
  // channel. Strictly opt-in; gates the sidebar entry, the /admin/transfers
  // area and every transfer route (admin + public).
  | 'transfers';

export type FeatureFlags = Record<FeatureKey, boolean>;

export const featureFlagsService = {
  async get(): Promise<FeatureFlags> {
    const response = await api.get<FeatureFlags>('/admin/feature-flags');
    return response.data;
  },

  async update(flags: Partial<FeatureFlags>): Promise<FeatureFlags> {
    const response = await api.put<FeatureFlags>('/admin/feature-flags', flags);
    return response.data;
  },
};
