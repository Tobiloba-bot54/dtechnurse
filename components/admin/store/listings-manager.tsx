// File: DTECHNURSE-SITE-main/components/admin/store/listings-manager.tsx
'use client';
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, Star, X } from 'lucide-react';
import { apiRequest } from '@/lib/services/http';
import { formatNaira, type CategoryAttribute, type CategorySummary, type ListingSummary } from '@/lib/services/store/types';

type AdminListingRow = ListingSummary & { status: string; createdAt: string; updatedAt: string; categoryId: string | null };
type ListingsResponse = { listings: AdminListingRow[]; total: number; page: number; pages: number };
type StoreConfig = { categories: CategorySummary[]; attributes: CategoryAttribute[] };
type AdminListingImage = { id: string; objectKey: string; url?: string; alt: string; sortOrder: number; isPrimary: boolean };
type AdminListingDetail = {
  id: string;
  listingType: 'single' | 'bundle';
  slug: string;
  title: string;
  description: string;
  categoryId: string | null;
  priceKobo: number;
  compareAtPriceKobo: number | null;
  currency: string;
  status: string;
  isFeatured: boolean;
  isFreeShipping: boolean;
  trackStock: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  isDigital: boolean;
  digitalFileKey: string | null;
  digitalDownloadLimit: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  images: AdminListingImage[];
  attributeOptions: Array<{ attributeId: string; valueId: string }>;
  bundleItems: Array<{ bundleItemId: string; productId: string; quantity: number; attributeValueIds: string[]; title?: string }>;
  relatedIds: string[];
};
type PickerProduct = { id: string; title: string; priceKobo: number };
type EditorImage = { objectKey: string; previewUrl: string; alt: string; isPrimary: boolean };
type BundleDraft = { productId: string; title: string; quantity: number; attributeValueIds: string[] };
type RelatedDraft = { id: string; title: string };
type ListingDraft = {
  title: string;
  listingType: 'single' | 'bundle';
  categoryId: string;
  status: string;
  isFeatured: boolean;
  description: string;
  price: string;
  compareAt: string;
  isFreeShipping: boolean;
  trackStock: boolean;
  stockQuantity: string;
  lowStockThreshold: string;
  isDigital: boolean;
  digitalFileKey: string;
  digitalDownloadLimit: string;
  images: EditorImage[];
  attributeOptions: Array<{ attributeId: string; valueId: string }>;
  bundleItems: BundleDraft[];
  related: RelatedDraft[];
};

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

