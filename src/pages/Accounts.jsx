import { useCallback, useEffect, useState } from 'react';
import Layout from '../layouts/Layout';
import AccountModal from '../components/AccountModal';
import api from '../services/api';

const TYPE_ICONS = {
  cash: '💵',
  bank: '🏦',
  credit_card: '💳',
  wallet: '📱',
  other: '📦',
};

// ₹-1,000 reads badly; show -₹1,000
const rupee = (n) => `${Number(n) < 0 ? '-' : ''}₹${Math.abs(Number(n) || 0).toLocaleString('en-IN')}`;

// "#3b82f6" -> "#3b82f61f" (soft tint). Falls back to a neutral tint for non-hex colors.
const tint = (color) => (/^#[0-9a-f]{6}$/i.test(color || '') ? `${color}1f` : '#f1f5f9');

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
  up: 'M12 19V5m0 0l-6 6m6-6l6 6',
  down: 'M12 5v14m0 0l6-6m-6 6l-6-6',
  wallet: 'M3 7a2 2 0 012-2h13a1 1 0 011 1v2M3 7v10a2 2 0 002 2h14a1 1 0 001-1v-3M3 7h16a1 1 0 011 1v3h-4a2 2 0 100 4h4',
};

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-36 bg-slate-200 rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => <div key={i} className="h-44 bg-slate-200 rounded-2xl" />)}
      </div>
    </div>
  );
}

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data.accounts);
      setTotalBalance(res.data.totalBalance || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data) => {
    if (editing) {
      await api.put(`/accounts/${editing._id}`, data);
    } else {
      await api.post('/accounts', data);
    }
    setEditing(null);
    await load();
  };

  const handleDelete = async (a) => {
    if (!window.confirm(`Delete "${a.name}"?`)) return;
    try {
      await api.delete(`/accounts/${a._id}`);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (a) => { setEditing(a); setModalOpen(true); };

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accounts</h1>
          <p className="text-sm text-slate-500">Where your money lives</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition"
        >
          <Icon d={ICONS.plus} />
          Add Account
        </button>
      </div>

      {loading ? (
        <Skeleton />
      ) : error ? (
        <div className="max-w-md mx-auto mt-10 bg-white rounded-2xl border border-rose-100 shadow-sm p-8 text-center">
          <p className="font-semibold text-slate-900">Couldn’t load accounts</p>
          <p className="text-sm text-rose-600 mt-1">{error}</p>
          <button
            onClick={load}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {/* Total balance hero */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-6 sm:p-8 text-white shadow-lg mb-6">
            <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10" />
            <div className="absolute right-16 -bottom-16 w-40 h-40 rounded-full bg-white/10" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-indigo-100">Total balance (all accounts)</p>
                <p className="mt-1 text-3xl sm:text-4xl font-bold tracking-tight truncate">{rupee(totalBalance)}</p>
                <p className="mt-3 text-xs text-indigo-100">
                  Across {accounts.length} account{accounts.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="shrink-0 w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
                <Icon d={ICONS.wallet} className="w-6 h-6" />
              </div>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <div className="text-4xl mb-2">🏦</div>
              <p className="font-semibold text-slate-900">No accounts yet</p>
              <p className="text-sm text-slate-500 mt-1">Add a cash, bank or wallet account to start tracking balances.</p>
              <button
                onClick={openAdd}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
              >
                <Icon d={ICONS.plus} />
                Add Account
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((a) => {
                const change = (Number(a.balance) || 0) - (Number(a.openingBalance) || 0);
                const typeLabel = (a.type || 'other').replace('_', ' ');
                return (
                  <div
                    key={a._id}
                    className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                  >
                    <div className="h-1.5" style={{ backgroundColor: a.color || '#94a3b8' }} />
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                            style={{ backgroundColor: tint(a.color) }}
                          >
                            {TYPE_ICONS[a.type] || TYPE_ICONS.other}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-slate-900 truncate">{a.name}</h3>
                            <p className="text-xs text-slate-500 capitalize">
                              {typeLabel} · {a.transactionCount ?? 0} transaction{a.transactionCount === 1 ? '' : 's'}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 -mr-1.5 -mt-1.5">
                          <button
                            onClick={() => openEdit(a)}
                            aria-label={`Edit ${a.name}`}
                            title="Edit"
                            className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                          >
                            <Icon d={ICONS.edit} />
                          </button>
                          <button
                            onClick={() => handleDelete(a)}
                            aria-label={`Delete ${a.name}`}
                            title="Delete"
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Icon d={ICONS.trash} />
                          </button>
                        </div>
                      </div>

                      <p className={`mt-5 text-2xl font-bold truncate ${a.balance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {rupee(a.balance)}
                      </p>

                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Opening: {rupee(a.openingBalance)}</span>
                        {change !== 0 && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                              change > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            <Icon d={change > 0 ? ICONS.up : ICONS.down} className="w-3 h-3" />
                            {rupee(Math.abs(change))}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <AccountModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        initial={editing}
      />
    </Layout>
  );
}