// File: DTECHNURSE-SITE-main/app/manifest.ts
import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest { return { name: 'DTECHNURSE', short_name: 'DTECHNURSE', description: 'Health, technology and impact.', start_url: '/', display: 'standalone', background_color: '#ffffff', theme_color: '#082d63', icons: [{ src: '/dtechnurse-logo.jpg', sizes: 'any', type: 'image/jpeg', purpose: 'any' }] }; }
