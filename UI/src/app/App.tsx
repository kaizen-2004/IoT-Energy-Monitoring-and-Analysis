import { RouterProvider } from 'react-router';
import { Suspense, useEffect } from 'react';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { applyTheme, getSavedThemeMode } from './utils/theme';

export default function App() {
  useEffect(() => {
    applyTheme(getSavedThemeMode());
  }, []);

  return (
    <>
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
        <RouterProvider router={router} />
      </Suspense>
      <Toaster />
    </>
  );
}
