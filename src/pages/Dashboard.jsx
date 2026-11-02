import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import Layout from '../layouts/Layout';
import api from '../services/api';

const PIE_COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const signedRupee = (n) => `${Number(n) < 0 ? '-' : ''}₹${Math.abs(Number(n) || 0).toLocaleString('en-IN')}`;
const compact = (v) => {
  const n = Math.abs(v);
  if (n >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `${(v / 1e3).toFixed(0)}k`;
  return `${v}`;
};

/* ---------- tiny inline icons (no extra dependency) ---------- */
const Icon = ({ d, className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={d} />
  </svg>
);
const ICONS = {
  income: 'M12 19V5m0 0l-6 6m6-6l6 6',
  expense: 'M12 5v14m0 0l6-6m-6 6l-6-6',
  wallet: 'M3 7a2 2 0 012-2h13a1 1 0 011 1v2M3 7v10a2 2 0 002 2h14a1 1 0 001-1v-3M3 7h16a1 1 0 011 1v3h-4a2 2 0 100 4h4',
  savings: 'M12 3v18M17 7.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 2.8 5 3.5 5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.1-5-3',
  lent: 'M7 17L17 7m0 0H8m9 0v9',
  borrowed: 'M17 7L7 17m0 0h9m-9 0V8',
  scale: 'M12 4v16M5 8l-2 6a3 3 0 006 0L7 8m10 0l-2 6a3 3 0 006 0l-2-6M5 8h14',
};

const TONES = {
  green: { chip: 'bg-emerald-50 text-emerald-600', value: 'text-slate-900' },
  red: { chip: 'bg-rose-50 text-rose-600', value: 'text-slate-900' },
  blue: { chip: 'bg-indigo-50 text-indigo-600', value: 'text-slate-900' },
  purple: { chip: 'bg-violet-50 text-violet-600', value: 'text-slate-900' },
};

function Stat({ title, value, tone = 'blue', icon, signed = false }) {
  const t = TONES[tone];
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${t.chip}`}>
        <Icon d={ICONS[icon]} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
        <p className={`mt-0.5 text-xl font-bold truncate ${t.value}`} title={signed ? signedRupee(value) : rupee(value)}>
          {signed ? signedRupee(value) : rupee(value)}
        </p>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children, className = '' }) {
  return (
    <section className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 ${className}`}>
      <header className="mb-4">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

const Empty = ({ children }) => (
  <div className="h-40 flex items-center justify-center text-sm text-slate-400">{children}</div>
);

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white border border-slate-100 shadow-lg px-3 py-2 text-xs">
      {label && <p className="font-semibold text-slate-700 mb-1">{label}</p>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-slate-600">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          <span>{p.name}:</span>
          <span className="font-semibold text-slate-900">{rupee(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 bg-slate-200 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 bg-slate-200 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 h-80 bg-slate-200 rounded-2xl" />
        <div className="lg:col-span-2 h-80 bg-slate-200 rounded-2xl" />
      </div>
      <div className="h-64 bg-slate-200 rounded-2xl" />
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [debtSummary, setDebtSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const summaryRes = await api.get('/dashboard/summary');
      setData(summaryRes.data);
      try {
        const debtRes = await api.get('/debts/summary');
        setDebtSummary(debtRes.data);
      } catch {
        setDebtSummary({ totalLent: 0, totalBorrowed: 0, net: 0 });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const categoryTotal = useMemo(
    () => (data?.categoryBreakdown || []).reduce((s, c) => s + Number(c.total || 0), 0),
    [data]
  );

  if (loading) return <Layout><Skeleton /></Layout>;

  if (error) {
    return (
      <Layout>
        <div className="max-w-md mx-auto mt-16 bg-white rounded-2xl border border-rose-100 shadow-sm p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
            <Icon d="M12 8v5m0 3h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
          </div>
          <p className="font-semibold text-slate-900">Couldn’t load your dashboard</p>
          <p className="text-sm text-slate-500 mt-1">{error}</p>
          <button
            onClick={load}
            className="mt-5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </Layout>
    );
  }

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">{today}</p>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat title="Total Income" value={data.totalIncome} tone="green" icon="income" />
        <Stat title="Total Expenses" value={data.totalExpenses} tone="red" icon="expense" />
        <Stat title="Balance" value={data.balance} tone="blue" icon="wallet" signed />
        <Stat title="Monthly Savings" value={data.monthlySavings} tone="purple" icon="savings" signed />
      </div>

      {/* Debts */}
      {debtSummary && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Lending &amp; borrowing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat title="Money Lent (pending)" value={debtSummary.totalLent} tone="green" icon="lent" />
            <Stat title="Money Borrowed (pending)" value={debtSummary.totalBorrowed} tone="red" icon="borrowed" />
            <Stat title="Net Position" value={debtSummary.net} tone="blue" icon="scale" signed />
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <Card title="Income vs Expenses" subtitle="Last 6 months" className="lg:col-span-3">
          {data.chartData.length === 0 ? (
            <Empty>No data yet.</Empty>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.chartData} barGap={6} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={compact} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
                <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Expense by Category" subtitle="Share of total spending" className="lg:col-span-2">
          {data.categoryBreakdown.length === 0 ? (
            <Empty>No expenses yet.</Empty>
          ) : (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.categoryBreakdown}
                      dataKey="total"
                      nameKey="category"
                      innerRadius={62}
                      outerRadius={90}
                      paddingAngle={3}
                      cornerRadius={4}
                      stroke="none"
                    >
                      {data.categoryBreakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[11px] uppercase tracking-wide text-slate-500">Total</span>
                  <span className="text-base font-bold text-slate-900">{rupee(categoryTotal)}</span>
                </div>
              </div>

              <ul className="mt-3 space-y-2 max-h-40 overflow-y-auto pr-1">
                {data.categoryBreakdown.map((c, i) => {
                  const pct = categoryTotal ? Math.round((Number(c.total) / categoryTotal) * 100) : 0;
                  return (
                    <li key={c.category} className="flex items-center gap-2 text-sm">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="flex-1 truncate text-slate-700">{c.category}</span>
                      <span className="text-slate-400 text-xs">{pct}%</span>
                      <span className="font-medium text-slate-900 w-24 text-right">{rupee(c.total)}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>
      </div>

      {/* Recent transactions */}
      <Card title="Recent Transactions">
        {data.recentTransactions.length === 0 ? (
          <Empty>No transactions yet.</Empty>
        ) : (
          <ul className="divide-y divide-slate-100 -my-2">
            {data.recentTransactions.map((t) => {
              const income = t.type === 'income';
              return (
                <li key={t._id} className="flex items-center gap-4 py-3">
                  <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${income ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <Icon d={income ? ICONS.income : ICONS.expense} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 truncate">{t.category}</p>
                    <p className="text-xs text-slate-500 truncate">{t.description || 'No description'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-semibold ${income ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {income ? '+' : '-'}{rupee(t.amount)}
                    </p>
                    <p className="text-xs text-slate-400">{new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </Layout>
  );
}