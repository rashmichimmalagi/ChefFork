import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { api } from '../api';
import { PasswordInput } from './PasswordInput';
import { X, Utensils, ArrowRight, CheckCircle2, KeyRound, AlertCircle } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    currentUser,
    showAuthModal,
    closeAuthModal,
    authModalTab,
    setAuthModalTab,
    login,
    signup,
  } = useAuth();
  const { showToast } = useToast();

  const isLogin = authModalTab === 'login';
  const isSignup = authModalTab === 'signup';
  const isForgotPassword = authModalTab === 'forgot-password';

  // Login & Signup form states
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // General loading & error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email verification states (Signup flow)
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot password & Reset states
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'enter-code' | 'success'>('request');
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  const resetAuthFormState = () => {
    setName('');
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setVerificationRequired(false);
    setVerificationSuccess(false);
    setVerificationEmail('');
    setVerificationCode('');
    setResendLoading(false);
    setResendCooldown(0);

    // Clear reset password state
    setResetEmail('');
    setResetCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setResetEmailSent(false);
    setResetStep('request');
    setResetSuccessMessage(null);
  };

  useEffect(() => {
    if (showAuthModal) {
      resetAuthFormState();
    }
  }, [showAuthModal]);

  useEffect(() => {
    if (!currentUser) {
      resetAuthFormState();
    }
  }, [currentUser]);

  useEffect(() => {
    setError(null);
  }, [authModalTab]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  if (!showAuthModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        if (!email.trim() || !password) {
          throw new Error('Please enter your email or username and password');
        }
        await login(email, password);
        showToast('Welcome back to ChefFork!');
      } else if (isSignup) {
        if (!name.trim()) throw new Error('Please enter your full name');
        if (!username.trim()) throw new Error('Please choose a username');
        if (!email.trim()) throw new Error('Please enter your email');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        if (confirmPassword && password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }

        const result = await signup(name, username, email, password);
        if (result?.requireEmailVerification) {
          setVerificationRequired(true);
          setVerificationSuccess(false);
          setVerificationEmail(email);
          setVerificationCode('');
          setName('');
          setUsername('');
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          showToast('Account created! Please check your email to verify.');
        } else {
          showToast('Welcome to ChefFork! Your kitchen is ready.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const code = verificationCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setError('Please enter the 6-digit verification code from your email.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await api.verifyEmail(verificationEmail, code);
      setVerificationCode('');
      setVerificationSuccess(true);
      showToast('Email verified successfully.');
    } catch (err: any) {
      setError(err.message || 'Unable to verify email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setError(null);
    setResendLoading(true);
    try {
      await api.resendVerificationEmail(verificationEmail);
      setResendCooldown(30);
      showToast('A new verification code has been sent.');
    } catch (err: any) {
      setError(err.message || 'Unable to resend verification code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setResetSuccessMessage(null);

    const cleanEmail = resetEmail.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
    if (!isEmail) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await api.sendPasswordResetEmail(cleanEmail);
      setResetEmailSent(true);
      setResetSuccessMessage('Password reset instructions have been sent to your email.');
      showToast('Password reset email sent');
    } catch (err: any) {
      setError(err.message || 'Unable to send password reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);

    const cleanEmail = resetEmail.trim();
    const cleanCode = resetCode.trim();

    if (!cleanEmail) {
      setError('Please enter your registered email address.');
      return;
    }
    if (!cleanCode) {
      setError('Please enter the reset code from your email.');
      return;
    }
    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const token = await api.exchangeResetPasswordCode(cleanEmail, cleanCode);
      await api.resetPassword(token, newPassword);

      setResetStep('success');
      setResetSuccessMessage('Password reset successfully.');
      setNewPassword('');
      setConfirmNewPassword('');
      setResetCode('');
      showToast('Password reset successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link or code may be expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    setVerificationRequired(false);
    setVerificationSuccess(false);
    setVerificationCode('');
    setError(null);
    setResetSuccessMessage(null);
    setResetStep('request');
    setResetEmailSent(false);
    setNewPassword('');
    setConfirmNewPassword('');
    setResetCode('');
    setAuthModalTab('login');
    if (verificationEmail) {
      setEmail(verificationEmail);
    } else if (resetEmail) {
      setEmail(resetEmail);
    }
  };

  const handleClose = () => {
    resetAuthFormState();
    closeAuthModal();
  };

  return (
    <div
      id="auth-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in"
    >
      <div
        id="auth-modal-dialog"
        className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden transition-colors"
      >
        {/* Header pattern */}
        <div className="bg-gradient-to-br from-amber-600 to-orange-700 p-6 text-white text-center relative">
          <button
            id="auth-modal-close-btn"
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-xs border border-white/20">
            {isForgotPassword ? (
              <KeyRound className="w-6 h-6 text-amber-200" />
            ) : (
              <Utensils className="w-6 h-6 text-amber-200" />
            )}
          </div>
          <h2 className="text-2xl font-bold font-heading">
            {isForgotPassword
              ? resetStep === 'success'
                ? 'Password Reset'
                : 'Forgot your password?'
              : isLogin
              ? 'Welcome Back Chef'
              : 'Join the ChefFork Table'}
          </h2>
          <p className="text-amber-100 text-sm mt-1">
            {isForgotPassword
              ? resetStep === 'success'
                ? 'Your password has been updated'
                : "Enter your registered email address and we'll send you instructions to reset your password."
              : isLogin
              ? 'Log into your kitchen to fork, share, and connect'
              : 'Fork recipes, share your variations, and build community'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-stone-200 dark:border-stone-800">
          <button
            id="auth-tab-login"
            type="button"
            onClick={() => {
              setAuthModalTab('login');
              setError(null);
              setVerificationRequired(false);
            }}
            className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors cursor-pointer ${
              isLogin
                ? 'border-orange-600 text-orange-600 dark:text-orange-500'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            Log In
          </button>
          <button
            id="auth-tab-signup"
            type="button"
            onClick={() => {
              setAuthModalTab('signup');
              setError(null);
              setVerificationRequired(false);
            }}
            className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors cursor-pointer ${
              isSignup
                ? 'border-orange-600 text-orange-600 dark:text-orange-500'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            Create Account
          </button>
          {isForgotPassword && (
            <button
              id="auth-tab-forgot"
              type="button"
              className="flex-1 py-3 text-sm font-semibold text-center border-b-2 border-orange-600 text-orange-600 dark:text-orange-500 cursor-pointer"
            >
              Reset Password
            </button>
          )}
        </div>

        {/* Form body */}
        <div className="p-6">
          {error && (
            <div
              id="auth-error-banner"
              className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {resetSuccessMessage && (
            <div
              id="auth-success-banner"
              className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <span>{resetSuccessMessage}</span>
            </div>
          )}

          {/* FORGOT PASSWORD VIEW */}
          {isForgotPassword ? (
            resetStep === 'success' ? (
              <div className="space-y-4 text-center py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Password reset successfully.
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  You can now log in with your new password.
                </p>
                <button
                  type="button"
                  id="forgot-password-success-login-btn"
                  onClick={handleGoToLogin}
                  className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm transition-all cursor-pointer shadow-sm hover:shadow"
                >
                  Go to Login
                </button>
              </div>
            ) : resetStep === 'enter-code' ? (
              /* Step 2: Enter code & new password */
              <form onSubmit={handleResetPasswordWithCode} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Email Address
                  </label>
                  <input
                    id="reset-code-email-input"
                    type="email"
                    required
                    placeholder="Enter your email address"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Reset Code (from email)
                  </label>
                  <input
                    id="reset-code-input"
                    type="text"
                    required
                    placeholder="Enter 6-digit reset code"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.trim())}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    New Password
                  </label>
                  <PasswordInput
                    id="reset-new-password-input"
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
                    id="reset-confirm-new-password-input"
                    required
                    placeholder="Confirm your new password"
                    value={confirmNewPassword}
                    autoComplete="new-password"
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                </div>

                <button
                  id="reset-password-modal-submit-btn"
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

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setResetStep('request')}
                    className="text-xs font-semibold text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 cursor-pointer"
                  >
                    Resend Email
                  </button>
                  <button
                    type="button"
                    onClick={handleGoToLogin}
                    className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 cursor-pointer"
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            ) : (
              /* Step 1: Enter email to request reset */
              <form onSubmit={handleSendResetEmail} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Email Address
                  </label>
                  <input
                    id="forgot-password-email-input"
                    type="email"
                    required
                    placeholder="Enter your email address"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all placeholder:text-stone-400 dark:placeholder:text-stone-500"
                  />
                </div>

                <button
                  id="forgot-password-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm shadow-md hover:shadow transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Send Reset Email</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {resetEmailSent && (
                  <div className="pt-2">
                    <button
                      type="button"
                      id="forgot-password-enter-code-btn"
                      onClick={() => setResetStep('enter-code')}
                      className="w-full py-2.5 px-4 rounded-xl border border-orange-200 dark:border-orange-800/60 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 hover:bg-orange-100 font-semibold text-xs transition-all cursor-pointer text-center"
                    >
                      Already have your reset code? Reset Password
                    </button>
                  </div>
                )}

                <div className="text-center pt-2">
                  <button
                    type="button"
                    id="forgot-password-back-to-login-btn"
                    onClick={handleGoToLogin}
                    className="text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 cursor-pointer"
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            )
          ) : verificationRequired ? (
            /* EMAIL VERIFICATION NOTICE */
            <div id="auth-verification-notice" className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-heading">
                  {verificationSuccess ? 'Email verified successfully' : 'Verify Your Email'}
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed max-w-sm mx-auto">
                  {verificationSuccess ? (
                    'Your email has been verified. You can now log in to your kitchen.'
                  ) : (
                    <>
                      We sent a 6-digit verification code to{' '}
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        {verificationEmail}
                      </span>
                      . Enter the code below to verify your account.
                    </>
                  )}
                </p>
              </div>
              {verificationSuccess ? (
                <button
                  type="button"
                  id="auth-go-to-login-btn"
                  onClick={handleGoToLogin}
                  className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm transition-all cursor-pointer shadow-sm hover:shadow"
                >
                  Go to Log In
                </button>
              ) : (
                <form onSubmit={handleVerifyEmail} className="space-y-3">
                  <input
                    id="auth-verification-code-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    autoComplete="one-time-code"
                    placeholder="6-digit code"
                    aria-label="6-digit verification code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-center text-lg tracking-[0.35em] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="submit"
                    id="auth-verify-email-btn"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm transition-all cursor-pointer shadow-sm hover:shadow disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Verify Email'}
                  </button>
                  <button
                    type="button"
                    id="auth-resend-code-btn"
                    onClick={handleResendCode}
                    disabled={resendLoading || resendCooldown > 0}
                    className="w-full py-2.5 px-4 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 font-semibold text-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {resendLoading
                      ? 'Sending...'
                      : resendCooldown > 0
                      ? `Resend Code (${resendCooldown}s)`
                      : 'Resend Code'}
                  </button>
                  <button
                    type="button"
                    id="auth-back-to-login-btn"
                    onClick={handleGoToLogin}
                    className="text-sm font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 cursor-pointer"
                  >
                    Back to Log In
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* LOGIN & SIGNUP FORMS */
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Full Name
                    </label>
                    <input
                      id="signup-name-input"
                      type="text"
                      required
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all placeholder:text-stone-400 dark:placeholder:text-stone-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Username
                    </label>
                    <input
                      id="signup-username-input"
                      type="text"
                      required
                      placeholder="Username"
                      value={username}
                      onChange={(e) =>
                        setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all placeholder:text-stone-400 dark:placeholder:text-stone-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {isLogin ? 'Email Address or Username' : 'Email Address'}
                </label>
                <input
                  id="auth-email-input"
                  type={isLogin ? 'text' : 'email'}
                  required
                  placeholder={isLogin ? 'Email address or username' : 'Enter your email address'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all placeholder:text-stone-400 dark:placeholder:text-stone-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Password
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      id="auth-forgot-password-link"
                      onClick={() => {
                        setError(null);
                        setResetSuccessMessage(null);
                        setResetEmail(email.includes('@') ? email : '');
                        setResetStep('request');
                        setAuthModalTab('forgot-password');
                      }}
                      className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <PasswordInput
                  id="auth-password-input"
                  required
                  placeholder={
                    isLogin ? 'Enter your password' : 'Enter a password (at least 6 characters)'
                  }
                  value={password}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Confirm Password
                  </label>
                  <PasswordInput
                    id="signup-confirm-password-input"
                    required
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    autoComplete="new-password"
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              )}

              <button
                id="auth-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-semibold text-sm shadow-md hover:shadow transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isLogin ? 'Log In to Kitchen' : 'Create Chef Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
