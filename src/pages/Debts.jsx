import { useCallback, useEffect, useState } from 'react';
import Layout from '../layouts/Layout';
import DebtModal from '../components/DebtModal';
import api from '../services/api';

const rupee = (n) => `${Number(n) < 0 ? '-' : ''}₹${Math.abs(Number(n) || 0).toLocaleString('en-IN')}`;
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

// Overdue only once the due DAY has passed (the old check flagged debts due today
// as overdue after midnight).
const isOverdue = (d) => {
  if (!d.dueDate || d.status === 'settled') return false;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return new Date(d.dueDate) < startOfToday;
};

const AVATAR_COLORS = ['bg-indigo-100 text-indigo-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700', 'bg-violet-100 text-violet-700', 'bg-cyan-100 text-cyan-700'];
const avatarColor = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

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
  check: 'M5 13l4 4L19 7',
  lent: 'M7 17L17 7m0 0H8m9 0v9',
  borrowed: 'M17 7L7 17m0 0h9m-9 0V8',
  scale: 'M12 4v16M5 8l-2 6a3 3 0 006 0L7 8m10 0l-2 6a3 3 0 006 0l-2-6M5 8h14',
  inbox: 'M3 13l3-8h12l3 8M3 13v5a2 2 0 002 2h14a2 2 0 002-2v-5M3 13h5l1 3h6l1-3h5',
};

const TONES = {
  green: 'bg-emerald-50 text-emerald-600',
  red: 'bg-rose-50 text-rose-600',
  blue: 'bg-indigo-50 text-indigo-600',
};

function Stat({ title, value, tone, icon, hint }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${TONES[tone]}`}>
        <Icon d={ICONS[icon]} className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
        <p className="mt-0.5 text-xl font-bold text-slate-900 truncate" title={rupee(value)}>{rupee(value)}</p>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

// Segmented control (replaces the two plain dropdowns)
function Segmented({ label, value, onChange, options }) {
  return (
    <div>
      <span className="block text-xs font-medium text-slate-500 mb-1.5">{label}</span>
      <div className="inline-flex rounded-lg bg-slate-100 p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              value === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="animate-pulse divide-y divide-slate-100">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="w-9 h-9 rounded-full bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/4 bg-slate-200 rounded" />
            <div className="h-3 w-1/3 bg-slate-100 rounded" />
          </div>
          <div className="h-4 w-20 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function Debts() {
  const [debts, setDebts] = useState([]);
  const [summary, setSummary] = useState({ totalLent: 0, totalBorrowed: 0, net: 0, pendingCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ direction: '', status: 'pending' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.direction) params.direction = filters.direction;
      if (filters.status) params.status = filters.status;

      const [listRes, sumRes] = await Promise.all([
        api.get('/debts', { params }),
        api.get('/debts/summary'),
      ]);
      setDebts(listRes.data.debts);
      setSummary({ totalLent: 0, totalBorrowed: 0, net: 0, pendingCount: 0, ...sumRes.data });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load debts');
    } finally {
      setLoading(false);
    }
  }, [filters.direction, filters.status]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data) => {
    if (editing) {
      await api.put(`/debts/${editing._id}`, data);
    } else {
      await api.post('/debts', data);
    }
    setEditing(null);
    await load();
  };

  const handleSettle = async (id) => {
    if (!window.confirm('Mark this debt as settled (repaid)?')) return;
    try {
      await api.put(`/debts/${id}/settle`);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to settle');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this debt record?')) return;
    try {
      await api.delete(`/debts/${id}`);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (d) => { setEditing(d); setModalOpen(true); };

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Debts</h1>
          <p className="text-sm text-slate-500">
            {summary.pendingCount} pending {summary.pendingCount === 1 ? 'record' : 'records'}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition"
        >
          <Icon d={ICONS.plus} />
          Add Debt
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Stat title="Money Lent (pending)" value={summary.totalLent} tone="green" icon="lent" hint="They owe you" />
        <Stat title="Money Borrowed (pending)" value={summary.totalBorrowed} tone="red" icon="borrowed" hint="You owe them" />
        <Stat title="Net Position" value={summary.net} tone="blue" icon="scale" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6 flex flex-wrap gap-x-8 gap-y-4">
        <Segmented
          label="Status"
          value={filters.status}
          onChange={(status) => setFilters((f) => ({ ...f, status }))}
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'settled', label: 'Settled' },
            { value: '', label: 'All' },
          ]}
        />
        <Segmented
          label="Direction"
          value={filters.direction}
          onChange={(direction) => setFilters((f) => ({ ...f, direction }))}
          options={[
            { value: '', label: 'All' },
            { value: 'lent', label: 'Lent' },
            { value: 'borrowed', label: 'Borrowed' },
          ]}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <SkeletonRows />
        ) : error ? (
          <div className="p-10 text-center">
            <p className="font-semibold text-slate-900">Couldn’t load debts</p>
            <p className="text-sm text-rose-600 mt-1">{error}</p>
            <button
              onClick={load}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
            >
              Try again
            </button>
          </div>
        ) : debts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Icon d={ICONS.inbox} className="w-6 h-6" />
            </div>
            <p className="font-semibold text-slate-900">No debts found</p>
            <p className="text-sm text-slate-500 mt-1">Try a different filter, or add a new record.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Person</th>
                  <th className="px-3 py-3">Direction</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3 hidden md:table-cell">Date</th>
                  <th className="px-3 py-3">Due</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 hidden lg:table-cell">Note</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {debts.map((d) => {
                  const lent = d.direction === 'lent';
                  const overdue = isOverdue(d);
                  const settled = d.status === 'settled';
                  return (
                    <tr key={d._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${avatarColor(d.personName)}`}>
                            {(d.personName || '?').trim().charAt(0).toUpperCase()}
                          </span>
                          <span className="font-medium text-slate-900">{d.personName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${
                          lent ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          <Icon d={lent ? ICONS.lent : ICONS.borrowed} className="w-3 h-3" />
                          {lent ? 'They owe me' : 'I owe them'}
                        </span>
                      </td>
                      <td className={`px-3 py-3 text-right font-semibold whitespace-nowrap ${
                        settled ? 'text-slate-400' : lent ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {rupee(d.amount)}
                      </td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap hidden md:table-cell">{formatDate(d.date)}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {d.dueDate ? (
                          <span className={overdue ? 'text-rose-600 font-medium' : 'text-slate-600'}>
                            {formatDate(d.dueDate)}
                            {overdue && (
                              <span className="ml-1.5 rounded-full bg-rose-50 px-2 py-0.5 text-xs">Overdue</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                          settled ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-500 hidden lg:table-cell max-w-xs truncate" title={d.note || ''}>
                        {d.note || '-'}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        {d.status === 'pending' && (
                          <button
                            onClick={() => handleSettle(d._id)}
                            title="Mark as settled"
                            className="mr-1 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
                          >
                            <Icon d={ICONS.check} className="w-3.5 h-3.5" />
                            Settle
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(d)}
                          aria-label="Edit debt"
                          title="Edit"
                          className="inline-flex p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <Icon d={ICONS.edit} />
                        </button>
                        <button
                          onClick={() => handleDelete(d._id)}
                          aria-label="Delete debt"
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

      <DebtModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        initial={editing}
      />
    </Layout>
  );
}