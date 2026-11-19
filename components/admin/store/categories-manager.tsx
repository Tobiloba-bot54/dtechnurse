// File: DTECHNURSE-SITE-main/components/admin/store/categories-manager.tsx
'use client';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/services/http';
import type { CategoryAttribute, CategorySummary } from '@/lib/services/store/types';

type CategoryDraft = { id: string; name: string; slug: string; description: string; sortOrder: string; isActive: boolean };
type ValueDraft = { id?: string; value: string; label: string };
type AttributeDraft = { id?: string; name: string; slug: string; inputType: 'select' | 'text'; isRequired: boolean; isActive: boolean; sortOrder: string; values: ValueDraft[] };

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

export function CategoriesManager() {
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [attributes, setAttributes] = useState<CategoryAttribute[]>([]);
  const [catDrafts, setCatDrafts] = useState<CategoryDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [rowBusy, setRowBusy] = useState('');

  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [attrDrafts, setAttrDrafts] = useState<AttributeDraft[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ categories: CategorySummary[]; attributes: CategoryAttribute[] }>('/api/admin/store/config');
      const nextCategories = data.categories ?? [];
      setCategories(nextCategories);
      setAttributes(data.attributes ?? []);
      setCatDrafts(nextCategories.map(category => ({ id: category.id, name: category.name, slug: category.slug, description: category.description, sortOrder: String(category.sortOrder), isActive: category.isActive })));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Store configuration could not be loaded.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const syncAttributeDrafts = useCallback((categoryId: string, source: CategoryAttribute[]) => {
    setAttrDrafts(source
      .filter(attribute => attribute.categoryId === categoryId)
      .map(attribute => ({
        id: attribute.id,
        name: attribute.name,
        slug: attribute.slug,
        inputType: attribute.inputType === 'text' ? 'text' : 'select',
        isRequired: attribute.isRequired,
        isActive: attribute.isActive,
        sortOrder: String(attribute.sortOrder),
        values: attribute.values.map(value => ({ id: value.id, value: value.value, label: value.label })),
      })));
  }, []);

  useEffect(() => { syncAttributeDrafts(selectedCategoryId, attributes); }, [selectedCategoryId, attributes, syncAttributeDrafts]);

  function updateCategoryDraft(id: string, patch: Partial<CategoryDraft>) {
    setCatDrafts(current => current.map(draft => draft.id === id ? { ...draft, ...patch } : draft));
  }

  async function saveCategory(draft: CategoryDraft) {
    if (!draft.name.trim()) { setError('A category name is required.'); return; }
    setRowBusy(draft.id); setError(''); setMessage('');
    try {
      await apiRequest('/api/admin/store/config', {
        method: 'PUT',
        body: JSON.stringify({ categoryUpdates: [{ id: draft.id, name: draft.name, description: draft.description, sortOrder: Math.max(0, Math.floor(Number(draft.sortOrder || 0))), isActive: draft.isActive }] }),
      });
      setMessage(`Category "${draft.name}" saved.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The category could not be saved.');
    } finally { setRowBusy(''); }
  }

  function updateAttributeDraft(index: number, patch: Partial<AttributeDraft>) {
    setAttrDrafts(current => current.map((draft, i) => i === index ? { ...draft, ...patch } : draft));
  }

  function updateValueDraft(attrIndex: number, valueIndex: number, patch: Partial<ValueDraft>) {
    setAttrDrafts(current => current.map((draft, i) => i !== attrIndex ? draft : { ...draft, values: draft.values.map((value, vi) => vi === valueIndex ? { ...value, ...patch } : value) }));
  }

  function addValueDraft(attrIndex: number) {
    setAttrDrafts(current => current.map((draft, i) => i !== attrIndex ? draft : { ...draft, values: [...draft.values, { value: '', label: '' }] }));
  }

  function removeValueDraft(attrIndex: number, valueIndex: number) {
    setAttrDrafts(current => current.map((draft, i) => i !== attrIndex ? draft : { ...draft, values: draft.values.filter((_, vi) => vi !== valueIndex) }));
  }

  function addAttributeDraft() {
    setAttrDrafts(current => [...current, { name: '', slug: '', inputType: 'select', isRequired: false, isActive: true, sortOrder: String(current.length), values: [] }]);
  }

  async function saveAttribute(draft: AttributeDraft, index: number) {
    if (!selectedCategoryId) { setError('Choose a category first.'); return; }
    if (!draft.name.trim()) { setError('An option group name is required.'); return; }
    setRowBusy(draft.id ?? `new-${index}`); setError(''); setMessage('');
    try {
      const payload = {
        attributeSaves: [{
          categoryId: selectedCategoryId,
          ...(draft.id ? { id: draft.id } : {}),
          name: draft.name,
          slug: draft.id ? draft.slug : slugify(draft.name),
          inputType: draft.inputType,
          isRequired: draft.isRequired,
          isActive: draft.isActive,
          sortOrder: Math.max(0, Math.floor(Number(draft.sortOrder || 0))),
          values: draft.values
            .filter(value => value.value.trim())
            .map((value, valueIndex) => ({ ...(value.id ? { id: value.id } : {}), value: value.value, label: value.label, sortOrder: valueIndex })),
        }],
      };
      await apiRequest('/api/admin/store/config', { method: 'PUT', body: JSON.stringify(payload) });
      setMessage(`Option group "${draft.name}" saved.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The option group could not be saved.');
    } finally { setRowBusy(''); }
  }

  async function deleteAttribute(draft: AttributeDraft, index: number) {
    if (!draft.id) {
      setAttrDrafts(current => current.filter((_, i) => i !== index));
      return;
    }
    if (!window.confirm(`Delete the option group "${draft.name}"? Listings using it will lose those option choices.`)) return;
    setRowBusy(draft.id); setError(''); setMessage('');
    try {
      await apiRequest('/api/admin/store/config', { method: 'PUT', body: JSON.stringify({ attributeDeletes: [draft.id] }) });
      setMessage(`Option group "${draft.name}" deleted.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The option group could not be deleted.');
    } finally { setRowBusy(''); }
  }

  const selectedCategory = categories.find(category => category.id === selectedCategoryId);

  return (
    <section className="store-admin" aria-label="Store categories and options">
      {message && <p className="success-text" role="status">{message}</p>}
      {error && <p className="danger-text" role="alert">{error}</p>}
      {loading ? <p className="admin-muted">Loading store configuration…</p> : (
        <>
          <div className="admin-panel">
            <div className="admin-panel-head">
              <div><span className="eyebrow">CATEGORIES</span><h3>Product categories</h3></div>
            </div>
            {catDrafts.length === 0 ? <div className="empty-state">No categories yet. Categories are created with the store seed data.</div> : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Name</th><th>Sort order</th><th>Description</th><th>Active</th><th>Actions</th></tr></thead>
                  <tbody>
                    {catDrafts.map(draft => (
                      <tr key={draft.id}>
                        <td><input className="form-control" value={draft.name} aria-label={`Name for ${draft.slug}`} onChange={e => updateCategoryDraft(draft.id, { name: e.target.value })} /></td>
                        <td><input className="form-control" type="number" min="0" step="1" value={draft.sortOrder} aria-label={`Sort order for ${draft.slug}`} onChange={e => updateCategoryDraft(draft.id, { sortOrder: e.target.value })} /></td>
                        <td><input className="form-control" value={draft.description} aria-label={`Description for ${draft.slug}`} onChange={e => updateCategoryDraft(draft.id, { description: e.target.value })} /></td>
                        <td>
                          <button type="button" className={`chip ${draft.isActive ? 'active' : ''}`} aria-pressed={draft.isActive} onClick={() => updateCategoryDraft(draft.id, { isActive: !draft.isActive })}>
                            {draft.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td><button type="button" className="button secondary small" disabled={rowBusy === draft.id} onClick={() => void saveCategory(draft)}>{rowBusy === draft.id ? 'Saving…' : 'Save'}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="admin-panel">
            <div className="admin-panel-head">
              <div><span className="eyebrow">OPTION GROUPS</span><h3>Category option groups</h3></div>
              <div className="form-row">
                <label className="form-field">Category
                  <select className="form-control" value={selectedCategoryId} onChange={e => setSelectedCategoryId(e.target.value)}>
                    <option value="">Choose a category</option>
                    {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </label>
                <button type="button" className="button small" onClick={addAttributeDraft} disabled={!selectedCategoryId}>Add option group</button>
              </div>
            </div>
            {!selectedCategoryId ? (
              <p className="muted-text">Choose a category to manage its option groups such as sizes or colours.</p>
            ) : selectedCategory && !selectedCategory.isActive ? (
              <p className="muted-text">This category is inactive. Its option groups can still be edited.</p>
            ) : null}
            {selectedCategoryId && attrDrafts.length === 0 && <p className="muted-text">No option groups for this category yet.</p>}
            <div className="admin-form-grid">
              {selectedCategoryId && attrDrafts.map((draft, index) => (
                <fieldset key={draft.id ?? `new-${index}`} className="attr-editor">
                  <legend>{draft.id ? `Edit ${draft.name || 'option group'}` : 'New option group'}</legend>
                  <label className="form-field">Name<input className="form-control" value={draft.name} onChange={e => updateAttributeDraft(index, { name: e.target.value })} placeholder="Size" /></label>
                  <div className="form-row">
                    <label className="form-field">Input type
                      <select className="form-control" value={draft.inputType} onChange={e => updateAttributeDraft(index, { inputType: e.target.value === 'text' ? 'text' : 'select' })}>
                        <option value="select">Select from values</option>
                        <option value="text">Free text</option>
                      </select>
                    </label>
                    <label className="form-field">Sort order<input className="form-control" type="number" min="0" step="1" value={draft.sortOrder} onChange={e => updateAttributeDraft(index, { sortOrder: e.target.value })} /></label>
                  </div>
                  <label className="admin-feature-toggle">
                    <span><strong>Required</strong><small>Products must choose a value before publishing.</small></span>
                    <input type="checkbox" checked={draft.isRequired} onChange={e => updateAttributeDraft(index, { isRequired: e.target.checked })} />
                  </label>
                  <label className="admin-feature-toggle">
                    <span><strong>Active</strong><small>Inactive groups are hidden from product pages.</small></span>
                    <input type="checkbox" checked={draft.isActive} onChange={e => updateAttributeDraft(index, { isActive: e.target.checked })} />
                  </label>
                  <div className="attr-values">
                    <strong>Values</strong>
                    {draft.values.map((value, valueIndex) => (
                      <div className="form-row" key={value.id ?? `new-${valueIndex}`}>
                        <input className="form-control" value={value.value} aria-label="Option value" placeholder="Value, for example xl" onChange={e => updateValueDraft(index, valueIndex, { value: e.target.value })} />
                        <input className="form-control" value={value.label} aria-label="Option label" placeholder="Label shown to buyers" onChange={e => updateValueDraft(index, valueIndex, { label: e.target.value })} />
                        <button type="button" className="button secondary small" onClick={() => removeValueDraft(index, valueIndex)} aria-label="Remove value">Remove</button>
                      </div>
                    ))}
                    {draft.values.length === 0 && <p className="muted-text">No values yet. Add the choices buyers can pick.</p>}
                    <button type="button" className="button secondary small" onClick={() => addValueDraft(index)}>Add value</button>
                  </div>
                  <div className="form-row">
                    <button type="button" className="button small" disabled={rowBusy === (draft.id ?? `new-${index}`)} onClick={() => void saveAttribute(draft, index)}>{rowBusy === (draft.id ?? `new-${index}`) ? 'Saving…' : 'Save option group'}</button>
                    <button type="button" className="button secondary small" disabled={rowBusy === draft.id} onClick={() => void deleteAttribute(draft, index)}>Delete</button>
                  </div>
                </fieldset>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
