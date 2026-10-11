// File: DTECHNURSE-SITE-main/app/signup/page.tsx
import { AuthForm } from '@/components/auth-form';
export const metadata = { title: 'Create account' };
export default function SignupPage() { return <main className="auth-page"><section className="auth-card"><img src="/dtechnurse-logo.jpg" alt="DTECHNURSE logo" /><span className="eyebrow">JOIN DTECHNURSE</span><h1>Create your account</h1><p>Set up your account to get started.</p><AuthForm mode="signup" /></section></main>; }
