// File: DTECHNURSE-SITE-main/components/site-footer.tsx
import Link from 'next/link';
export function SiteFooter() { return <footer className="site-footer"><div><strong>DTECHNURSE</strong><p>Health, technology and impact.</p></div><div className="footer-links"><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link></div><small>© {new Date().getFullYear()} DTECHNURSE. All rights reserved.</small></footer>; }
