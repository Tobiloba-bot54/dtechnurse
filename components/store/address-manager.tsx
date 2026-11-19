'use client';
import { useState, type FormEvent } from 'react';
import { MapPin } from 'lucide-react';
import { apiRequest } from '@/lib/services/http';
import type { AddressRecord } from '@/lib/services/store/types';

type AddressForm = { label: string; fullName: string; phone: string; street: string; city: string; localGovernment: string; state: string };

const EMPTY_FORM: AddressForm = { label: '', fullName: '', phone: '', street: '', city: '', localGovernment: '', state: '' };

function formFromRecord(record: AddressRecord): AddressForm {
  return { label: record.label, fullName: record.fullName, phone: record.phone, street: record.street, city: record.city, localGovernment: record.localGovernment, state: record.state };
}

export function AddressManager({ initialAddresses, states }: { initialAddresses: AddressRecord[]; states: string[] }) {
  const [addresses, setAddresses] = useState<AddressRecord[]>(initialAddresses);
  const [form, setForm] = useState<AddressForm>({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function reload() {
    const data = await apiRequest<{ addresses: AddressRecord[] }>('/api/store/addresses');
    setAddresses(Array.isArray(data.addresses) ? data.addresses : []);
  }

  function updateField(key: keyof AddressForm, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!form.fullName.trim() || !form.phone.trim() || !form.street.trim() || !form.city.trim() || !form.state.trim()) {
      setError('Please fill in the name, phone, street, city, and state.');
      return;
    }
    setBusy(true);
    try {
      if (editingId) {
        await apiRequest('/api/store/addresses', { method: 'PATCH', body: JSON.stringify({ id: editingId, ...form }) });
        setMessage('Address updated.');
      } else {
        await apiRequest('/api/store/addresses', { method: 'POST', body: JSON.stringify(form) });
        setMessage('Address saved.');
      }
      await reload();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The address could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Remove this address?')) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await apiRequest(`/api/store/addresses?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (editingId === id) resetForm();
      await reload();
      setMessage('Address removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The address could not be removed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="checkout-layout">
      <div>
        <h2>Saved addresses</h2>
        {addresses.length === 0 ? (
          <div className="empty-state">
            <MapPin className="empty-state-icon" aria-hidden="true" />
            <h3>No saved addresses yet</h3>
            <p>Save an address to speed up checkout next time.</p>
          </div>
        ) : (
          addresses.map(address => (
            <div className="address-block" key={address.id}>
              <h3>{address.label || 'Address'}{address.isDefault && <span className="badge">Default</span>}</h3>
              <p>
                {address.fullName}<br />
                {address.street}<br />
                {address.city}{address.localGovernment ? `, ${address.localGovernment}` : ''}<br />
                {address.state}<br />
                {address.phone}
              </p>
              <div className="buy-actions">
                <button type="button" className="button secondary small" onClick={() => { setEditingId(address.id); setForm(formFromRecord(address)); setMessage(''); setError(''); }}>Edit</button>
                <button type="button" className="button secondary small" onClick={() => remove(address.id)} disabled={busy}>Remove</button>
              </div>
            </div>
          ))
        )}
      </div>
      <form className="checkout-form" onSubmit={save} noValidate>
        <h2>{editingId ? 'Edit address' : 'Add a new address'}</h2>
        {message && <p className="form-success" role="status">{message}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-field">
          <label htmlFor="addr-label">Label (optional)</label>
          <input id="addr-label" className="form-control" value={form.label} onChange={event => updateField('label', event.target.value)} placeholder="Home, Office, Ward..." />
        </div>
        <div className="form-field">
          <label htmlFor="addr-name">Full name</label>
          <input id="addr-name" className="form-control" value={form.fullName} onChange={event => updateField('fullName', event.target.value)} autoComplete="name" required />
        </div>
        <div className="form-field">
          <label htmlFor="addr-phone">Phone number</label>
          <input id="addr-phone" className="form-control" type="tel" value={form.phone} onChange={event => updateField('phone', event.target.value)} autoComplete="tel" required />
        </div>
        <div className="form-field">
          <label htmlFor="addr-street">Street address</label>
          <input id="addr-street" className="form-control" value={form.street} onChange={event => updateField('street', event.target.value)} autoComplete="street-address" required />
        </div>
        <div className="form-row-2">
          <div className="form-field">
            <label htmlFor="addr-city">City</label>
            <input id="addr-city" className="form-control" value={form.city} onChange={event => updateField('city', event.target.value)} required />
          </div>
          <div className="form-field">
            <label htmlFor="addr-lga">Local government area</label>
            <input id="addr-lga" className="form-control lga-input" value={form.localGovernment} onChange={event => updateField('localGovernment', event.target.value)} />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="addr-state">State</label>
          <select id="addr-state" className="form-control state-select" value={form.state} onChange={event => updateField('state', event.target.value)} required>
            <option value="">Select your state</option>
            {states.map(state => <option key={state} value={state}>{state}</option>)}
          </select>
        </div>
        <div className="buy-actions">
          <button type="submit" className="button" disabled={busy}>{busy ? 'Saving…' : editingId ? 'Save changes' : 'Save address'}</button>
          {editingId && <button type="button" className="button secondary" onClick={resetForm} disabled={busy}>Cancel</button>}
        </div>
      </form>
    </div>
  );
}
