import { Outlet, Link, useLocation } from 'react-router';
import { Home, Settings, FileText, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { applyTheme, getSavedThemeMode, saveTheme, type ThemeMode } from '../utils/theme';

export default function Layout() {
  const location = useLocation();
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/settings', label: 'Settings', icon: Settings },
    { path: '/reports', label: 'Reports', icon: FileText },
  ];

  useEffect(() => {
    const savedMode = getSavedThemeMode();
    setThemeMode(savedMode);
    applyTheme(savedMode);
  }, []);

  const handleToggleTheme = () => {
    const nextMode: ThemeMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextMode);
    saveTheme(nextMode);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur shadow-sm border-b border-gray-200 dark:border-gray-800">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 sm:h-16 sm:py-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">⚡</span>
              </div>
              <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">Energy Monitor</span>
            </div>

            <button
              type="button"
              onClick={handleToggleTheme}
              className="sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
              title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {themeMode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <div className="hidden sm:flex w-full sm:w-auto flex-wrap items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-600'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                    } min-w-[44px]`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                );
              })}

              <button
                type="button"
                onClick={handleToggleTheme}
                className="ml-auto sm:ml-0 flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle theme"
                title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {themeMode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                <span className="hidden sm:inline text-sm">{themeMode === 'dark' ? 'Light' : 'Dark'}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur">
        <div className="grid grid-cols-4 px-1 py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`inline-flex flex-col items-center justify-center gap-1 rounded-lg py-2 ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-600'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] leading-none">{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={handleToggleTheme}
            className="inline-flex flex-col items-center justify-center gap-1 rounded-lg py-2 text-gray-600 dark:text-gray-300"
            aria-label="Toggle theme"
            title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {themeMode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span className="text-[11px] leading-none">{themeMode === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 sm:pb-8">
        <Outlet />
      </main>

      <footer className="mt-2 sm:mt-6 border-t border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur mb-16 sm:mb-0">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            © 2026 Steve Villa. IoT Household Energy Monitoring Dashboard. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
