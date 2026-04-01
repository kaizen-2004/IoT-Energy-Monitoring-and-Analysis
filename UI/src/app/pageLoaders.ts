import type { ComponentType } from 'react';

export type AppPageKey = 'dashboard' | 'settings' | 'reports';

type PageModule = { default: ComponentType };

const pageImports = {
  dashboard: () => import('./pages/Dashboard'),
  settings: () => import('./pages/Settings'),
  reports: () => import('./pages/Reports'),
} as const;

const pageImportCache: Partial<Record<AppPageKey, Promise<PageModule>>> = {};

function loadPage(key: AppPageKey) {
  const cached = pageImportCache[key];
  if (cached) {
    return cached;
  }

  const request = pageImports[key]();
  pageImportCache[key] = request;
  return request;
}

export function loadDashboardPage() {
  return loadPage('dashboard');
}

export function loadSettingsPage() {
  return loadPage('settings');
}

export function loadReportsPage() {
  return loadPage('reports');
}

export function prefetchPage(key: AppPageKey) {
  void loadPage(key).catch(() => {
    delete pageImportCache[key];
  });
}

export function prefetchPages(keys: AppPageKey[]) {
  for (const key of keys) {
    prefetchPage(key);
  }
}
