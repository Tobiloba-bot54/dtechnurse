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
