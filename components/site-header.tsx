// File: DTECHNURSE-SITE-main/components/site-footer.tsx
import Link from 'next/link';
import { getSocialLinks, defaultSocialLinks } from '@/lib/services/site-settings';
import { SocialIcon } from './social-icon';

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
  { href: '/terms', label: 'Terms of service' },
];

export async function SiteFooter() {
  let socialLinks = defaultSocialLinks;
  try {
    socialLinks = await getSocialLinks();
  } catch {
    // Database unavailable at render time — fall back to the shipped defaults
    // so the footer still renders.
  }
  const visibleSocialLinks = socialLinks.filter(link => link.enabled);

  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <strong>DTECHNURSE</strong>
          <p>Empowering nurses with the technology skills needed to revolutionize healthcare. Bridging the gap between clinical expertise and digital innovation.</p>
          {visibleSocialLinks.length > 0 && (
            <div className="footer-social" aria-label="DTECHNURSE on social media">
              {visibleSocialLinks.map(social => (
                <a key={social.platform} href={social.url} target="_blank" rel="noopener noreferrer" aria-label={social.platform}>
                  <SocialIcon platform={social.platform} />
                </a>
              ))}
            </div>
          )}
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
