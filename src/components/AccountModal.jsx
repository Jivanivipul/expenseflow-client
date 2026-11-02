import { useState, useEffect } from 'react';

const TYPES = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'bank', label: 'Bank Account', icon: '🏦' },
  { value: 'credit_card', label: 'Credit Card', icon: '💳' },
  { value: 'wallet', label: 'Wallet (UPI/GPay)', icon: '📱' },
  { value: 'other', label: 'Other', icon: '📦' },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280'];

export default function AccountModal({ isOpen, onClose, onSave, initial }) {
  const [form, setForm] = useState({
    name: '',
    type: 'cash',
    openingBalance: 0,
    color: '#3b82f6',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        type: initial.type,
        openingBalance: initial.openingBalance || 0,
        color: initial.color || '#3b82f6',
      });
    } else {
      setForm({ name: '', type: 'cash', openingBalance: 0, color: '#3b82f6' });
    }
    setError('');
  }, [initial, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSave({ ...form, openingBalance: Number(form.openingBalance) });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">{initial ? 'Edit Account' : 'Add Account'}</h2>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <label className="block text-sm font-medium mb-1">Account name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border rounded p-2 mb-3"
          placeholder="e.g. HDFC Savings"
          required
        />

        <label className="block text-sm font-medium mb-1">Type</label>
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="w-full border rounded p-2 mb-3"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.icon} {t.label}
            </option>
          ))}
        </select>

        <label className="block text-sm font-medium mb-1">Opening balance (₹)</label>
        <input
          type="number"
          step="0.01"
          value={form.openingBalance}
          onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
          className="w-full border rounded p-2 mb-3"
        />
        <p className="text-xs text-gray-500 mb-3">
          Current balance = opening balance + income − expenses on this account.
        </p>

        <label className="block text-sm font-medium mb-1">Color</label>
        <div className="flex gap-2 mb-4">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setForm({ ...form, color: c })}
              className={`w-8 h-8 rounded-full border-2 ${
                form.color === c ? 'border-gray-900' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded border hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}