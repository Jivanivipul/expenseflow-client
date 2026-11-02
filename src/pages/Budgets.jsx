import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../layouts/Layout';
import BudgetModal from '../components/BudgetModal';
import api from '../services/api';

// Local month (YYYY-MM). toISOString() is UTC and can show the wrong month
// in the early hours of the 1st in India.
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const shiftMonth = (ym, delta) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const fmt = (v) => safeNum(v).toLocaleString('en-IN');

const STATUS = {
  exceeded: { text: 'Exceeded', bar: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700', pct: 'text-rose-600' },
  warning: { text: 'Near limit', bar: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700', pct: 'text-amber-600' },
  ok: { text: 'On track', bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700', pct: 'text-emerald-600' },
};
const statusOf = (s) => STATUS[s] || STATUS.ok;

const Icon = ({ d, className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={d} />
  </svg>
);
const ICONS = {
  plus: 'M12 5v14M5 12h14',
  edit: 'M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16v4zM13.5 6.5l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3',
  left: 'M15 6l-6 6 6 6',
  right: 'M9 6l6 6-6 6',
  target: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8zM12 12h.01',
};

function Summary({ label, count, dot }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-3">
      <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-900">{count}</p>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-4">
      {[0, 1, 2, 3].map((i) => <div key={i} className="h-40 bg-slate-200 rounded-2xl" />)}
    </div>
  );
}

export default function Budgets() {
  const [month, setMonth] = useState(currentMonth());
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
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
  }, [month]);

  useEffect(() => { load(); }, [load]);

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

  const counts = useMemo(() => {
    const c = { ok: 0, warning: 0, exceeded: 0 };
    budgets.forEach((b) => { c[STATUS[b.status] ? b.status : 'ok'] += 1; });
    return c;
  }, [budgets]);

  const isCurrent = month === currentMonth();

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Budgets</h1>
          <p className="text-sm text-slate-500">{monthLabel(month)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white shadow-sm">
            <button
              onClick={() => setMonth(shiftMonth(month, -1))}
              aria-label="Previous month"
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-l-lg transition"
            >
              <Icon d={ICONS.left} />
            </button>
            <input
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              className="border-x border-slate-200 bg-transparent px-2 py-1.5 text-sm text-slate-900 focus:outline-none focus:bg-slate-50"
            />
            <button
              onClick={() => setMonth(shiftMonth(month, 1))}
              aria-label="Next month"
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-r-lg transition"
            >
              <Icon d={ICONS.right} />
            </button>
          </div>

          {!isCurrent && (
            <button
              onClick={() => setMonth(currentMonth())}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              This month
            </button>
          )}

          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition"
          >
            <Icon d={ICONS.plus} />
            Add Budget
          </button>
        </div>
      </div>

      {loading ? (
        <Skeleton />
      ) : error ? (
        <div className="max-w-md mx-auto mt-10 bg-white rounded-2xl border border-rose-100 shadow-sm p-8 text-center">
          <p className="font-semibold text-slate-900">Couldn’t load budgets</p>
          <p className="text-sm text-rose-600 mt-1">{error}</p>
          <button
            onClick={load}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
          >
            Try again
          </button>
        </div>
      ) : budgets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <Icon d={ICONS.target} className="w-6 h-6" />
          </div>
          <p className="font-semibold text-slate-900">No budgets for {monthLabel(month)}</p>
          <p className="text-sm text-slate-500 mt-1">Set a limit to keep your spending in check.</p>
          <button
            onClick={openAdd}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
          >
            <Icon d={ICONS.plus} />
            Add Budget
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Summary label="On track" count={counts.ok} dot="bg-emerald-500" />
            <Summary label="Near limit" count={counts.warning} dot="bg-amber-500" />
            <Summary label="Exceeded" count={counts.exceeded} dot="bg-rose-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgets.map((b) => {
              const st = statusOf(b.status);
              const percentage = safeNum(b.percentage);
              const pct = Math.max(0, Math.min(percentage, 100));
              const limit = safeNum(b.limit);
              const spent = safeNum(b.spent);
              const remaining = safeNum(b.remaining);

              return (
                <div
                  key={b._id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {b.category || 'Overall monthly budget'}
                      </h3>
                      <span className={`inline-block mt-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${st.badge}`}>
                        {st.text}
                      </span>
                    </div>

                    <div className="flex items-start gap-1 shrink-0">
                      <div className="text-right mr-1">
                        <p className="text-xs text-slate-500">Limit</p>
                        <p className="font-bold text-slate-900">₹{fmt(limit)}</p>
                      </div>
                      <div className="flex -mr-1.5 -mt-1.5">
                        <button
                          onClick={() => openEdit(b)}
                          aria-label="Edit budget"
                          title="Edit"
                          className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <Icon d={ICONS.edit} />
                        </button>
                        <button
                          onClick={() => handleDelete(b._id)}
                          aria-label="Delete budget"
                          title="Delete"
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Icon d={ICONS.trash} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mt-5">
                    <div className="flex items-end justify-between mb-1.5">
                      <span className="text-sm text-slate-600">
                        Spent <span className="font-semibold text-slate-900">₹{fmt(spent)}</span>
                      </span>
                      <span className={`text-sm font-semibold ${st.pct}`}>{percentage}%</span>
                    </div>
                    <div
                      className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={Math.round(pct)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${st.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <p className={`mt-3 text-sm ${remaining >= 0 ? 'text-slate-500' : 'text-rose-600 font-medium'}`}>
                    {remaining >= 0
                      ? `₹${fmt(remaining)} left this month`
                      : `Over by ₹${fmt(Math.abs(remaining))}`}
                  </p>
                </div>
              );
            })}
          </div>
        </>
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