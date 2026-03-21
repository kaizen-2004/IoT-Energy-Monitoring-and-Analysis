import { Outlet, Link, useLocation } from 'react-router';
import { Home, Settings, FileText } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/settings', label: 'Settings', icon: Settings },
    { path: '/reports', label: 'Reports', icon: FileText },
  ];
  
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Main Content */}
      <main className="px-4 py-6">
        <Outlet />
      </main>
      
      {/* Bottom Navigation - Mobile First with 44px tap targets */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 z-50">
        <div className="flex justify-around items-center h-20 max-w-md mx-auto">
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