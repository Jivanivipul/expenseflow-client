import { useState, useEffect } from 'react';

export default function DebtModal({ isOpen, onClose, onSave, initial }) {
  const [form, setForm] = useState({
    direction: 'lent',
    personName: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    dueDate: '',
    note: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initial) {
      setForm({
        direction: initial.direction,
        personName: initial.personName,
        amount: initial.amount,
        date: new Date(initial.date).toISOString().slice(0, 10),
        dueDate: initial.dueDate
          ? new Date(initial.dueDate).toISOString().slice(0, 10)
          : '',
        note: initial.note || '',
      });
    } else {
      setForm({
        direction: 'lent',
        personName: '',
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        dueDate: '',
        note: '',
      });
    }
    setError('');
  }, [initial, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSave({
        direction: form.direction,
        personName: form.personName.trim(),
        amount: Number(form.amount),
        date: form.date,
        dueDate: form.dueDate || undefined,
        note: form.note.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-lg w-full max-w-md p-6"
      >
        <h2 className="text-xl font-bold mb-4">
          {initial ? 'Edit Debt' : 'Add Debt'}
        </h2>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <label className="block text-sm font-medium mb-1">Direction</label>
        <select
          name="direction"
          value={form.direction}
          onChange={handleChange}
          className="w-full border rounded p-2 mb-3"
        >
          <option value="lent">I lent money (they owe me)</option>
          <option value="borrowed">I borrowed money (I owe them)</option>
        </select>

        <label className="block text-sm font-medium mb-1">Person name</label>
        <input
          type="text"
          name="personName"
          value={form.personName}
          onChange={handleChange}
          className="w-full border rounded p-2 mb-3"
          placeholder="e.g. Rahul"
          required
        />

        <label className="block text-sm font-medium mb-1">Amount (₹)</label>
        <input
          type="number"
          name="amount"
          min="0.01"
          step="0.01"
          value={form.amount}
          onChange={handleChange}
          className="w-full border rounded p-2 mb-3"
          required
        />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className="w-full border rounded p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Due date (optional)</label>
            <input
              type="date"
              name="dueDate"
              value={form.dueDate}
              onChange={handleChange}
              className="w-full border rounded p-2"
            />
          </div>
        </div>

        <label className="block text-sm font-medium mb-1">Note (optional)</label>
        <input
          type="text"
          name="note"
          value={form.note}
          onChange={handleChange}
          className="w-full border rounded p-2 mb-4"
          placeholder="e.g. Bike repair"
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded border hover:bg-gray-50"
          >
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