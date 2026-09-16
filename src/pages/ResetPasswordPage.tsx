import React, { useState, useEffect } from 'react';
import { PasswordInput } from '../components/PasswordInput';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { ChefHat, CheckCircle2, AlertCircle, ArrowRight, KeyRound } from 'lucide-react';

interface ResetPasswordPageProps {
  onGoToLogin: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onGoToLogin }) => {
  const { openAuthModal } = useAuth();

  const [tokenFromUrl, setTokenFromUrl] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState<string>('');
  const [codeInput, setCodeInput] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(
        window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
      );

      const detectedToken =
        searchParams.get('token') ||
        searchParams.get('otp') ||
        searchParams.get('access_token') ||
        hashParams.get('token') ||
        hashParams.get('otp') ||
        hashParams.get('access_token');

      const detectedEmail = searchParams.get('email') || hashParams.get('email') || '';
      const detectedCode = searchParams.get('code') || hashParams.get('code') || '';

      if (detectedToken) {
        setTokenFromUrl(detectedToken);
      }
      if (detectedEmail) {
        setEmailInput(detectedEmail);
      }
      if (detectedCode) {
        setCodeInput(detectedCode);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      let otpToUse = tokenFromUrl;

      // If no token from URL, exchange code and email
      if (!otpToUse) {
        if (!emailInput.trim()) {
          throw new Error('Please enter your registered email address.');
        }
        if (!codeInput.trim()) {
          throw new Error('Please enter the reset code sent to your email.');
        }

        otpToUse = await api.exchangeResetPasswordCode(emailInput.trim(), codeInput.trim());
      }

      await api.resetPassword(otpToUse, newPassword);

      // Successfully reset password
      setSuccess(true);
      // Clear passwords from state immediately
      setNewPassword('');
      setConfirmPassword('');
      setCodeInput('');
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password. The link or code may be expired or invalid.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    // Clear URL reset parameters
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/');
    }
    if (onGoToLogin) {
      onGoToLogin();
    } else {
      openAuthModal('login');
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-12 bg-stone-50 dark:bg-stone-950 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl shadow-xl border border-stone-200/80 dark:border-stone-800 p-6 sm:p-8">
        <div className="flex items-center justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-inner">
            <KeyRound className="w-7 h-7" />
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
            {success ? 'Password Reset Complete' : 'Reset Your Password'}
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-2">
            {success
              ? 'Your password has been reset successfully. You can now log in with your new credentials.'
              : 'Choose a secure new password for your ChefFork account.'}
          </p>
        </div>

        {error && (
          <div
            id="reset-password-error-alert"
            className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-sm"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-6">
            <div
              id="reset-password-success-box"
              className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-3 text-emerald-800 dark:text-emerald-200 text-sm font-medium"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Password reset successfully.</span>
            </div>

            <button
              type="button"
              id="reset-password-go-to-login-btn"
              onClick={handleGoToLogin}
              className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm shadow-md hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Go to Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!tokenFromUrl && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Registered Email Address
                  </label>
                  <input
                    id="reset-password-email-input"
                    type="email"
                    required
                    placeholder="Enter your email address"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all placeholder:text-stone-400 dark:placeholder:text-stone-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Reset Code (from email)
                  </label>
                  <input
                    id="reset-password-code-input"
                    type="text"
                    required
                    placeholder="Enter 6-digit reset code"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.trim())}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all placeholder:text-stone-400 dark:placeholder:text-stone-500 font-mono tracking-wider"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                New Password
              </label>
              <PasswordInput
                id="reset-password-new-input"
                required
                placeholder="Enter new password (at least 6 characters)"
                value={newPassword}
                autoComplete="new-password"
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Confirm New Password
              </label>
              <PasswordInput
                id="reset-password-confirm-input"
                required
                placeholder="Confirm your new password"
                value={confirmPassword}
                autoComplete="new-password"
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              id="reset-password-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm shadow-md hover:shadow transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                id="reset-password-back-to-login-btn"
                onClick={handleGoToLogin}
                className="text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 cursor-pointer"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
