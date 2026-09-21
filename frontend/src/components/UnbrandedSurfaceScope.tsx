import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Keeps the admin panel off the instance branding.
 *
 * ThemeContext.applyTheme() writes the branding as inline custom properties on
 * <html>, because the page background and its pattern live on body and
 * body::before and so need document-level scope. GlobalThemeProvider applies
 * that theme on every non-gallery route, which includes the admin panel.
 *
 * The admin panel is deliberately not branded — it is the photographer's own
 * tool and has its own dark-mode switch — so this toggles the
 * `.unbranded-surface` class on <body> for admin routes. That class re-points
 * the base tokens at the built-in palette (see index.css), which overrides the
 * inherited inline values for everything inside body.
 *
 * The class goes on <body> rather than on AdminLayout's root because dialogs,
 * dropdowns and toasts portal to body and would otherwise sit outside the
 * scope and keep rendering branded while the page behind them did not.
 */
const UNBRANDED_PREFIXES = ['/admin', '/setup'];

export const UnbrandedSurfaceScope = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const unbranded = UNBRANDED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    document.body.classList.toggle('unbranded-surface', unbranded);
    return () => document.body.classList.remove('unbranded-surface');
  }, [pathname]);

  return null;
};
