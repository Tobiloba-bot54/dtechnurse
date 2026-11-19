# DTECHNURSE STORE Build Package (2026-11-19)

Complete version 1.0 BUILD of the DTECHNURSE STORE e-commerce upgrade: 81 new code files + 6 modified files + the database migration + the full specification document set. Verified with `tsc --noEmit` (zero errors) and `next build` (all routes compile).

## How to merge into the main project

1. Copy every folder and file below into your repository root. Paths match your project structure exactly, so `app/`, `components/`, `lib/`, and `db/` files land in the right places.
2. Overwrite the 6 modified files (listed below). The changes are additive: store links in the header and footer, the store section on the homepage, the store management link on the admin page, the store stylesheet appended to globals.css, and the R2 binding name fix in storage.ts.
3. Apply the migration: `0010_dtechnurse_store.sql` goes in `db/migrations/` next to 0001 through 0009, then apply through your normal D1 migration flow. It is idempotent and safe to re-run.
4. Deploy. No new npm dependencies were added.

## What is in this package

| Path | What it is |
|---|---|
| db/migrations/0010_dtechnurse_store.sql | Store schema: 33 tables, 35 indexes, seeds (14 categories, 6 shipping zones, 37 states, 2 payment gateways, 1 Resend email config, 24 store settings) |
| lib/services/store/ (9 files) | Services: types, settings, catalog, shipping, cart, orders, promotions, engagement, emails |
| lib/server/store-auth.ts | Admin and moderator guards for store management |
| app/api/store/ (18 routes) | Buyer APIs: catalog, listing, search, cart, coupons, gift cards, shipping states and quotes, checkout, verify, orders, actions, wishlist, addresses, rewards, notifications, digital downloads |
| app/api/admin/store/ (12 routes) | Admin APIs: listings, orders, refunds, shipping fees, catalog config, promotions, gift cards, moderation, settings, analytics, inventory |
| app/store/ | Storefront: browse, category pages, listing detail, search, policies |
| app/cart, app/checkout, app/checkout/success | Cart and checkout with address capture, state based shipping fee, payment choice, gift cards |
| app/orders, app/orders/[id] | Order history, detail with status timeline, disputes, reviews, digital downloads |
| app/wishlist, app/account/addresses, app/account/rewards | Wishlist, saved addresses, loyalty points, referrals, gift cards |
| app/admin/store | Store management dashboard (9 tabs) |
| components/store/ (16) | Listing cards, browser, filters, search, gallery, add to cart, cart view, checkout view, order actions, wishlist, recently viewed, WhatsApp chat, and more |
| components/admin/store/ (10) | Listings manager (with stock, free shipping, bundles, images, attributes), orders manager (with manual refunds), shipping fees manager, promotions, gift cards, moderation, categories, settings, analytics |
| docs/ (8 docx) | Full specification set: requirements v0.2, categories memo, shipping fees, gap review, adoption addendum, Phase 2 candidates, UI/UX design, QA verification |
| DTECHNURSE_Store_Build_Delivery_BusinessProfessional_2026-11-19.docx | Build delivery note: what was built and how to configure it |

## Modified files (overwrite these 6)

| File | Change |
|---|---|
| components/site-header.tsx | Adds Store, Cart, and My orders links |
| components/site-footer.tsx | Adds Shop column (store, orders, wishlist, policies) |
| app/page.tsx | Adds the homepage store section: category grid + featured products, gated by the store_homepage_section_enabled setting |
| app/admin/page.tsx | Adds the Open store management button |
| app/globals.css | Appends the complete store stylesheet (all storefront and admin store classes) |
| lib/server/storage.ts | Accepts the MEDIA_BUCKET R2 binding name from wrangler.toml (keeps MEDIA for older deployments) |

## First steps after merging

1. Apply migration 0010, then sign in as admin.
2. Go to Admin, open Store management.
3. Shipping tab: set the 6 zone fees and any per-state fees. A state fee overrides its zone fee. Leave a state empty to use the zone fee. The company dispatches from South West (Ogun and Ibadan).
4. Settings tab: configure Paystack and Flutterwave keys (test or live mode) and the Resend email service, exactly like the payment gateway pattern.
5. Listings tab: create listings with images, stock quantities, low stock thresholds, free shipping toggles, attributes, and bundles.
6. Promotions tab: coupons and flash deals when ready.

## Key behaviours as specified

- Shipping fee: state location fee overrides the zone fee. Unset states fall back to the zone fee. Free shipping when all items are flagged free shipping (or any item when the setting is changed). Digital-only orders charge no shipping.
- Checkout: buyer enters full name, phone, street, city, local government, and state. The state drives the fee. The address is saved in the browser and autofills the next order, and the buyer can change it.
- Payments: Paystack and Flutterwave. Verification runs on the success page redirect and finalizes the order.
- Manual refunds: the admin refunds inside the Paystack or Flutterwave merchant account, then records it in Store management, Orders. Full refunds mark the order refunded and can resolve a dispute.
- Stock: reserved when an order is placed, restocked on cancellation. Low stock shows in Analytics.
- Reviews: one per buyer per listing, after a paid order. Moderation queue unless auto-approve is on.
- Loyalty, referrals, gift cards: reward amounts set in settings. Referral reward snapshots per referral.
- Emails: order confirmation, shipped, and refund emails via Resend. Test mode skips sending. The WhatsApp order notification API slot exists but is off.
- Tax and VAT: excluded entirely, by decision.

## Notes

- Digital downloads redirect through your R2 public base URL (R2_PUBLIC_BASE_URL or the MEDIA_PUBLIC_URL binding), so the bucket must be publicly readable for digital files.
- Moderator accounts use role_key 'moderator' in users_profile. Moderators manage listings, orders, reviews, and disputes. Settings, refunds, promotions, gift cards, and shipping fees are admin only. Moderator deletion of listings respects the store_moderator_can_delete setting.
- The build was verified with TypeScript strict (zero errors) and a full production build of all routes.
