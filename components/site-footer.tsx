// File: DTECHNURSE-SITE-main/components/site-footer.tsx
import Link from 'next/link';

const EXPLORE_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

const ACCOUNT_LINKS = [
  { href: '/login', label: 'Log in' },
  { href: '/signup', label: 'Create account' },
  { href: '/privacy', label: 'Privacy policy' },
];

const SOCIAL_LINKS = [
  {
    label: 'Twitter',
    href: 'https://twitter.com/dtechnurse',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 5.92c-.67.3-1.39.5-2.14.59a3.73 3.73 0 0 0 1.64-2.06 7.46 7.46 0 0 1-2.37.9 3.72 3.72 0 0 0-6.34 3.39A10.56 10.56 0 0 1 5.1 4.9a3.72 3.72 0 0 0 1.15 4.97 3.7 3.7 0 0 1-1.69-.46v.05a3.72 3.72 0 0 0 2.99 3.65 3.7 3.7 0 0 1-1.68.06 3.73 3.73 0 0 0 3.48 2.59A7.47 7.47 0 0 1 2 17.17a10.53 10.53 0 0 0 5.71 1.67c6.85 0 10.6-5.68 10.6-10.6l-.01-.48A7.6 7.6 0 0 0 22 5.92Z" /></svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/dtechnurse',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.84v1.64h.05c.54-.98 1.84-2.01 3.78-2.01C21.9 8.63 22 11.1 22 13.9V21h-4v-6.4c0-1.53-.03-3.5-2.13-3.5-2.14 0-2.47 1.67-2.47 3.39V21h-4V9Z" /></svg>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/dtechnurse',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.8h2.62l.39-3.04h-3.01V8.26c0-.88.24-1.48 1.5-1.48h1.61V4.07C15.94 4.02 15.06 4 14.02 4c-2.17 0-3.66 1.33-3.66 3.77v2.39H7.73v3.04h2.63V21h3.14Z" /></svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/dtechnurse',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c2.72 0 3.06.01 4.12.06 1.06.05 1.79.22 2.43.47a4.9 4.9 0 0 1 1.77 1.15 4.9 4.9 0 0 1 1.15 1.77c.25.64.42 1.37.47 2.43C21.99 8.94 22 9.28 22 12s-.01 3.06-.06 4.12c-.05 1.06-.22 1.79-.47 2.43a4.9 4.9 0 0 1-1.15 1.77 4.9 4.9 0 0 1-1.77 1.15c-.64.25-1.37.42-2.43.47C15.06 21.99 14.72 22 12 22s-3.06-.01-4.12-.06c-1.06-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.77-1.15 4.9 4.9 0 0 1-1.15-1.77c-.25-.64-.42-1.37-.47-2.43C2.01 15.06 2 14.72 2 12s.01-3.06.06-4.12c.05-1.06.22-1.79.47-2.43a4.9 4.9 0 0 1 1.15-1.77A4.9 4.9 0 0 1 5.45.53c.64-.25 1.37-.42 2.43-.47C8.94.01 9.28 0 12 0Zm0 1.8c-2.67 0-2.99.01-4.04.06-.97.04-1.5.21-1.85.34-.46.18-.79.39-1.14.74-.35.35-.56.68-.74 1.14-.13.35-.3.88-.34 1.85-.05 1.05-.06 1.37-.06 4.04s.01 2.99.06 4.04c.04.97.21 1.5.34 1.85.18.46.39.79.74 1.14.35.35.68.56 1.14.74.35.13.88.3 1.85.34 1.05.05 1.37.06 4.04.06s2.99-.01 4.04-.06c.97-.04 1.5-.21 1.85-.34.46-.18.79-.39 1.14-.74.35-.35.56-.68.74-1.14.13-.35.3-.88.34-1.85.05-1.05.06-1.37.06-4.04s-.01-2.99-.06-4.04c-.04-.97-.21-1.5-.34-1.85a3.1 3.1 0 0 0-.74-1.14 3.1 3.1 0 0 0-1.14-.74c-.35-.13-.88-.3-1.85-.34C14.99 1.81 14.67 1.8 12 1.8Zm0 4.42a5.78 5.78 0 1 1 0 11.56 5.78 5.78 0 0 1 0-11.56Zm0 1.8a3.98 3.98 0 1 0 0 7.96 3.98 3.98 0 0 0 0-7.96Zm6.01-1.99a1.35 1.35 0 1 1-2.7 0 1.35 1.35 0 0 1 2.7 0Z" /></svg>
    ),
  },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <strong>DTECHNURSE</strong>
          <p>Healthcare, nursing and digital health resources built for clinicians and the technology shaping their practice.</p>
          <p>Empowering nurses with the technology skills needed to revolutionize healthcare. Bridging the gap between clinical expertise and digital innovation.</p>
          <div className="footer-social" aria-label="DTECHNURSE on social media">
            {SOCIAL_LINKS.map(social => (
              <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label}>
                {social.icon}
              </a>
            ))}
          </div>
        </div>

        <div className="footer-col">
          <span className="footer-col-title">Explore</span>
          <nav aria-label="Explore DTECHNURSE">
            {EXPLORE_LINKS.map(link => (
              <Link key={link.href} href={link.href}>{link.label}</Link>
            ))}
          </nav>
        </div>

        <div className="footer-col">
          <span className="footer-col-title">Account</span>
          <nav aria-label="Account">
            {ACCOUNT_LINKS.map(link => (
              <Link key={link.href} href={link.href}>{link.label}</Link>
            ))}
          </nav>
        </div>

        <div className="footer-col">
          <span className="footer-col-title">Contact</span>
          <nav aria-label="Contact DTECHNURSE">
            <Link href="/contact">Send a message</Link>
            <a href="mailto:hello@dtechnurse.com">hello@dtechnurse.com</a>
          </nav>
        </div>
      </div>

      <div className="footer-bottom">
        <small>© {new Date().getFullYear()} DTECHNURSE. All rights reserved.</small>
        <span className="footer-tag">Health. Technology. Impact.</span>
      </div>
    </footer>
  );
}
