// Shared types and helpers for the DTECHNURSE STORE services layer.
// This module must stay dependency-free so client components can import it.

export type StoreSettings = {
  name: string;
  defaultCurrency: string;
  homepageSectionEnabled: boolean;
  initialLoadCount: number;
  whatsappChatEnabled: boolean;
  whatsappNumber: string;
  disputeWindowHours: number;
  lowStockDefaultThreshold: number;
  moderatorCanDelete: boolean;
  reviewsAutoApprove: boolean;
  loyaltyPointsPerOrder: number;
  cacheEnabled: boolean;
  regionShippingEnabled: boolean;
  freeShippingRequiresAllItems: boolean;
  referralRewardAmountKobo: number;
  referralRewardType: string;
  orderAutoFinishDays: number;
  orderNumberPrefix: string;
  stockReservationEnabled: boolean;
  stockHoldMinutes: number;
  refundMethod: string;
  whatsappOrderNotificationsEnabled: boolean;
  whatsappApiToken: string;
  whatsappPhoneNumberId: string;
};

export type CategorySummary = {
  id: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
};

export type AttributeValueOption = {
  id: string;
  value: string;
  label: string;
  swatchColor: string | null;
  sortOrder: number;
};

export type CategoryAttribute = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  inputType: 'select' | 'text';
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
  values: AttributeValueOption[];
};

export type DealInfo = {
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  priceKobo: number;
  endsAt: string | null;
};

export type ListingSummary = {
  id: string;
  slug: string;
  title: string;
  priceKobo: number;
  compareAtPriceKobo: number | null;
  currency: string;
  listingType: 'single' | 'bundle';
  isFreeShipping: boolean;
  trackStock: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  isDigital: boolean;
  isFeatured: boolean;
  primaryImageUrl: string;
  ratingAverage: number;
  ratingCount: number;
  activeDeal: DealInfo | null;
  categoryName: string;
  categorySlug: string;
};

export type ListingAttributeOption = { valueId: string; value: string; label: string; swatchColor: string | null };

export type ListingAttributeChoice = {
  attributeId: string;
  name: string;
  slug: string;
  isRequired: boolean;
  options: ListingAttributeOption[];
};

export type BundleComponent = {
  bundleItemId: string;
  quantity: number;
  product: ListingSummary;
  attributes: ListingAttributeChoice[];
};

export type ListingReview = {
  id: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  authorName: string;
};

export type ListingImage = { id: string; url: string; alt: string; isPrimary: boolean };

export type ListingDetail = ListingSummary & {
  description: string;
  images: ListingImage[];
  attributes: ListingAttributeChoice[];
  bundleItems: BundleComponent[];
  related: ListingSummary[];
  reviews: ListingReview[];
};

export type CartLine = {
  id: string;
  listingId: string;
  slug: string;
  title: string;
  listingType: 'single' | 'bundle';
  quantity: number;
  unitPriceKobo: number;
  lineTotalKobo: number;
  selectedAttributes: Record<string, string>;
  imageUrl: string;
  isFreeShipping: boolean;
  isDigital: boolean;
  trackStock: boolean;
  stockQuantity: number;
};

export type CartTotals = {
  subtotalKobo: number;
  discountKobo: number;
  couponCode: string | null;
  itemCount: number;
};

export type CartState = {
  cartId: string;
  lines: CartLine[];
  totals: CartTotals;
};

export type ShippingQuote = {
  zoneId: string;
  zoneName: string;
  locationId: string | null;
  stateName: string;
  feeKobo: number;
  allItemsFreeShipping: boolean;
  digitalOnly: boolean;
};

export type AddressRecord = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  localGovernment: string;
  state: string;
  country: string;
  isDefault: boolean;
};

export type AddressInput = Omit<AddressRecord, 'id' | 'isDefault'>;

export type OrderSummary = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalKobo: number;
  currency: string;
  createdAt: string;
  itemCount: number;
  paymentProvider: string | null;
  containsDigital: boolean;
};

export type OrderItemRecord = {
  id: string;
  listingId: string | null;
  slug: string;
  title: string;
  listingType: 'single' | 'bundle';
  quantity: number;
  unitPriceKobo: number;
  totalPriceKobo: number;
  selectedAttributes: Record<string, string>;
  imageUrl: string;
  isDigital: boolean;
  downloadable: boolean;
  reviewed: boolean;
};

export type OrderEvent = {
  id: string;
  status: OrderStatus;
  note: string;
  createdAt: string;
};

export type OrderRefund = { amountKobo: number; provider: string; reference: string; note: string; createdAt: string };

export type OrderDispute = { id: string; disputeType: string; reason: string; status: string };

export type OrderDetail = OrderSummary & {
  subtotalKobo: number;
  discountKobo: number;
  couponCode: string | null;
  shippingFeeKobo: number;
  shippingZoneName: string | null;
  shippingStateName: string | null;
  shippingAddress: string;
  disputeWindowHours: number;
  paidAt: string | null;
  shippedAt: string | null;
  finishedAt: string | null;
  items: OrderItemRecord[];
  history: OrderEvent[];
  dispute: OrderDispute | null;
  refunds: OrderRefund[];
};

export type WishlistItem = {
  id: string;
  addedAt: string;
  listing: ListingSummary;
};

export type LoyaltyTransactionRecord = {
  points: number;
  transactionType: string;
  description: string;
  createdAt: string;
};

export type ReferralRecord = {
  refereeEmail: string;
  status: string;
  rewardAmountKobo: number;
  createdAt: string;
};

export type GiftCardRecord = {
  code: string;
  initialAmountKobo: number;
  balanceKobo: number;
  status: string;
  expiresAt: string | null;
};

export type RewardsOverview = {
  pointsBalance: number;
  lifetimePoints: number;
  loyaltyTransactions: LoyaltyTransactionRecord[];
  referralCode: string;
  referralRewardAmountKobo: number;
  referralRewardType: string;
  referrals: ReferralRecord[];
  giftCards: GiftCardRecord[];
};

export type NotificationRecord = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export const ORDER_STATUS_VALUES = ['pending_payment', 'paid', 'shipped', 'finished', 'disputed', 'refunded', 'exchanged', 'cancelled'] as const;

export type OrderStatus = typeof ORDER_STATUS_VALUES[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Pending payment',
  paid: 'Paid',
  shipped: 'Shipped',
  finished: 'Finished',
  disputed: 'In dispute',
  refunded: 'Refunded',
  exchanged: 'Exchanged',
  cancelled: 'Cancelled',
};

const nairaFormatter = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' });

export function formatNaira(kobo: number): string {
  return nairaFormatter.format((Number(kobo) || 0) / 100);
}

export function parseSelectedAttributes(json: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof key === 'string' && key.trim() && typeof value === 'string') result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

function displayAttributeKey(key: string): string {
  return key
    .trim()
    .replace(/(^|[-_]+)([a-z])/g, (_match, separator: string, letter: string) => (separator ? ' ' : '') + letter.toUpperCase());
}

export function formatSelectedAttributes(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .filter(([, value]) => typeof value === 'string' && value.trim())
    .map(([key, value]) => `${displayAttributeKey(key)}: ${value.trim()}`)
    .join(' \u00b7 ');
}
