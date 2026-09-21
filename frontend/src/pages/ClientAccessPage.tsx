import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Lock, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Loading, PoweredBy } from '../components/common';
import { useGalleryAuth } from '../contexts';
import { useGalleryInfo } from '../hooks/useGallery';
import { usePublicSettings } from '../hooks/usePublicSettings';
import { usePublicDarkMode } from '../hooks/usePublicDarkMode';
import { buildResourceUrl } from '../utils/url';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const ClientAccessPage: React.FC = () => {
    const __fieldId = React.useId();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isClient, clientLogin, isLoading: authLoading } = useGalleryAuth();
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const { data: galleryInfo, isLoading: isLoadingInfo, error: infoError } = useGalleryInfo(slug);

  const { data: settingsData } = usePublicSettings();
  // Theme-aware logo: the page background follows the themed
  // --background (dark when branding_force_color_mode / OS is dark),
  // so pick the dark logo variant accordingly.
  const { isDark } = usePublicDarkMode();
  const lightLogo = settingsData?.branding_logo_url?.trim();
  const darkLogo = settingsData?.branding_logo_url_dark?.trim();
  const brandLogo = isDark ? (darkLogo || lightLogo) : (lightLogo || darkLogo);

  // If already authenticated as client, redirect to gallery
  React.useEffect(() => {
    if (isAuthenticated && isClient && slug) {
      navigate(`/gallery/${slug}`, { replace: true });
    }
  }, [isAuthenticated, isClient, slug, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pin.trim()) {
      setLoginError(t('clientAccess.enterPin'));
      return;
    }

    if (!slug) {
      setLoginError(t('errors.galleryNotFound'));
      return;
    }

    try {
      setIsLoggingIn(true);
      setLoginError(null);
      await clientLogin(slug, pin);
      navigate(`/gallery/${slug}`, { replace: true });
    } catch (error: any) {
      const statusCode = error.response?.status;
      if (statusCode === 401) {
        setLoginError(t('clientAccess.invalidPin'));
      } else if (statusCode === 423) {
        setLoginError(t('auth.tooManyAttempts'));
      } else {
        setLoginError(t('clientAccess.loginFailed'));
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isLoadingInfo || authLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--background, #fafafa)' }}>
        <div className="min-h-screen flex items-center justify-center">
          <Loading size="lg" text={t('gallery.loading')} />
        </div>
      </div>
    );
  }

  if (infoError || !galleryInfo) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--background, #fafafa)' }}>
        <div className="min-h-screen flex flex-col">
          {brandLogo && (
            <div className="p-8 text-center">
              <img
                src={buildResourceUrl(brandLogo)}
                alt={settingsData?.branding_company_name || 'Company Logo'}
                className="h-16 w-auto object-contain mx-auto"
              />
            </div>
          )}
          <div className="flex-1 flex items-center justify-center">
            <Card className="max-w-md w-full mx-4">
              <CardContent className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">{t('errors.galleryNotFound')}</h2>
                <p className="text-neutral-600">{t('errors.galleryNotFoundMessage')}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background, #fafafa)' }}>
      <div className="min-h-screen flex flex-col">
        {/* Logo — hidden when the admin turned it off for this gallery (#894) */}
        {brandLogo && galleryInfo.login_logo_visible !== false && (
          <div className="p-8 text-center">
            <img
              src={buildResourceUrl(brandLogo)}
              alt={settingsData?.branding_company_name || 'Company Logo'}
              className="h-16 w-auto object-contain mx-auto"
            />
          </div>
        )}

        <div className="flex-1 flex items-center justify-center px-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {t('clientAccess.title')}
                </h1>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
                  {galleryInfo.event_name}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                  {t('clientAccess.description')}
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="w-full"><Label className="block"><span className="mb-1.5 block">{t('clientAccess.pinLabel')}</span><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">{<Lock className="w-5 h-5" />}</div><Input
                                                type="password"
                                                placeholder={t('clientAccess.pinPlaceholder')}
                                                value={pin}
                                                onChange={(e) => {
                                                  setPin(e.target.value);
                                                  setLoginError(null);
                                                }}
                                                autoFocus className="pl-10" aria-invalid={!!(loginError || undefined)} aria-describedby={(loginError || undefined) ? `${__fieldId}-0-error` : undefined}
                                              /></div>{(loginError || undefined) && <p id={`${__fieldId}-0-error`} className="mt-1.5 text-sm text-destructive">{loginError || undefined}</p>}</Label></div>

                <Button
                                                type="submit"
                                                className="w-full" disabled={isLoggingIn || isLoggingIn}
                                              >
                                                {isLoggingIn && <Loader2 className="animate-spin" />}{t('clientAccess.loginButton')}</Button>
              </form>

              <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 text-center">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t('clientAccess.guestHint')}{' '}
                  <Link
                    to={`/gallery/${slug}`}
                    className="text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    {t('clientAccess.guestLink')}
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="p-8 text-center">
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/impressum"
              className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              {t('legal.impressum')}
            </Link>
            <span className="text-xs text-neutral-400">|</span>
            <Link
              to="/datenschutz"
              className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              {t('legal.datenschutz')}
            </Link>
          </div>
          <PoweredBy className="text-xs mt-2 text-neutral-500" />
        </div>
      </div>
    </div>
  );
};
