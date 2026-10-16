import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { z } from 'zod';
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
  if (error.response.status === 401) return 'Your session has expired. Please log in again.';
  if (error.response.status === 403) return 'You do not have permission to perform this action.';
  return error.response?.data?.message || 'We could not complete this action. Please try again.';
}

export default function Login() {
  const navigate = useNavigate();
  const { user, login, verifyMfa } = useAuth();
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [pendingEmail, setPendingEmail] = useState('');
  
  const loginSubmitBusy = useRef(false);
  const mfaSubmitBusy = useRef(false);

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
    formState: { errors: mfaErrors, isSubmitting: isVerifying }
  } = useForm({
    resolver: zodResolver(mfaSchema),
    defaultValues: {
      code: ''
    }
  });

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
                Sign in through the dedicated {PORTAL_ROLE} portal for access.
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
                
                <div className="pt-2">
                  <Button type="submit" loading={isSubmitting} className="group w-full h-12 text-base font-semibold rounded-lg flex justify-center items-center gap-2">
                    Continue
                    {!isSubmitting && <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <h1 className="font-display-sm text-display-sm text-primary font-bold">Verify Your Identity</h1>
              <p className="mt-2 font-body-md text-body-md text-on-surface-variant max-w-[300px] mx-auto">
                Enter the 6-digit code sent to {mfaChallenge.delivery?.destination || pendingEmail}.
              </p>

              <form className="mt-8 space-y-6 text-left" onSubmit={handleMfaSubmit(onVerifyMfa)}>
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
                
                <div className="space-y-3 pt-2">
                  <Button type="submit" loading={isVerifying} className="w-full h-12 text-base font-semibold rounded-full flex justify-center items-center">
                    Verify & Sign In
                  </Button>
                  <Button type="button" variant="secondary" className="w-full h-12 text-base font-semibold rounded-full border-outline text-primary hover:bg-surface-container-low" onClick={() => setMfaChallenge(null)}>
                    Use a different account
                  </Button>
                </div>
              </form>
            </>
          )}

          <p className="mt-8 font-body-sm text-body-sm text-on-surface-variant">
            Need a {PORTAL_ROLE} account?{' '}
            <Link to="/register" className="font-semibold text-primary hover:text-secondary transition-colors">
              Register
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
