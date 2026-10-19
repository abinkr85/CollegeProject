import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Lock, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { requestPasswordReset, resetPasswordWithOtp } from '../api/authApi';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import OtpInput from '../components/ui/OtpInput';
import { PORTAL_ROLE, PORTAL_ROLE_LABEL } from '../portalConfig';

const requestSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.')
});

const resetSchema = z
  .object({
    code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit verification code.'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .regex(/[A-Z]/, 'Must include at least one uppercase letter.')
      .regex(/[a-z]/, 'Must include at least one lowercase letter.')
      .regex(/[0-9]/, 'Must include at least one number.')
      .regex(/[^A-Za-z0-9]/, 'Must include at least one special character.'),
    confirmPassword: z.string().min(1, 'Please confirm your new password.')
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword']
  });

function parseApiError(error) {
  if (!error.response) return 'Unable to connect to the server. Check your connection and try again.';
  if (error.response.data?.message) return error.response.data.message;
  if (error.response.status === 400) return 'Invalid request. Please verify the entered details.';
  if (error.response.status === 401) return 'Verification code is invalid or expired.';
  if (error.response.status === 429) return 'Too many attempts. Please wait a few minutes before trying again.';
  return 'We could not complete this action. Please try again.';
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = request, 2 = verify & reset, 3 = success
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const requestBusy = useRef(false);
  const resetBusy = useRef(false);

  // Form for Step 1
  const {
    register: registerRequest,
    handleSubmit: handleRequestSubmit,
    formState: { errors: requestErrors, isSubmitting: isRequesting }
  } = useForm({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: '' }
  });

  // Form for Step 2
  const {
    register: registerReset,
    control: resetControl,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors, isSubmitting: isResetting }
  } = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      code: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  async function onRequestCode(values) {
    if (requestBusy.current) return;
    requestBusy.current = true;
    try {
      const data = await requestPasswordReset(values.email);
      setEmail(values.email);
      setResetToken(data?.resetToken || '');
      setResendCooldown(60);
      setStep(2);
      toast.info(data?.message || 'Verification code sent to your email.');
    } catch (error) {
      toast.error(parseApiError(error));
    } finally {
      requestBusy.current = false;
    }
  }

  async function onResendCode() {
    if (resendCooldown > 0 || !email || isRequesting) return;
    try {
      const data = await requestPasswordReset(email);
      if (data?.resetToken) {
        setResetToken(data.resetToken);
      }
      setResendCooldown(60);
      toast.info('A new verification code has been sent to your email.');
    } catch (error) {
      toast.error(parseApiError(error));
    }
  }

  async function onResetPassword(values) {
    if (resetBusy.current) return;
    resetBusy.current = true;
    try {
      await resetPasswordWithOtp({
        resetToken,
        email,
        code: values.code,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword
      });
      setStep(3);
      toast.success('Password reset successfully!');
    } catch (error) {
      toast.error(parseApiError(error));
    } finally {
      resetBusy.current = false;
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[460px]">
        <section className="bg-surface-container-lowest rounded-2xl p-8 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-outline-variant text-center">
          
          {step === 1 && (
            <>
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                <KeyRound size={24} />
              </div>

              <h1 className="font-display-sm text-display-sm text-primary font-bold">
                Forgot Password?
              </h1>
              <p className="mt-2 font-body-md text-body-md text-on-surface-variant max-w-[320px] mx-auto">
                Enter your registered {PORTAL_ROLE} email and we will send you a 6-digit verification code.
              </p>

              <form className="mt-8 space-y-5 text-left" onSubmit={handleRequestSubmit(onRequestCode)}>
                <Input
                  id="email"
                  label="Registered Email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email"
                  icon={Mail}
                  error={requestErrors.email?.message}
                  {...registerRequest('email')}
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    loading={isRequesting}
                    className="group w-full h-12 text-base font-semibold rounded-lg flex justify-center items-center gap-2"
                  >
                    Send Verification Code
                    {!isRequesting && (
                      <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
                    )}
                  </Button>
                </div>
              </form>

              <div className="mt-6 pt-6 border-t border-outline-variant flex justify-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-secondary transition-colors"
                >
                  <ArrowLeft size={16} /> Back to Login
                </Link>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                <ShieldCheck size={24} />
              </div>

              <h1 className="font-display-sm text-display-sm text-primary font-bold">
                Reset Password
              </h1>
              <p className="mt-2 font-body-md text-body-md text-on-surface-variant max-w-[320px] mx-auto">
                Enter the 6-digit code sent to <span className="font-semibold text-on-surface">{email}</span> and create your new password.
              </p>

              <form className="mt-6 space-y-5 text-left" onSubmit={handleResetSubmit(onResetPassword)}>
                <div>
                  <label className="label-base block text-center mb-2">Verification Code</label>
                  <Controller
                    name="code"
                    control={resetControl}
                    render={({ field }) => (
                      <OtpInput
                        id="code"
                        error={resetErrors.code?.message}
                        {...field}
                      />
                    )}
                  />
                  <div className="mt-2 text-center">
                    {resendCooldown > 0 ? (
                      <span className="text-xs text-on-surface-variant">
                        Resend code in {resendCooldown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={onResendCode}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-secondary transition-colors"
                      >
                        <RefreshCw size={13} /> Resend verification code
                      </button>
                    )}
                  </div>
                </div>

                <Input
                  id="newPassword"
                  label="New Password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  icon={Lock}
                  error={resetErrors.newPassword?.message}
                  {...registerReset('newPassword')}
                />

                <Input
                  id="confirmPassword"
                  label="Confirm New Password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat new password"
                  icon={Lock}
                  error={resetErrors.confirmPassword?.message}
                  {...registerReset('confirmPassword')}
                />

                <div className="text-xs text-on-surface-variant bg-surface-container-low p-3 rounded-lg space-y-1">
                  <p className="font-medium text-on-surface">Password must contain:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs text-on-surface-variant">
                    <li>Minimum 8 characters</li>
                    <li>At least one uppercase and lowercase letter</li>
                    <li>At least one number and special character</li>
                  </ul>
                </div>

                <div className="pt-2 space-y-3">
                  <Button
                    type="submit"
                    loading={isResetting}
                    className="w-full h-12 text-base font-semibold rounded-lg flex justify-center items-center"
                  >
                    Reset Password
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full h-11 text-sm font-semibold rounded-lg border-outline text-primary hover:bg-surface-container-low"
                    onClick={() => setStep(1)}
                  >
                    Use a different email
                  </Button>
                </div>
              </form>
            </>
          )}

          {step === 3 && (
            <div className="py-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-5">
                <CheckCircle2 size={36} />
              </div>

              <h1 className="font-display-sm text-display-sm text-primary font-bold">
                Password Reset Successfully!
              </h1>
              <p className="mt-3 font-body-md text-body-md text-on-surface-variant max-w-[320px] mx-auto">
                Your password has been securely updated. You can now sign in to your {PORTAL_ROLE_LABEL} account.
              </p>

              <div className="mt-8">
                <Button
                  type="button"
                  onClick={() => navigate('/login', { replace: true })}
                  className="w-full h-12 text-base font-semibold rounded-lg flex justify-center items-center gap-2"
                >
                  Sign In Now
                  <ArrowRight size={18} />
                </Button>
              </div>
            </div>
          )}

        </section>
      </div>
    </main>
  );
}
