import { useState, useEffect } from 'react';

const CATEGORIES = ['Salary', 'Business', 'Freelance', 'Food', 'Rent', 'Transport', 'Shopping', 'Bills', 'Health', 'Education', 'Other'];
const PAYMENT_METHODS = ['cash', 'upi', 'card', 'netbanking', 'other'];

export default function TransactionModal({ isOpen, onClose, onSave, initial }) {
  const [form, setForm] = useState({
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    paymentMethod: 'upi',
    date: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initial) {
      setForm({
        type: initial.type,
        amount: initial.amount,
        category: initial.category,
        description: initial.description || '',
        paymentMethod: initial.paymentMethod || 'upi',
        date: new Date(initial.date).toISOString().slice(0, 10),
      });
    } else {
      setForm({
        type: 'expense',
        amount: '',
        category: '',
        description: '',
        paymentMethod: 'upi',
        date: new Date().toISOString().slice(0, 10),
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
        ...form,
        amount: Number(form.amount),
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
          {initial ? 'Edit Transaction' : 'Add Transaction'}
        </h2>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <label className="block text-sm font-medium mb-1">Type</label>
        <select
          name="type" value={form.type} onChange={handleChange}
          className="w-full border rounded p-2 mb-3"
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>

        <label className="block text-sm font-medium mb-1">Amount</label>
        <input
          type="number" name="amount" min="0.01" step="0.01"
          value={form.amount} onChange={handleChange}
          className="w-full border rounded p-2 mb-3" required
        />

        <label className="block text-sm font-medium mb-1">Category</label>
        <input
          type="text" name="category" list="categories"
          value={form.category} onChange={handleChange}
          className="w-full border rounded p-2 mb-3" required
        />
        <datalist id="categories">
          {CATEGORIES.map((c) => <option key={c} value={c} />)}
        </datalist>

        <label className="block text-sm font-medium mb-1">Payment Method</label>
        <select
          name="paymentMethod" value={form.paymentMethod} onChange={handleChange}
          className="w-full border rounded p-2 mb-3"
        >
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        <label className="block text-sm font-medium mb-1">Date</label>
        <input
          type="date" name="date" value={form.date} onChange={handleChange}
          className="w-full border rounded p-2 mb-3" required
        />

        <label className="block text-sm font-medium mb-1">Description</label>
        <input
          type="text" name="description" value={form.description}
          onChange={handleChange}
          className="w-full border rounded p-2 mb-4"
        />

        <div className="flex justify-end gap-2">
          <button
            type="button" onClick={onClose}
            className="px-4 py-2 rounded border hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit" disabled={saving}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}