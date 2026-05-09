import { createContext, type FormEvent, type ReactNode, useContext, useEffect, useState } from 'react';
import { LockKeyhole, Zap } from 'lucide-react';
import {
  clearCanAuthentication,
  fetchAuthStatus,
  isCanAuthenticated,
  normalizeCanInput,
  rememberCanAuthentication,
  setupCustomerAccountAccess,
  verifyCustomerAccountNumber,
  type AuthStatus,
} from '../utils/auth';

type AuthMode = 'loading' | 'setup' | 'login';

type CanAuthContextValue = {
  authStatus: AuthStatus | null;
  logout: () => void;
};

const CanAuthContext = createContext<CanAuthContextValue | null>(null);

export function useCanAuth() {
  const context = useContext(CanAuthContext);
  if (!context) {
    throw new Error('useCanAuth must be used inside CanAuthGate');
  }

  return context;
}

export default function CanAuthGate({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AuthMode>('loading');
  const [authenticated, setAuthenticated] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [can, setCan] = useState('');
  const [setupCan, setSetupCan] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const status = await fetchAuthStatus();
        setAuthStatus(status);
        if (!status.canConfigured) {
          setMode('setup');
          return;
        }

        if (isCanAuthenticated()) {
          setAuthenticated(true);
          return;
        }

        setMode('login');
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load authentication status.');
        setMode('login');
      }
    };

    void loadStatus();
  }, []);

  const logout = () => {
    clearCanAuthentication();
    setCan('');
    setError('');
    setNotice('');
    setAuthenticated(false);
    setMode(authStatus?.canConfigured === false ? 'setup' : 'login');
  };

  const handleSetup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (normalizeCanInput(setupCan).length < 10) {
      setError('CAN must contain at least 10 digits.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setNotice('');

    try {
      const status = await setupCustomerAccountAccess(setupCan);
      setAuthStatus(status);
      rememberCanAuthentication();
      setAuthenticated(true);
      setSetupCan('');
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : 'Could not complete first-time setup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (normalizeCanInput(can).length < 10) {
      setError('Enter your Customer Account Number to continue.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setNotice('');

    try {
      const status = await verifyCustomerAccountNumber(can);
      setAuthStatus(status);
      rememberCanAuthentication();
      setAuthenticated(true);
      setCan('');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Could not verify Customer Account Number.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authenticated) {
    return <CanAuthContext.Provider value={{ authStatus, logout }}>{children}</CanAuthContext.Provider>;
  }

  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl lg:grid-cols-[1fr_0.9fr]">
          <section className="relative hidden min-h-[520px] overflow-hidden bg-slate-900 p-8 text-white lg:block">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/30 blur-3xl" />
            <div className="absolute -bottom-24 left-10 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-lg shadow-blue-500/30">
                  <Zap className="h-7 w-7" />
                </div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-200">IoT Energy Monitor</p>
                <h1 className="mt-4 max-w-sm text-4xl font-bold leading-tight">Secure access for your energy dashboard.</h1>
                <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
                  Set up a Customer Account Number gate before viewing readings, reports, and settings.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">Simple access gate</p>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  Your CAN is checked by the backend and stored only as a hash.
                </p>
              </div>
            </div>
          </section>

          <section className="p-6 sm:p-8 lg:p-10">
            <div className="mx-auto max-w-md">
              <div className="mb-8 flex items-center gap-3 lg:hidden">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">IoT Energy Monitor</p>
                  <p className="text-xs text-slate-500">Customer access required</p>
                </div>
              </div>

              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <LockKeyhole className="h-6 w-6" />
              </div>

              {mode === 'loading' && <p className="text-sm text-slate-600">Checking access setup...</p>}

              {mode === 'setup' && (
                <>
                  <h2 className="text-2xl font-bold text-slate-900">First-time CAN setup</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Create the Customer Account Number required before opening the dashboard.
                  </p>
                  <form className="mt-6 space-y-4" onSubmit={handleSetup}>
                    <LabeledInput id="setup-can" label="Customer Account Number" value={setupCan} onChange={setSetupCan} inputMode="numeric" />
                    <FormMessages error={error} notice={notice} />
                    <PrimaryButton disabled={isSubmitting}>{isSubmitting ? 'Saving setup...' : 'Save setup and continue'}</PrimaryButton>
                  </form>
                </>
              )}

              {mode === 'login' && (
                <>
                  <h2 className="text-2xl font-bold text-slate-900">Enter Customer Account Number</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Use the CAN from your utility account. Spaces or hyphens are okay; only digits are checked.
                  </p>
                  <form className="mt-8 space-y-4" onSubmit={handleLogin}>
                    <LabeledInput id="customer-account-number" label="Customer Account Number (CAN)" value={can} onChange={setCan} inputMode="numeric" />
                    <FormMessages error={error} notice={notice} />
                    <PrimaryButton disabled={isSubmitting}>{isSubmitting ? 'Verifying...' : 'Continue to Dashboard'}</PrimaryButton>
                  </form>
                  <p className="mt-4 text-xs leading-5 text-slate-500">
                    If you forget the CAN, reset it from the database/admin console or recreate app settings.
                  </p>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function LabeledInput({
  id,
  label,
  value,
  onChange,
  type = 'text',
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: 'numeric';
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode={inputMode}
        autoComplete="off"
        className="min-h-[52px] w-full rounded-xl border border-slate-300 bg-white px-4 text-base font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </div>
  );
}

function FormMessages({ error, notice }: { error: string; notice: string }) {
  return (
    <>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}
      {!error && notice && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {notice}
        </div>
      )}
    </>
  );
}

function PrimaryButton({ children, disabled }: { children: ReactNode; disabled: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="min-h-[52px] w-full rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition active:bg-blue-700 disabled:bg-slate-400"
    >
      {children}
    </button>
  );
}
