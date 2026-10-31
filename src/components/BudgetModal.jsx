import { useState, useEffect } from 'react';

export default function BudgetModal({ isOpen, onClose, onSave, month, initial }) {
  const [form, setForm] = useState({ category: '', limit: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initial) {
      setForm({ category: initial.category || '', limit: initial.limit });
    } else {
      setForm({ category: '', limit: '' });
    }
    setError('');
  }, [initial, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSave({
        month,
        category: form.category.trim() || null,
        limit: Number(form.limit),
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save budget');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">
          {initial ? 'Edit Budget' : 'Add Budget'} — {month}
        </h2>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <label className="block text-sm font-medium mb-1">
          Category <span className="text-gray-400">(leave empty for overall monthly budget)</span>
        </label>
        <input
          type="text" value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="w-full border rounded p-2 mb-3"
          placeholder="e.g. Food, Rent… or empty"
        />

        <label className="block text-sm font-medium mb-1">Monthly limit (₹)</label>
        <input
          type="number" min="1" step="1" required
          value={form.limit}
          onChange={(e) => setForm({ ...form, limit: e.target.value })}
          className="w-full border rounded p-2 mb-4"
        />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded border hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}