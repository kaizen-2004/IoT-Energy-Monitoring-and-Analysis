import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import CanAuthGate from './components/CanAuthGate';

export default function App() {
  return (
    <>
      <CanAuthGate>
        <RouterProvider router={router} />
      </CanAuthGate>
      <Toaster />
    </>
  );
}
