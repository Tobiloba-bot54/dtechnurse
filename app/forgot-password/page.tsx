// File: DTECHNURSE-SITE-main/app/forgot-password/page.tsx
import { ForgotPasswordForm } from '@/components/forgot-password-form';
export const metadata = { title: 'Forgot password' };
export default function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <img src="/dtechnurse-logo.jpg" alt="DTECHNURSE logo" />
        <span className="eyebrow">RESET PASSWORD</span>
        <h1>Forgot your password?</h1>
        <p>Enter your email and we will send you a link to reset it.</p>
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
