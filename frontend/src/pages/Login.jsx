import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Lock, Mail, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { resendMfaLogin } from '../api/authApi';
import { useAuth } from '../hooks/useAuth';
import { PORTAL_HOME_PATH, PORTAL_ROLE, PORTAL_ROLE_LABEL } from '../portalConfig';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import OtpInput from '../components/ui/OtpInput';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.')
});

const mfaSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code.')
});

function parseApiError(error) {
  if (!error.response) return 'Unable to connect to the server. Check your connection and try again.';
  if (error.response.data?.message) return error.response.data.message;
  if (error.response.status === 401) return 'Invalid email or password.';
  if (error.response.status === 403) return 'You do not have permission to perform this action.';
  return 'We could not complete this action. Please try again.';
}

export default function Login() {
  const navigate = useNavigate();
  const { user, login, verifyMfa } = useAuth();
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [pendingEmail, setPendingEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const loginSubmitBusy = useRef(false);
  const mfaSubmitBusy = useRef(false);
  const resendBusy = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const {
    control,
    handleSubmit: handleMfaSubmit,
    setValue: setMfaValue,
    formState: { errors: mfaErrors, isSubmitting: isVerifying }
  } = useForm({
    resolver: zodResolver(mfaSchema),
    defaultValues: {
      code: ''
    }
  });

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (user) {
    return <Navigate to={PORTAL_HOME_PATH} replace />;
  }

  async function onSubmit(values) {
    if (loginSubmitBusy.current) return;
    loginSubmitBusy.current = true;
    try {
      const data = await login(values.email, values.password);
      if (data?.accessToken) {
        toast.success(`Welcome back, ${data.user?.name || 'User'}!`);
        navigate(PORTAL_HOME_PATH, { replace: true });
        return;
      }
      setPendingEmail(values.email);
      setMfaChallenge(data);
      setResendCooldown(60);
      toast.info(`Verification code sent to ${data.delivery?.destination || 'your email'}`);
    } catch (error) {
      const message = parseApiError(error);
      if (message === 'Invalid email or password') {
        toast.error('Invalid credentials');
      } else {
        toast.error(message);
      }
    } finally {
      loginSubmitBusy.current = false;
    }
  }

  async function onResendMfa() {
    if (resendBusy.current || resendCooldown > 0 || !mfaChallenge?.mfaToken) return;
    resendBusy.current = true;
    try {
      const data = await resendMfaLogin({ mfaToken: mfaChallenge.mfaToken });
      if (data?.mfaToken) {
        setMfaChallenge((prev) => ({
          ...prev,
          ...data
        }));
      }
      setResendCooldown(60);
      toast.info(`A new verification code has been sent to ${data?.delivery?.destination || 'your email'}.`);
    } catch (error) {
      toast.error(parseApiError(error));
    } finally {
      resendBusy.current = false;
    }
  }

  async function onVerifyMfa(values) {
    if (mfaSubmitBusy.current) return;
    mfaSubmitBusy.current = true;
    try {
      await verifyMfa(mfaChallenge.mfaToken, values.code);
      navigate(PORTAL_HOME_PATH, { replace: true });
    } catch (error) {
      toast.error(parseApiError(error));
    } finally {
      mfaSubmitBusy.current = false;
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[440px]">
        <section className="bg-surface-container-lowest rounded-2xl p-10 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-outline-variant text-center">
          {!mfaChallenge ? (
            <>
              <h1 className="font-display-sm text-display-sm text-primary font-bold">{PORTAL_ROLE_LABEL} Login</h1>
              <p className="mt-2 font-body-md text-body-md text-on-surface-variant max-w-[280px] mx-auto">
                Sign in with your registered college account.
              </p>

              <form className="mt-8 space-y-5 text-left" onSubmit={handleSubmit(onSubmit)}>
                <Input
                  id="email"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  placeholder="Email Address"
                  icon={Mail}
                  error={errors.email?.message}
                  {...register('email')}
                />
                <Input
                  id="password"
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Password"
                  icon={Lock}
                  error={errors.password?.message}
                  {...register('password')}
                />
                
                <div className="flex justify-end -mt-2">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-primary hover:text-secondary transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                
                <div className="pt-2">
                  <Button type="submit" loading={isSubmitting} className="group w-full h-12 text-base font-semibold rounded-lg flex justify-center items-center gap-2">
                    Continue
                    {!isSubmitting && <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />}
                  </Button>
                </div>
              </form>

              <p className="mt-8 font-body-sm text-body-sm text-on-surface-variant">
                Don't have an account?{' '}
                <Link to="/register" className="font-semibold text-primary hover:text-secondary transition-colors">
                  Sign up
                </Link>
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display-sm text-display-sm text-primary font-bold">Verify Your Identity</h1>
              <p className="mt-2 font-body-md text-body-md text-on-surface-variant max-w-[300px] mx-auto">
                Enter the 6-digit code sent to {mfaChallenge.delivery?.destination || pendingEmail}.
              </p>

              <form className="mt-8 space-y-6 text-left" onSubmit={handleMfaSubmit(onVerifyMfa)}>
                <div>
                  <Controller
                    name="code"
                    control={control}
                    render={({ field }) => (
                      <OtpInput
                        id="code"
                        error={mfaErrors.code?.message}
                        {...field}
                      />
                    )}
                  />

                  <div className="mt-4 text-center">
                    {resendCooldown > 0 ? (
                      <p className="text-xs text-on-surface-variant font-medium">
                        Resend code in <span className="font-semibold text-primary">{resendCooldown}s</span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={onResendMfa}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-secondary transition-colors"
                      >
                        <RefreshCw size={13} /> Resend verification code
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3 pt-2">
                  <Button type="submit" loading={isVerifying} className="w-full h-12 text-base font-semibold rounded-lg flex justify-center items-center">
                    Verify & Sign In
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full h-11 text-sm font-semibold rounded-lg border-outline text-primary hover:bg-surface-container-low"
                    onClick={() => {
                      setMfaChallenge(null);
                      setResendCooldown(0);
                    }}
                  >
                    Use a different account
                  </Button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
