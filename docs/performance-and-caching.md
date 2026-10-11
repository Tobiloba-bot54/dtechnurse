<!-- File: DTECHNURSE-SITE-main/docs/performance-and-caching.md -->
# Performance and caching notes

## Public article listing

`GET /api/articles` returns only published article summaries and sends a short public cache lifetime with stale-while-revalidate and stale-if-error directives. The response is public content only. The normal API response may remain stale for up to the configured freshness window after a publish or edit.

## Protected routes

Admin article and media endpoints must continue to use `Cache-Control: no-store`. They depend on the signed-in administrator and must not be stored in a shared cache. Contact submissions and other write endpoints must also remain uncached.

## Reduced database work

- The article editor loads the media library only when the administrator requests it or opens the featured-image selector.
- Saving an article updates the visible article list from the successful save response instead of issuing another list query.
- Opening an article no longer reads the revision history because the current editor does not display it. Revision rows are retained and still written when an article is saved.
- Article creation and updates use D1 `batch()` when the configured database adapter exposes it, grouping related writes. The sequential fallback preserves compatibility with adapters that do not expose `batch()`.

## Worker invocation caveat

HTTP cache headers can reduce repeat transfers and may enable caching in a compatible hosting layer, but headers alone do not guarantee that a Cloudflare Worker invocation is skipped. Invocation reduction depends on the deployed Next.js adapter, route caching support, and Cloudflare cache configuration. Verify this with the actual deployment and request metrics before estimating savings. Do not enable shared caching for protected admin routes.

## Phase One completion cache rules

- Public article listing and editable public pages use a 60-second revalidation window with shared-cache `s-maxage`, stale-while-revalidate, and stale-if-error directives. The homepage, blog page, and article detail page use Next.js ISR with a 60-second revalidation window. The sitemap revalidates hourly.
- Admin and analytics endpoints always send `Cache-Control: no-store`. Never place user-specific or admin responses in a shared cache.
- Article view tracking is sent once per article per browser session per UTC day using `sessionStorage`. Analytics is approximate and should not be treated as billing or audit data.
- A hosting adapter or CDN must be configured to honor Next.js ISR and shared-cache directives for actual invocation reduction. Validate cache hit rates and Worker invocation counts after deployment. These headers alone do not guarantee that a Worker invocation is skipped.

## Additional deployment and security checklist

- The application sends baseline security headers including content-type sniffing protection, same-origin frame protection, a strict referrer policy, a restrictive permissions policy, and HSTS. Confirm HTTPS and all subdomains are ready before production deployment.
- Set `APP_BASE_URL` to the canonical HTTPS domain. Newsletter campaign messages include a per-subscriber unsubscribe link; apply migration 0008 before using this feature.
- Apply migrations 0001 through 0008 in numerical order. Keep `CRON_SECRET` secret and configure the scheduled publishing endpoint in the hosting scheduler.
- Use the platform's rate limiting or WAF for public form and analytics endpoints. Public article view counts are approximate and are not protected against sophisticated automated traffic.
- Configure automated database backups, test restoration, monitor errors and uptime, and review Supabase row-level security and administrator provisioning before launch.
