import { useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { Home, Settings, FileText, Zap } from 'lucide-react';
import { prefetchPage, prefetchPages } from '../pageLoaders';

const navItems = [
  { path: '/', label: 'Dashboard', icon: Home, pageKey: 'dashboard' as const },
  { path: '/settings', label: 'Settings', icon: Settings, pageKey: 'settings' as const },
  { path: '/reports', label: 'Reports', icon: FileText, pageKey: 'reports' as const },
];

export default function Layout() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const root = document.documentElement;
    const updateViewportOffset = () => {
      const viewport = window.visualViewport;
      if (!viewport) {
        root.style.setProperty('--viewport-bottom-offset', '0px');
        return;
      }

      const rawOffset = window.innerHeight - viewport.height - viewport.offsetTop;
      const bottomOffset = Number.isFinite(rawOffset) ? Math.max(0, rawOffset) : 0;
      root.style.setProperty('--viewport-bottom-offset', `${bottomOffset}px`);
    };

    updateViewportOffset();

    const viewport = window.visualViewport;
    window.addEventListener('resize', updateViewportOffset);
    viewport?.addEventListener('resize', updateViewportOffset);
    viewport?.addEventListener('scroll', updateViewportOffset);

    return () => {
      window.removeEventListener('resize', updateViewportOffset);
      viewport?.removeEventListener('resize', updateViewportOffset);
      viewport?.removeEventListener('scroll', updateViewportOffset);
      root.style.setProperty('--viewport-bottom-offset', '0px');
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const timeout = window.setTimeout(() => {
      const pagesToWarm = navItems
        .filter((item) => item.path !== location.pathname)
        .map((item) => item.pageKey);
      prefetchPages(pagesToWarm);
    }, 900);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [location.pathname]);
  
  return (
    <div className="app-shell min-h-dvh bg-slate-50">
      <div className="w-full px-4 pt-4 sm:px-6 lg:px-8">
        <header className="hidden items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">IoT Energy Monitor</p>
              <p className="text-xs text-slate-500">Mobile-first dashboard with desktop support</p>
            </div>
          </div>

          <nav className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onMouseEnter={() => prefetchPage(item.pageKey)}
                  onFocus={() => prefetchPage(item.pageKey)}
                  onTouchStart={() => prefetchPage(item.pageKey)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="page-content pt-3 lg:pt-6">
          <Outlet />
        </main>
      </div>

      <nav className="bottom-nav fixed left-0 right-0 z-50 border-t border-gray-200 bg-white/95 shadow-lg backdrop-blur-md lg:hidden">
        <div className="bottom-nav-inner flex justify-around items-center max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onMouseEnter={() => prefetchPage(item.pageKey)}
                onFocus={() => prefetchPage(item.pageKey)}
                onTouchStart={() => prefetchPage(item.pageKey)}
                className={`flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[80px] min-h-[56px] transition-colors ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-500'
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
