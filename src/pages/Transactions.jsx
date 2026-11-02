import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../layouts/Layout';
import TransactionModal from '../components/TransactionModal';
import api from '../services/api';

const EMPTY_FILTERS = { type: '', category: '', search: '', from: '', to: '', account: '' };

const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const signedRupee = (n) => `${Number(n) < 0 ? '-' : ''}₹${Math.abs(Number(n) || 0).toLocaleString('en-IN')}`;

const Icon = ({ d, className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={d} />
  </svg>
);
const ICONS = {
  plus: 'M12 5v14M5 12h14',
  search: 'M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z',
  edit: 'M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16v4zM13.5 6.5l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3',
  up: 'M12 19V5m0 0l-6 6m6-6l6 6',
  down: 'M12 5v14m0 0l6-6m-6 6l-6-6',
  inbox: 'M3 13l3-8h12l3 8M3 13v5a2 2 0 002 2h14a2 2 0 002-2v-5M3 13h5l1 3h6l1-3h5',
};

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

function Summary({ label, value, tone }) {
  const tones = {
    green: 'text-emerald-600',
    red: 'text-rose-600',
    slate: 'text-slate-900',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold truncate ${tones[tone]}`}>{value}</p>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="animate-pulse divide-y divide-slate-100">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="w-9 h-9 rounded-full bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 bg-slate-200 rounded" />
            <div className="h-3 w-1/2 bg-slate-100 rounded" />
          </div>
          <div className="h-4 w-20 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Takes the filters as an argument so Reset can fetch with cleared values
  // (the old setTimeout(load, 0) re-ran with stale filters).
  const load = useCallback(async (f) => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      Object.entries(f).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/transactions', { params });
      setTransactions(res.data.transactions);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const res = await api.get('/accounts');
        setAccounts(res.data.accounts);
      } catch {
        setAccounts([]);
      }
    };
    loadAccounts();
    load(EMPTY_FILTERS);
  }, [load]);

  const applyFilters = (e) => {
    e.preventDefault();
    load(filters);
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    load(EMPTY_FILTERS);
  };

  const handleSave = async (data) => {
    if (editing) {
      await api.put(`/transactions/${editing._id}`, data);
    } else {
      await api.post('/transactions', data);
    }
    setEditing(null);
    await load(filters);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await api.delete(`/transactions/${id}`);
      await load(filters);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (t) => { setEditing(t); setModalOpen(true); };

  const accountById = useMemo(() => {
    const m = {};
    accounts.forEach((a) => { m[a._id] = a; });
    return m;
  }, [accounts]);
  const getAccountName = (id) => accountById[id]?.name || '-';
  const getAccountColor = (id) => accountById[id]?.color || '#94a3b8';

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach((t) => {
      if (t.type === 'income') income += Number(t.amount) || 0;
      else expense += Number(t.amount) || 0;
    });
    return { income, expense, net: income - expense };
  }, [transactions]);

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
          <p className="text-sm text-slate-500">
            {loading ? 'Loading…' : `${transactions.length} transaction${transactions.length === 1 ? '' : 's'}${hasFilters ? ' (filtered)' : ''}`}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition"
        >
          <Icon d={ICONS.plus} />
          Add Transaction
        </button>
      </div>

      {/* Summary of what's currently shown */}
      {!loading && !error && transactions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Summary label="Income" value={rupee(totals.income)} tone="green" />
          <Summary label="Expenses" value={rupee(totals.expense)} tone="red" />
          <Summary label="Net" value={signedRupee(totals.net)} tone={totals.net < 0 ? 'red' : 'slate'} />
        </div>
      )}

      {/* Filters */}
      <form
        onSubmit={applyFilters}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <Field label="Type">
            <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className={inputCls}>
              <option value="">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </Field>

          <Field label="Account">
            <select value={filters.account} onChange={(e) => setFilters({ ...filters, account: e.target.value })} className={inputCls}>
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>{a.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Category">
            <input
              type="text" placeholder="e.g. Food"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className={inputCls}
            />
          </Field>

          <Field label="Search">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon d={ICONS.search} /></span>
              <input
                type="text" placeholder="Description"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className={`${inputCls} pl-9`}
              />
            </div>
          </Field>

          <Field label="From">
            <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className={inputCls} />
          </Field>

          <Field label="To">
            <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className={inputCls} />
          </Field>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
          >
            Apply Filters
          </button>
          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasFilters}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Reset
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <SkeletonRows />
        ) : error ? (
          <div className="p-10 text-center">
            <p className="font-semibold text-slate-900">Couldn’t load transactions</p>
            <p className="text-sm text-rose-600 mt-1">{error}</p>
            <button
              onClick={() => load(filters)}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
            >
              Try again
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Icon d={ICONS.inbox} className="w-6 h-6" />
            </div>
            <p className="font-semibold text-slate-900">No transactions found</p>
            <p className="text-sm text-slate-500 mt-1">
              {hasFilters ? 'Try changing or resetting your filters.' : 'Add your first transaction to get started.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Account</th>
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3 hidden lg:table-cell">Description</th>
                  <th className="px-3 py-3 hidden md:table-cell">Method</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => {
                  const income = t.type === 'income';
                  return (
                    <tr key={t._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap text-slate-600">
                        {new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          income ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          <Icon d={income ? ICONS.up : ICONS.down} className="w-3 h-3" />
                          {income ? 'Income' : 'Expense'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-2 text-slate-700 whitespace-nowrap">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getAccountColor(t.account) }} />
                          {getAccountName(t.account)}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-900">{t.category}</td>
                      <td className="px-3 py-3 text-slate-500 hidden lg:table-cell max-w-xs truncate" title={t.description || ''}>
                        {t.description || '-'}
                      </td>
                      <td className="px-3 py-3 capitalize text-slate-600 hidden md:table-cell">{t.paymentMethod}</td>
                      <td className={`px-3 py-3 text-right font-semibold whitespace-nowrap ${income ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {income ? '+' : '-'}{rupee(t.amount)}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => openEdit(t)}
                          aria-label="Edit transaction"
                          title="Edit"
                          className="inline-flex p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <Icon d={ICONS.edit} />
                        </button>
                        <button
                          onClick={() => handleDelete(t._id)}
                          aria-label="Delete transaction"
                          title="Delete"
                          className="inline-flex p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Icon d={ICONS.trash} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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