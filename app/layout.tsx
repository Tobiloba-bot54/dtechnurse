// File: DTECHNURSE-SITE-main/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ServiceWorkerRegister } from '@/components/service-worker-register';
import { InstallBanner } from '@/components/install-banner';
export const metadata: Metadata = { metadataBase: new URL(process.env.APP_BASE_URL || 'http://localhost:3000'), title: { default: 'DTECHNURSE | Health, Tech, Impact', template: '%s | DTECHNURSE' }, description: 'Healthcare, nursing, digital health and technology resources from DTECHNURSE.', applicationName: 'DTECHNURSE', icons: { icon: '/dtechnurse-logo.jpg', apple: '/dtechnurse-logo.jpg' }, openGraph: { type: 'website', siteName: 'DTECHNURSE', title: 'DTECHNURSE | Health, Tech, Impact', description: 'Healthcare, nursing, digital health and technology resources.' } };
export const viewport: Viewport = { themeColor: '#082d63', width: 'device-width', initialScale: 1 };
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><ServiceWorkerRegister /><InstallBanner /><SiteHeader />{children}<SiteFooter /></body></html>; }
