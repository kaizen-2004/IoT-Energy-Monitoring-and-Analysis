import { useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { Home, Settings, FileText } from 'lucide-react';

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
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/settings', label: 'Settings', icon: Settings },
    { path: '/reports', label: 'Reports', icon: FileText },
  ];
  
  return (
    <div className="app-shell min-h-dvh bg-gray-50">
      {/* Main Content */}
      <main className="page-content px-4 py-6">
        <Outlet />

        <footer className="mx-auto mt-8 max-w-md px-2 text-center text-[11px] leading-relaxed text-gray-500">
          © 2026 Steve Villa. IoT Household Energy Monitoring Dashboard. All rights reserved.
        </footer>
      </main>
      
      {/* Bottom Navigation - Mobile First with 44px tap targets */}
      <nav className="bottom-nav fixed left-0 right-0 bg-white/95 shadow-lg border-t border-gray-200 backdrop-blur-md z-50">
        <div className="bottom-nav-inner flex justify-around items-center max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
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