const LISTING_STATUSES: Array<{ value: string; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

function toKobo(naira: number): number { return Math.round(naira * 100); }
function fromKobo(kobo: number): number { return (Number(kobo) || 0) / 100; }
function toNairaInput(kobo: number): string { return String(fromKobo(kobo)); }
function statusLabel(status: string): string { return LISTING_STATUSES.find(entry => entry.value === status)?.label ?? status; }
function previewSource(objectKey: string, url?: string): string { return url || (objectKey.startsWith('http') ? objectKey : ''); }

const emptyDraft: ListingDraft = {
  title: '', listingType: 'single', categoryId: '', status: 'draft', isFeatured: false, description: '',
  price: '', compareAt: '', isFreeShipping: false, trackStock: true, stockQuantity: '0', lowStockThreshold: '5',
  isDigital: false, digitalFileKey: '', digitalDownloadLimit: '5',
  images: [], attributeOptions: [], bundleItems: [], related: [],
};

async function searchProducts(q: string): Promise<PickerProduct[]> {
  if (!q.trim()) return [];
  const data = await apiRequest<{ listings?: unknown[]; items?: unknown[] }>(`/api/store/catalog?q=${encodeURIComponent(q.trim())}`);
  const rows = (Array.isArray(data.listings) ? data.listings : Array.isArray(data.items) ? data.items : []) as Array<Record<string, unknown>>;
  return rows
    .map(row => ({
      id: typeof row.id === 'string' ? row.id : typeof row.listingId === 'string' ? row.listingId : '',
      title: typeof row.title === 'string' ? row.title : '',
      priceKobo: typeof row.priceKobo === 'number' ? row.priceKobo : 0,
    }))
    .filter(row => row.id && row.title);
}

async function lookupListingTitle(id: string): Promise<string> {
  try {
    const data = await apiRequest<{ listing?: { title?: string } }>(`/api/admin/store/listings/${id}`);
    return data.listing?.title ?? '';
  } catch { return ''; }
}

function ProductPicker({ onPick, excludeIds, pickerLabel }: { onPick: (product: PickerProduct) => void; excludeIds: string[]; pickerLabel: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickerProduct[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  async function run() {
    setBusy(true); setError(''); setSearched(true);
    try { setResults(await searchProducts(query)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Product search failed.'); setResults([]); }
    finally { setBusy(false); }
  }
  return (
    <div>
      <form className="form-row" onSubmit={(event: FormEvent) => { event.preventDefault(); void run(); }}>
        <input className="form-control" placeholder={`Search products to add ${pickerLabel}`} value={query} onChange={e => setQuery(e.target.value)} aria-label={`Product search for ${pickerLabel}`} />
        <button className="button secondary small" type="submit" disabled={busy}>{busy ? 'Searching…' : 'Find products'}</button>
      </form>
      {error && <p className="danger-text">{error}</p>}
      {results.filter(product => !excludeIds.includes(product.id)).length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Product</th><th>Price</th><th>Action</th></tr></thead>
            <tbody>
              {results.filter(product => !excludeIds.includes(product.id)).map(product => (
                <tr key={product.id}>
                  <td>{product.title}</td>
                  <td className="money">{formatNaira(product.priceKobo)}</td>
                  <td><button type="button" className="button secondary small" onClick={() => onPick(product)}>Add</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {searched && !busy && results.filter(product => !excludeIds.includes(product.id)).length === 0 && !error && <p className="muted-text">No matching products.</p>}
    </div>
  );
}

export function ListingsManager() {
  const [listings, setListings] = useState<AdminListingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [attributes, setAttributes] = useState<CategoryAttribute[]>([]);
  const [configError, setConfigError] = useState('');

  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingId, setEditingId] = useState('');
  const [editingSlug, setEditingSlug] = useState('');
  const [draft, setDraft] = useState<ListingDraft>(emptyDraft);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [editorMessage, setEditorMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (appliedQuery.trim()) params.set('q', appliedQuery.trim());
      params.set('page', String(page));
      const data = await apiRequest<ListingsResponse>(`/api/admin/store/listings?${params.toString()}`);
      setListings(data.listings ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Listings could not be loaded.');
    } finally { setLoading(false); }
  }, [statusFilter, appliedQuery, page]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    apiRequest<StoreConfig>('/api/admin/store/config')
      .then(data => { setCategories(data.categories ?? []); setAttributes(data.attributes ?? []); })
      .catch(() => setConfigError('Category and option configuration could not be loaded.'));
  }, []);

  function update<K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) { setDraft(current => ({ ...current, [key]: value })); }

  function startCreate() {
    setMode('create'); setEditingId(''); setEditingSlug(''); setDraft(emptyDraft); setEditorError(''); setEditorMessage(''); setEditorLoading(false);
  }

  function backToList() {
    setMode('list'); setEditingId(''); setDraft(emptyDraft); setEditorError(''); setEditorMessage('');
  }

  async function openEdit(id: string) {
    setMode('edit'); setEditingId(id); setEditorLoading(true); setEditorError(''); setEditorMessage(''); setEditingSlug('');
    try {
      const data = await apiRequest<{ listing: AdminListingDetail }>(`/api/admin/store/listings/${id}`);
      const listing = data.listing;
      const bundleItems = await Promise.all((listing.bundleItems ?? []).map(async item => ({
        productId: item.productId,
        title: item.title || await lookupListingTitle(item.productId),
        quantity: Math.max(1, Math.floor(item.quantity || 1)),
        attributeValueIds: item.attributeValueIds ?? [],
      })));
      const related = await Promise.all((listing.relatedIds ?? []).map(async relatedId => ({ id: relatedId, title: await lookupListingTitle(relatedId) })));
      setEditingSlug(listing.slug);
      setDraft({
        title: listing.title,
        listingType: listing.listingType === 'bundle' ? 'bundle' : 'single',
        categoryId: listing.categoryId ?? '',
        status: listing.status,
        isFeatured: listing.isFeatured,
        description: listing.description ?? '',
        price: toNairaInput(listing.priceKobo),
        compareAt: listing.compareAtPriceKobo === null || listing.compareAtPriceKobo === undefined ? '' : toNairaInput(listing.compareAtPriceKobo),
        isFreeShipping: listing.isFreeShipping,
        trackStock: listing.trackStock,
        stockQuantity: String(Math.max(0, Math.floor(listing.stockQuantity || 0))),
        lowStockThreshold: String(Math.max(0, Math.floor(listing.lowStockThreshold || 0))),
        isDigital: listing.isDigital,
        digitalFileKey: listing.digitalFileKey ?? '',
        digitalDownloadLimit: String(Math.max(0, Math.floor(listing.digitalDownloadLimit ?? 5))),
        images: (listing.images ?? []).map(image => ({ objectKey: image.objectKey, previewUrl: previewSource(image.objectKey, image.url), alt: image.alt, isPrimary: image.isPrimary })),
        attributeOptions: listing.attributeOptions ?? [],
        bundleItems,
        related,
      });
    } catch (e) {
      setEditorError(e instanceof Error ? e.message : 'The listing could not be loaded.');
    } finally { setEditorLoading(false); }
  }

  function changeCategory(nextCategoryId: string) {
    setDraft(current => {
      const allowed = new Set(attributes.filter(attribute => attribute.categoryId === nextCategoryId).map(attribute => attribute.id));
      return { ...current, categoryId: nextCategoryId, attributeOptions: current.attributeOptions.filter(option => allowed.has(option.attributeId)) };
    });
  }

  function toggleAttributeValue(attributeId: string, valueId: string, checked: boolean) {
    setDraft(current => ({
      ...current,
      attributeOptions: checked
        ? [...current.attributeOptions.filter(option => !(option.attributeId === attributeId && option.valueId === valueId)), { attributeId, valueId }]
        : current.attributeOptions.filter(option => !(option.attributeId === attributeId && option.valueId === valueId)),
    }));
  }

  function setPrimaryImage(index: number) { setDraft(current => ({ ...current, images: current.images.map((image, i) => ({ ...image, isPrimary: i === index })) })); }

  function removeImage(index: number) {
    setDraft(current => {
      const images = current.images.filter((_, i) => i !== index);
      if (images.length && !images.some(image => image.isPrimary)) images[0] = { ...images[0], isPrimary: true };
      return { ...current, images };
    });
  }

  function moveImage(index: number, direction: number) {
    setDraft(current => {
      const target = index + direction;
      if (target < 0 || target >= current.images.length) return current;
      const images = [...current.images];
      const moved = images[index];
      images[index] = images[target];
      images[target] = moved;
      return { ...current, images };
    });
  }

  async function uploadImage(file: File) {
    setImageBusy(true); setEditorError(''); setEditorMessage('');
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('alt', draft.title || 'Product image');
      const response = await fetch('/api/admin/media', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Image upload failed.');
      const url: string = data.url || '';
      setDraft(current => ({ ...current, images: [...current.images, { objectKey: url, previewUrl: url, alt: data.alt || current.title || 'Product image', isPrimary: current.images.length === 0 }] }));
      setEditorMessage('Image uploaded. Save the listing to keep it.');
    } catch (e) {
      setEditorError(e instanceof Error ? e.message : 'Image upload failed.');
    } finally { setImageBusy(false); }
  }

  function addBundleProduct(product: PickerProduct) {
    setDraft(current => current.bundleItems.some(item => item.productId === product.id)
      ? current
      : { ...current, bundleItems: [...current.bundleItems, { productId: product.id, title: product.title, quantity: 1, attributeValueIds: [] }] });
  }

  function changeBundleQuantity(index: number, delta: number) {
    setDraft(current => ({ ...current, bundleItems: current.bundleItems.map((item, i) => i === index ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item) }));
  }

  function removeBundleItem(index: number) {
    setDraft(current => ({ ...current, bundleItems: current.bundleItems.filter((_, i) => i !== index) }));
  }

  function addRelated(product: PickerProduct) {
    setDraft(current => current.related.some(item => item.id === product.id)
      ? current
      : { ...current, related: [...current.related, { id: product.id, title: product.title }] });
  }

  function removeRelated(id: string) { setDraft(current => ({ ...current, related: current.related.filter(item => item.id !== id) })); }

  async function saveListing() {
    setEditorError(''); setEditorMessage('');
    if (!draft.title.trim()) { setEditorError('A product title is required.'); return; }
    if (!Number.isFinite(Number(draft.price))) { setEditorError('Enter a valid price in naira.'); return; }
    if (draft.listingType === 'bundle' && draft.bundleItems.length === 0) { setEditorError('A bundle must include at least one product.'); return; }
    setSaving(true);
    try {
      const payload = {
        listingType: draft.listingType,
        title: draft.title,
        description: draft.description,
        categoryId: draft.categoryId || null,
        priceKobo: toKobo(Number(draft.price || 0)),
        compareAtPriceKobo: draft.compareAt.trim() ? toKobo(Number(draft.compareAt)) : null,
        status: draft.status,
        isFeatured: draft.isFeatured,
        isFreeShipping: draft.isFreeShipping,
        trackStock: draft.trackStock,
        stockQuantity: Math.max(0, Math.floor(Number(draft.stockQuantity || 0))),
        lowStockThreshold: Math.max(0, Math.floor(Number(draft.lowStockThreshold || 0))),
        isDigital: draft.isDigital,
        digitalFileKey: draft.isDigital ? draft.digitalFileKey.trim() || null : null,
        digitalDownloadLimit: Math.max(0, Math.floor(Number(draft.digitalDownloadLimit || 5))),
        images: draft.images.map((image, index) => ({ objectKey: image.objectKey, alt: image.alt, sortOrder: index, isPrimary: image.isPrimary })),
        attributeOptions: draft.attributeOptions,
        bundleItems: draft.listingType === 'bundle' ? draft.bundleItems.map(item => ({ productId: item.productId, quantity: item.quantity, attributeValueIds: item.attributeValueIds })) : [],
        relatedIds: draft.related.map(item => item.id),
      };
      if (mode === 'edit' && editingId) await apiRequest(`/api/admin/store/listings/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      else await apiRequest('/api/admin/store/listings', { method: 'POST', body: JSON.stringify(payload) });
      backToList();
      setMessage(mode === 'edit' ? 'Listing updated.' : 'Listing created.');
      await load();
    } catch (e) {
      setEditorError(e instanceof Error ? e.message : 'Could not save the listing.');
    } finally { setSaving(false); }
  }

  async function removeListing(listing: AdminListingRow) {
    if (!window.confirm(`Delete "${listing.title}"? This cannot be undone.`)) return;
    setMessage(''); setError('');
    try {
      await apiRequest(`/api/admin/store/listings/${listing.id}`, { method: 'DELETE' });
      setMessage(`Deleted "${listing.title}".`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the listing.');
    }
  }

  if (mode !== 'list') {
    const categoryAttributes = attributes.filter(attribute => attribute.categoryId === draft.categoryId && attribute.isActive);
    return (
      <section className="store-admin" aria-label="Listing editor">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span className="eyebrow">{mode === 'edit' ? 'EDIT LISTING' : 'NEW LISTING'}</span>
              <h2>{mode === 'edit' ? 'Update listing' : 'Create listing'}</h2>
              {editingSlug && <p className="admin-muted">Slug: {editingSlug}</p>}
            </div>
            <div className="form-row">
              <button type="button" className="button secondary small" onClick={backToList} disabled={saving}>Back to list</button>
              <button type="button" className="button small" onClick={() => void saveListing()} disabled={saving || imageBusy || editorLoading}>{saving ? 'Saving…' : 'Save listing'}</button>
            </div>
          </div>
          {editorError && <p className="danger-text" role="alert">{editorError}</p>}
          {editorMessage && <p className="success-text" role="status">{editorMessage}</p>}
          {configError && <p className="muted-text">{configError}</p>}
          {editorLoading ? <p className="admin-muted">Loading listing…</p> : (
            <div className="admin-form-grid">
              <section className="admin-panel">
                <h3>Basics</h3>
                <label className="form-field">Title<input className="form-control" required value={draft.title} maxLength={200} onChange={e => update('title', e.target.value)} placeholder="Product title" /></label>
                <div className="form-row">
                  <label className="form-field">Listing type
                    <select className="form-control" value={draft.listingType} onChange={e => update('listingType', e.target.value === 'bundle' ? 'bundle' : 'single')}>
                      <option value="single">Single product</option>
                      <option value="bundle">Bundle</option>
                    </select>
                  </label>
                  <label className="form-field">Status
                    <select className="form-control" value={draft.status} onChange={e => update('status', e.target.value)}>
                      {LISTING_STATUSES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
                    </select>
                  </label>
                </div>
                <label className="form-field">Category
                  <select className="form-control" value={draft.categoryId} onChange={e => changeCategory(e.target.value)}>
                    <option value="">No category</option>
                    {categories.map(category => <option key={category.id} value={category.id}>{category.name}{category.isActive ? '' : ' (inactive)'}</option>)}
                  </select>
                </label>
                <label className="form-field">Description<textarea className="form-control" rows={5} value={draft.description} onChange={e => update('description', e.target.value)} placeholder="Full product description" /></label>
                <label className="admin-feature-toggle">
                  <span><strong>Featured</strong><small>Featured products are highlighted on the storefront.</small></span>
                  <input type="checkbox" checked={draft.isFeatured} onChange={e => update('isFeatured', e.target.checked)} />
                </label>
              </section>

              <section className="admin-panel">
                <h3>Pricing</h3>
                <label className="form-field">Price in naira<input className="form-control" type="number" min="0" step="any" required value={draft.price} onChange={e => update('price', e.target.value)} placeholder="0.00" /></label>
                <label className="form-field">Compare-at price in naira (optional)<input className="form-control" type="number" min="0" step="any" value={draft.compareAt} onChange={e => update('compareAt', e.target.value)} placeholder="Shown crossed out when higher" /></label>
                <p className="muted-text">Prices are stored in kobo. Enter naira values and they are converted on save.</p>
              </section>

              <section className="admin-panel">
                <h3>Shipping and stock</h3>
                <label className="admin-feature-toggle">
                  <span><strong>Free shipping</strong><small>This listing never adds a shipping fee.</small></span>
                  <input type="checkbox" checked={draft.isFreeShipping} onChange={e => update('isFreeShipping', e.target.checked)} />
                </label>
                <label className="admin-feature-toggle">
                  <span><strong>Track stock</strong><small>Stock is checked and decremented on every order.</small></span>
                  <input type="checkbox" checked={draft.trackStock} onChange={e => update('trackStock', e.target.checked)} />
                </label>
                <div className="form-row">
                  <label className="form-field">Stock quantity<input className="form-control" type="number" min="0" step="1" value={draft.stockQuantity} disabled={!draft.trackStock} onChange={e => update('stockQuantity', e.target.value)} /></label>
                  <label className="form-field">Low stock threshold<input className="form-control" type="number" min="0" step="1" value={draft.lowStockThreshold} disabled={!draft.trackStock} onChange={e => update('lowStockThreshold', e.target.value)} /></label>
                </div>
              </section>

              <section className="admin-panel">
                <h3>Digital download</h3>
                <label className="admin-feature-toggle">
                  <span><strong>Digital product</strong><small>Buyers receive a download link after payment.</small></span>
                  <input type="checkbox" checked={draft.isDigital} onChange={e => update('isDigital', e.target.checked)} />
                </label>
                <label className="form-field">Digital file key<input className="form-control" value={draft.digitalFileKey} disabled={!draft.isDigital} onChange={e => update('digitalFileKey', e.target.value)} placeholder="R2 object key or full file URL" /></label>
                <label className="form-field">Download limit<input className="form-control" type="number" min="0" step="1" value={draft.digitalDownloadLimit} disabled={!draft.isDigital} onChange={e => update('digitalDownloadLimit', e.target.value)} /></label>
              </section>

              <section className="admin-panel">
                <h3>Images</h3>
                <label className="form-field">Upload image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={imageBusy} onChange={(e: ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) void uploadImage(file); e.target.value = ''; }} /></label>
                {imageBusy && <p className="admin-muted">Uploading image…</p>}
                {draft.images.length > 0 ? (
                  <div className="media-grid">
                    {draft.images.map((image, index) => (
                      <div key={`${image.objectKey}-${index}`} className={`media-thumb ${image.isPrimary ? 'primary' : ''}`}>
                        {image.previewUrl ? <img src={image.previewUrl} alt={image.alt} loading="lazy" /> : <p className="muted-text">Preview unavailable</p>}
                        <div className="form-row" role="group" aria-label={`Actions for image ${index + 1}`}>
                          <button type="button" className="button secondary small" onClick={() => moveImage(index, -1)} disabled={index === 0} aria-label="Move image earlier"><ArrowUp size={14} aria-hidden="true" /></button>
                          <button type="button" className="button secondary small" onClick={() => setPrimaryImage(index)} aria-label="Set as primary image" title="Set as primary">{image.isPrimary ? <Star size={14} fill="currentColor" aria-hidden="true" /> : <Star size={14} aria-hidden="true" />}</button>
                          <button type="button" className="button secondary small" onClick={() => moveImage(index, 1)} disabled={index === draft.images.length - 1} aria-label="Move image later"><ArrowDown size={14} aria-hidden="true" /></button>
                          <button type="button" className="button secondary small" onClick={() => removeImage(index)} aria-label="Remove image"><X size={14} aria-hidden="true" /></button>
                        </div>
                        {image.isPrimary && <span className="success-text">Primary</span>}
                      </div>
                    ))}
                  </div>
                ) : <p className="muted-text">No images yet. The first image you upload becomes the primary image.</p>}
              </section>

              <section className="admin-panel">
                <h3>Product options</h3>
                {draft.categoryId ? (
                  categoryAttributes.length > 0 ? categoryAttributes.map(attribute => (
                    <fieldset key={attribute.id} className="attr-editor">
                      <legend>{attribute.name}{attribute.isRequired ? ' (required)' : ''}</legend>
                      <div className="attr-values">
                        {attribute.values.map(value => (
                          <label key={value.id}>
                            <input
                              type="checkbox"
                              checked={draft.attributeOptions.some(option => option.valueId === value.id)}
                              onChange={e => toggleAttributeValue(attribute.id, value.id, e.target.checked)}
                            />
                            {value.label || value.value}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )) : <p className="muted-text">This category has no active option groups.</p>
                ) : <p className="muted-text">Choose a category to offer option groups such as sizes or colours.</p>}
                <p className="muted-text">Selected options become the choices buyers see on the product page.</p>
              </section>

              {draft.listingType === 'bundle' && (
                <section className="admin-panel">
                  <h3>Bundle items</h3>
                  <ProductPicker pickerLabel="to the bundle" excludeIds={draft.bundleItems.map(item => item.productId)} onPick={addBundleProduct} />
                  {draft.bundleItems.length > 0 ? draft.bundleItems.map((item, index) => (
                    <div className="bundle-row" key={item.productId}>
                      <strong>{item.title || 'Product'}</strong>
                      <div className="form-row" role="group" aria-label={`Quantity for ${item.title}`}>
                        <button type="button" className="button secondary small" onClick={() => changeBundleQuantity(index, -1)} aria-label="Decrease quantity">-</button>
                        <span>{item.quantity}</span>
                        <button type="button" className="button secondary small" onClick={() => changeBundleQuantity(index, 1)} aria-label="Increase quantity">+</button>
                      </div>
                      <button type="button" className="button secondary small" onClick={() => removeBundleItem(index)}>Remove</button>
                    </div>
                  )) : <p className="muted-text">No products in this bundle yet.</p>}
                  <p className="muted-text">Each product keeps its default option selection in this version.</p>
                </section>
              )}

              <section className="admin-panel">
                <h3>Related listings</h3>
                <ProductPicker pickerLabel="to related listings" excludeIds={[...draft.related.map(item => item.id), ...(editingId ? [editingId] : [])]} onPick={addRelated} />
                {draft.related.length > 0 ? (
                  <div className="form-row">
                    {draft.related.map(item => (
                      <span className="chip active" key={item.id}>
                        {item.title || 'Unavailable product'}
                        <button type="button" className="text-link" onClick={() => removeRelated(item.id)} aria-label={`Remove ${item.title} from related listings`}>Remove</button>
                      </span>
                    ))}
                  </div>
                ) : <p className="muted-text">No related listings yet.</p>}
              </section>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="store-admin" aria-label="Store listings">
      <div className="admin-toolbar">
        <form className="form-row" onSubmit={(event: FormEvent) => { event.preventDefault(); setPage(1); setAppliedQuery(query); }}>
          <input className="form-control" placeholder="Search listings by title" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search listings by title" />
          <button className="button secondary small" type="submit">Search</button>
        </form>
        <div className="form-row" role="group" aria-label="Filter listings by status">
          {STATUS_FILTERS.map(filter => (
            <button key={filter.value} type="button" className={`chip ${statusFilter === filter.value ? 'active' : ''}`} onClick={() => { setStatusFilter(filter.value); setPage(1); }}>{filter.label}</button>
          ))}
        </div>
        <button type="button" className="button secondary small" onClick={() => void load()} disabled={loading}>Refresh</button>
        <button type="button" className="button small" onClick={startCreate}>New listing</button>
      </div>
      {message && <p className="success-text" role="status">{message}</p>}
      {error && <p className="danger-text" role="alert">{error}</p>}
      {loading ? <p className="admin-muted">Loading listings…</p> : listings.length === 0 ? (
        <div className="empty-state">No listings found. Create your first listing to open the store.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Image</th><th>Title</th><th>Type</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Updated</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {listings.map(listing => (
                <tr key={listing.id}>
                  <td><img src={listing.primaryImageUrl} alt="" width={48} height={48} loading="lazy" /></td>
                  <td><strong>{listing.title}</strong><br /><span className="muted-text">{listing.slug}</span></td>
                  <td>{listing.listingType === 'bundle' ? 'Bundle' : 'Single'}</td>
                  <td>{listing.categoryName || '-'}</td>
                  <td>
                    <span className="money">{formatNaira(listing.priceKobo)}</span>
                    {listing.compareAtPriceKobo !== null && <br />}
                    {listing.compareAtPriceKobo !== null && <span className="muted-text">{formatNaira(listing.compareAtPriceKobo)}</span>}
                  </td>
                  <td>
                    {!listing.trackStock ? <span className="stock-badge">Untracked</span>
                      : listing.stockQuantity <= 0 ? <span className="stock-badge out">Out of stock</span>
                      : listing.stockQuantity <= listing.lowStockThreshold ? <span className="stock-badge low">{listing.stockQuantity} left</span>
                      : <span className="stock-badge">{listing.stockQuantity} in stock</span>}
                  </td>
                  <td><span className={`status-pill ${listing.status}`}>{statusLabel(listing.status)}</span></td>
                  <td>{new Date(listing.updatedAt).toLocaleDateString()}</td>
                  <td>
                    <div className="form-row">
                      <button type="button" className="button secondary small" onClick={() => void openEdit(listing.id)}>Edit</button>
                      <button type="button" className="button secondary small" onClick={() => void removeListing(listing)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="pagination">
          <button type="button" className="page-btn" disabled={page <= 1} onClick={() => setPage(current => current - 1)}>Previous</button>
          <span className="muted-text">Page {page} of {pages} · {total} listings</span>
          <button type="button" className="page-btn" disabled={page >= pages} onClick={() => setPage(current => current + 1)}>Next</button>
        </div>
      )}
    </section>
  );
}
