import { useEffect, useState } from 'react';
import Layout from '../layouts/Layout';
import TransactionModal from '../components/TransactionModal';
import api from '../services/api';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    type: '',
    category: '',
    search: '',
    from: '',
    to: '',
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.type) params.type = filters.type;
      if (filters.category) params.category = filters.category;
      if (filters.search) params.search = filters.search;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const res = await api.get('/transactions', { params });
      setTransactions(res.data.transactions);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const applyFilters = (e) => {
    e.preventDefault();
    load();
  };

  const resetFilters = () => {
    setFilters({ type: '', category: '', search: '', from: '', to: '' });
    setTimeout(load, 0);
  };

  const handleSave = async (data) => {
    if (editing) {
      await api.put(`/transactions/${editing._id}`, data);
    } else {
      await api.post('/transactions', data);
    }
    setEditing(null);
    await load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await api.delete(`/transactions/${id}`);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (t) => { setEditing(t); setModalOpen(true); };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <button
          onClick={openAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Add Transaction
        </button>
      </div>

      {/* Filters */}
      <form onSubmit={applyFilters} className="bg-white p-4 rounded shadow mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className="border rounded p-2"
        >
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <input
          type="text" placeholder="Category"
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="border rounded p-2"
        />
        <input
          type="text" placeholder="Search description"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="border rounded p-2"
        />
        <input
          type="date" value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          className="border rounded p-2"
        />
        <input
          type="date" value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          className="border rounded p-2"
        />
        <div className="sm:col-span-2 lg:col-span-5 flex gap-2">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Apply Filters
          </button>
          <button type="button" onClick={resetFilters} className="border px-4 py-2 rounded hover:bg-gray-50">
            Reset
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white rounded shadow overflow-x-auto">
        {loading ? (
          <p className="p-4">Loading...</p>
        ) : error ? (
          <p className="p-4 text-red-600">{error}</p>
        ) : transactions.length === 0 ? (
          <p className="p-4 text-gray-500">No transactions found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Category</th>
                <th className="p-3">Description</th>
                <th className="p-3">Method</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t._id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{new Date(t.date).toLocaleDateString('en-IN')}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      t.type === 'income'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="p-3">{t.category}</td>
                  <td className="p-3 text-gray-600">{t.description || '-'}</td>
                  <td className="p-3 capitalize">{t.paymentMethod}</td>
                  <td className={`p-3 text-right font-medium ${
                    t.type === 'income' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(t)} className="text-blue-600 hover:underline mr-3">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(t._id)} className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <TransactionModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        initial={editing}
      />
    </Layout>
  );
}