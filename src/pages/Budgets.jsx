import { useEffect, useState } from 'react';
import Layout from '../layouts/Layout';
import BudgetModal from '../components/BudgetModal';
import api from '../services/api';

const currentMonth = () => new Date().toISOString().slice(0, 7);

const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmt = (v) => safeNum(v).toLocaleString('en-IN');

const barColor = (status) => {
  if (status === 'exceeded') return 'bg-red-500';
  if (status === 'warning') return 'bg-amber-500';
  return 'bg-green-500';
};

const statusLabel = (status) => {
  if (status === 'exceeded') return { text: 'Exceeded', cls: 'bg-red-100 text-red-700' };
  if (status === 'warning') return { text: 'Near limit', cls: 'bg-amber-100 text-amber-700' };
  return { text: 'On track', cls: 'bg-green-100 text-green-700' };
};

export default function Budgets() {
  const [month, setMonth] = useState(currentMonth());
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/budgets', { params: { month } });
      const data = res.data?.budgets;
      setBudgets(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load budgets');
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month]);

  const handleSave = async (data) => {
    await api.post('/budgets', data);
    setEditing(null);
    await load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this budget?')) return;
    try {
      await api.delete(`/budgets/${id}`);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (b) => {
    setEditing({ _id: b._id, category: b.category, limit: b.limit });
    setModalOpen(true);
  };

  return (
    <Layout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">Budgets</h1>
        <div className="flex gap-2 items-center">
          <input
            type="month" value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border rounded p-2"
          />
          <button onClick={openAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            + Add Budget
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : budgets.length === 0 ? (
        <div className="bg-white p-6 rounded shadow text-center text-gray-500">
          No budgets for {month}. Click "Add Budget" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((b) => {
            const pct = Math.min(safeNum(b.percentage), 100);
            const badge = statusLabel(b.status);
            const limit = safeNum(b.limit);
            const spent = safeNum(b.spent);
            const remaining = safeNum(b.remaining);

            return (
              <div key={b._id} className="bg-white p-4 rounded shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {b.category || 'Overall monthly budget'}
                    </h3>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${badge.cls}`}>
                      {badge.text}
                    </span>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-gray-500">Limit</div>
                    <div className="font-bold">₹{fmt(limit)}</div>
                  </div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
                  <div
                    className={`h-3 rounded-full ${barColor(b.status)}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex justify-between text-sm text-gray-600 mb-3">
                  <span>Spent: ₹{fmt(spent)} ({safeNum(b.percentage)}%)</span>
                  <span>
                    {remaining >= 0
                      ? `Left: ₹${fmt(remaining)}`
                      : `Over by ₹${fmt(Math.abs(remaining))}`}
                  </span>
                </div>

                <div className="flex justify-end gap-2 text-sm">
                  <button onClick={() => openEdit(b)} className="text-blue-600 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(b._id)} className="text-red-600 hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BudgetModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        month={month}
        initial={editing}
      />
    </Layout>
  );
}