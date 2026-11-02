import { useCallback, useEffect, useRef, useState } from 'react';
import Layout from '../layouts/Layout';
import api from '../services/api';

// Local date (YYYY-MM-DD). toISOString() is UTC and shows "yesterday"
// before 5:30 AM in India.
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const rupee = (n) => `${Number(n) < 0 ? '-' : ''}₹${Math.abs(Number(n) || 0).toLocaleString('en-IN')}`;
const shortDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const CAT_COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

const PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const Icon = ({ d, className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={d} />
  </svg>
);
const ICONS = {
  download: 'M12 4v11m0 0l-4-4m4 4l4-4M5 20h14',
  income: 'M12 19V5m0 0l-6 6m6-6l6 6',
  expense: 'M12 5v14m0 0l6-6m-6 6l-6-6',
  savings: 'M12 3v18M17 7.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 2.8 5 3.5 5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.1-5-3',
  trend: 'M3 17l6-6 4 4 8-8m0 0h-5m5 0v5',
  inbox: 'M3 13l3-8h12l3 8M3 13v5a2 2 0 002 2h14a2 2 0 002-2v-5M3 13h5l1 3h6l1-3h5',
};

const inputCls =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition';

function Segmented({ value, onChange, options }) {
  return (
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
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

const TONES = {
  green: 'bg-emerald-50 text-emerald-600',
  red: 'bg-rose-50 text-rose-600',
  blue: 'bg-indigo-50 text-indigo-600',
  orange: 'bg-orange-50 text-orange-600',
  purple: 'bg-violet-50 text-violet-600',
};

function Stat({ title, value, tone, icon, valueClass = 'text-slate-900' }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${TONES[tone]}`}>
        <Icon d={ICONS[icon]} className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
        <p className={`mt-0.5 text-xl font-bold truncate ${valueClass}`} title={String(value)}>{value}</p>
      </div>
    </div>
  );
}

function Card({ title, right, children }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <header className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {right}
      </header>
      {children}
    </section>
  );
}

const Empty = ({ children }) => (
  <div className="py-10 flex flex-col items-center text-sm text-slate-400">
    <Icon d={ICONS.inbox} className="w-8 h-8 mb-2" />
    {children}
  </div>
);

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 bg-slate-200 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 bg-slate-200 rounded-2xl" />
        <div className="h-80 bg-slate-200 rounded-2xl" />
      </div>
    </div>
  );
}

export default function Reports() {
  const [mode, setMode] = useState('preset'); // 'preset' | 'custom'
  const [period, setPeriod] = useState('monthly');
  const [date, setDate] = useState(today());
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState('');

  const reqId = useRef(0);

  const customValid = Boolean(fromDate && toDate && fromDate <= toDate);
  const canQuery = mode === 'preset' ? Boolean(date) : customValid;

  const getParams = useCallback(
    () => (mode === 'custom' ? { from: fromDate, to: toDate } : { period, date }),
    [mode, fromDate, toDate, period, date]
  );

  const load = useCallback(async () => {
    if (!canQuery) return;
    const id = ++reqId.current; // ignore out-of-order responses when inputs change quickly
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/reports', { params: getParams() });
      if (id === reqId.current) setReport(res.data);
    } catch (err) {
      if (id === reqId.current) setError(err.response?.data?.message || 'Failed to load report');
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [canQuery, getParams]);

  useEffect(() => { load(); }, [load]);

  const download = async (kind) => {
    if (!canQuery) return;
    setDownloading(kind);
    try {
      const url = kind === 'csv' ? '/reports/export' : '/reports/export-pdf';
      const res = await api.get(url, { params: getParams(), responseType: 'blob' });
      const blob = new Blob([res.data], { type: kind === 'csv' ? 'text/csv' : 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const tag = mode === 'custom' ? `${fromDate}_to_${toDate}` : `${period}_${date}`;
      link.download = `report-${tag}.${kind}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch {
      alert(`Failed to download ${kind.toUpperCase()}`);
    } finally {
      setDownloading('');
    }
  };

  const formatRange = () => {
    if (!report?.range) return '';
    const e = new Date(report.range.end);
    e.setDate(e.getDate() - 1); // end is exclusive
    return `${shortDate(report.range.start)} → ${shortDate(e)}`;
  };

  const categories = report?.categories || [];
  const transactions = report?.transactions || [];
  const savings = Number(report?.savings) || 0;
  const change = Number(report?.changePercent) || 0;

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">
            {report && !error ? formatRange() : 'Analyse your income and spending'}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => download('csv')}
            disabled={!canQuery || downloading === 'csv'}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Icon d={ICONS.download} />
            {downloading === 'csv' ? 'Downloading…' : 'CSV'}
          </button>
          <button
            onClick={() => download('pdf')}
            disabled={!canQuery || downloading === 'pdf'}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Icon d={ICONS.download} />
            {downloading === 'pdf' ? 'Downloading…' : 'PDF'}
          </button>
        </div>
      </div>

      {/* Range controls */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <div>
            <span className="block text-xs font-medium text-slate-500 mb-1.5">Range</span>
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: 'preset', label: 'Preset period' },
                { value: 'custom', label: 'Custom range' },
              ]}
            />
          </div>

          {mode === 'preset' ? (
            <>
              <div>
                <span className="block text-xs font-medium text-slate-500 mb-1.5">Period</span>
                <Segmented value={period} onChange={setPeriod} options={PERIODS} />
              </div>
              <Field label="Any date in period">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </Field>
            </>
          ) : (
            <>
              <Field label="From">
                <input type="date" value={fromDate} max={toDate} onChange={(e) => setFromDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="To">
                <input type="date" value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} className={inputCls} />
              </Field>
            </>
          )}
        </div>
        {mode === 'custom' && !customValid && (
          <p className="mt-3 text-sm text-amber-600">Pick a valid range — “From” must be on or before “To”.</p>
        )}
      </div>

      {loading ? (
        <Skeleton />
      ) : error ? (
        <div className="max-w-md mx-auto mt-6 bg-white rounded-2xl border border-rose-100 shadow-sm p-8 text-center">
          <p className="font-semibold text-slate-900">Couldn’t load the report</p>
          <p className="text-sm text-rose-600 mt-1">{error}</p>
          <button
            onClick={load}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
          >
            Try again
          </button>
        </div>
      ) : report ? (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Stat title="Income" value={rupee(report.income)} tone="green" icon="income" />
            <Stat title="Expenses" value={rupee(report.expense)} tone="red" icon="expense" />
            <Stat
              title="Net Savings"
              value={rupee(savings)}
              tone={savings >= 0 ? 'blue' : 'orange'}
              icon="savings"
              valueClass={savings >= 0 ? 'text-slate-900' : 'text-orange-600'}
            />
            <Stat
              title="Change vs previous"
              value={`${change > 0 ? '+' : ''}${change}%`}
              tone="purple"
              icon="trend"
              valueClass={change > 0 ? 'text-rose-600' : change < 0 ? 'text-emerald-600' : 'text-slate-900'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category breakdown */}
            <Card title="Category breakdown" right={<span className="text-xs text-slate-400">Expenses</span>}>
              {categories.length === 0 ? (
                <Empty>No expenses in this period.</Empty>
              ) : (
                <ul className="space-y-4">
                  {categories.map((c, i) => {
                    const pct = report.expense ? Math.round((c.total / report.expense) * 100) : 0;
                    const color = CAT_COLORS[i % CAT_COLORS.length];
                    return (
                      <li key={c.category}>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="flex items-center gap-2 font-medium text-slate-800 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="truncate">{c.category}</span>
                          </span>
                          <span className="text-slate-500 whitespace-nowrap pl-3">
                            <span className="font-semibold text-slate-900">{rupee(c.total)}</span> · {pct}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            {/* Transactions */}
            <Card
              title="Transactions"
              right={<span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{report.count ?? transactions.length}</span>}
            >
              {transactions.length === 0 ? (
                <Empty>No transactions in this period.</Empty>
              ) : (
                <div className="max-h-96 overflow-y-auto -mx-5 px-5">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr className="border-b border-slate-100">
                        <th className="py-2">Date</th>
                        <th className="py-2">Category</th>
                        <th className="py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.map((t) => {
                        const income = t.type === 'income';
                        return (
                          <tr key={t._id}>
                            <td className="py-2.5 text-slate-500 whitespace-nowrap">{shortDate(t.date)}</td>
                            <td className="py-2.5 font-medium text-slate-900">{t.category}</td>
                            <td className={`py-2.5 text-right font-semibold whitespace-nowrap ${income ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {income ? '+' : '-'}{rupee(t.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      ) : null}
    </Layout>
  );
}