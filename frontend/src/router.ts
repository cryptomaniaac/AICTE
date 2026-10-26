import { useState, useEffect } from 'react';
import type { NavPage } from './types';

export type LandingTab = 'home' | 'features' | 'how-it-works' | 'roles';

export interface RouteState {
  isApp: boolean;
  landingTab: LandingTab;
  appPage: NavPage;
  hashItem: string | null;
  pathname: string;
}

export function parseRoute(pathname: string, hash: string): RouteState {
  let hashItem: string | null = null;
  if (hash.startsWith('#/item/')) {
    hashItem = decodeURIComponent(hash.slice(7));
  } else if (hash.startsWith('#item-')) {
    hashItem = decodeURIComponent(hash.slice(6));
  }

  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  if (cleanPath.startsWith('/app')) {
    const sub = cleanPath.slice(4).replace(/^\/+/, '');
    let appPage: NavPage = 'ov';
    if (sub === 'applications') appPage = 'ap';
    else if (sub === 'evc') appPage = 'evc';
    else if (sub === 'undertakings') appPage = 'un';
    else if (sub === 'documents') appPage = 'dc';
    else if (sub === 'escalations') appPage = 'es';
    else if (sub === 'audit') appPage = 'lg';
    else appPage = 'ov';

    return {
      isApp: true,
      landingTab: 'home',
      appPage,
      hashItem,
      pathname: cleanPath,
    };
  }

  let landingTab: LandingTab = 'home';
  if (cleanPath === '/features') landingTab = 'features';
  else if (cleanPath === '/how-it-works') landingTab = 'how-it-works';
  else if (cleanPath === '/roles') landingTab = 'roles';
  else landingTab = 'home';

  return {
    isApp: false,
    landingTab,
    appPage: 'ov',
    hashItem,
    pathname: cleanPath,
  };
}

export function appPageToPath(page: NavPage): string {
  switch (page) {
    case 'ov':  return '/app/overview';
    case 'ap':  return '/app/applications';
    case 'evc': return '/app/evc';
    case 'un':  return '/app/undertakings';
    case 'dc':  return '/app/documents';
    case 'es':  return '/app/escalations';
    case 'lg':  return '/app/audit';
    default:    return '/app/overview';
  }
}

export function pathToAppPage(path: string): NavPage {
  const clean = path.replace(/\/+$/, '');
  if (clean.includes('/applications')) return 'ap';
  if (clean.includes('/evc')) return 'evc';
  if (clean.includes('/undertakings')) return 'un';
  if (clean.includes('/documents')) return 'dc';
  if (clean.includes('/escalations')) return 'es';
  if (clean.includes('/audit')) return 'lg';
  return 'ov';
}

/** Global navigation helper supporting view transitions and browser history */
export function navigateTo(url: string, options?: { replace?: boolean; transition?: boolean }) {
  const perform = () => {
    if (options?.replace) {
      window.history.replaceState({}, '', url);
    } else {
      window.history.pushState({}, '', url);
    }
    window.dispatchEvent(new Event('popstate'));
  };

  if (options?.transition && 'startViewTransition' in document) {
    (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(perform);
  } else {
    perform();
  }
}

/** React hook subscribing to current path & hash */
export function useRoute(): RouteState {
  const [route, setRoute] = useState<RouteState>(() =>
    parseRoute(window.location.pathname, window.location.hash)
  );

  useEffect(() => {
    const handleLocationChange = () => {
      setRoute(parseRoute(window.location.pathname, window.location.hash));
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  return route;
}
