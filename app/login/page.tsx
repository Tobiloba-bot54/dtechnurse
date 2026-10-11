// File: DTECHNURSE-SITE-main/app/login/page.tsx
import { AuthForm } from '@/components/auth-form';
export const metadata = { title: 'Log in' };
export default function LoginPage() { return <main className="auth-page"><section className="auth-card"><img src="/dtechnurse-logo.jpg" alt="DTECHNURSE logo" /><span className="eyebrow">WELCOME BACK</span><h1>Log in to your account</h1><p>Access your DTECHNURSE account.</p><AuthForm mode="login" /></section></main>; }
