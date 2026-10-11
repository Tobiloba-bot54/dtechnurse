// File: DTECHNURSE-SITE-main/app/reset-password/page.tsx
import { ResetPasswordForm } from '@/components/reset-password-form';
export const metadata = { title: 'Reset password' };
export default function ResetPasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <img src="/dtechnurse-logo.jpg" alt="DTECHNURSE logo" />
        <span className="eyebrow">RESET PASSWORD</span>
        <h1>Set a new password</h1>
        <p>Choose a new password for your account.</p>
        <ResetPasswordForm />
      </section>
    </main>
  );
}
