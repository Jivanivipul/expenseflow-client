import { useEffect, useState } from 'react';
import Layout from '../layouts/Layout';
import api from '../services/api';

const today = () => new Date().toISOString().slice(0, 10);

export default function Reports() {
  const [mode, setMode] = useState('preset'); // 'preset' | 'custom'
  const [period, setPeriod] = useState('monthly'); // daily/weekly/monthly/yearly
  const [date, setDate] = useState(today());
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState('');

  // Compute the query params based on mode
  const getParams = () => {
    if (mode === 'custom') {
      return { from: fromDate, to: toDate };
    }
    return { period, date };
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/reports', { params: getParams() });
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, period, date, fromDate, toDate]);

  const download = async (kind) => {
    setDownloading(kind);
    try {
      const url = kind === 'csv' ? '/reports/export' : '/reports/export-pdf';
      const res = await api.get(url, {
        params: getParams(),
        responseType: 'blob',
      });
      const blob = new Blob([res.data], {
        type: kind === 'csv' ? 'text/csv' : 'application/pdf',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const tag =
        mode === 'custom'
          ? `${fromDate}_to_${toDate}`
          : `${period}_${date}`;
      link.download = `report-${tag}.${kind}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      alert(`Failed to download ${kind.toUpperCase()}`);
    } finally {
      setDownloading('');
    }
  };

  const formatRange = () => {
    if (!report) return '';
    const s = new Date(report.range.start).toLocaleDateString('en-IN');
    const e = new Date(report.range.end);
    e.setDate(e.getDate() - 1); // end is exclusive
    return `${s} → ${e.toLocaleDateString('en-IN')}`;
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4">Reports</h1>

      {/* Mode selector */}
      <div className="bg-white p-4 rounded shadow mb-4">
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setMode('preset')}
            className={`px-4 py-2 rounded text-sm font-medium ${
              mode === 'preset'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Preset periods
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`px-4 py-2 rounded text-sm font-medium ${
              mode === 'custom'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Custom date range
          </button>
        </div>

        {mode === 'preset' ? (
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="border rounded p-2"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Any date in period</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border rounded p-2"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">From</label>
              <input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="border rounded p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">To</label>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => setToDate(e.target.value)}
                className="border rounded p-2"
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => download('csv')}
            disabled={downloading === 'csv'}
            className="border border-blue-600 text-blue-600 px-4 py-2 rounded hover:bg-blue-50 disabled:opacity-50 text-sm"
          >
            {downloading === 'csv' ? 'Downloading...' : 'Download CSV'}
          </button>
          <button
            onClick={() => download('pdf')}
            disabled={downloading === 'pdf'}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {downloading === 'pdf' ? 'Downloading...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading report...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : report ? (
        <>
          <p className="text-sm text-gray-600 mb-3">
            Showing: <strong>{formatRange()}</strong>
          </p>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700">Income</p>
              <p className="text-2xl font-bold text-green-700">
                ₹{report.income.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">Expenses</p>
              <p className="text-2xl font-bold text-red-700">
                ₹{report.expense.toLocaleString('en-IN')}
              </p>
            </div>
            <div className={`rounded-lg p-4 border ${
              report.savings >= 0
                ? 'bg-blue-50 border-blue-200'
                : 'bg-orange-50 border-orange-200'
            }`}>
              <p className={`text-sm ${report.savings >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                Net Savings
              </p>
              <p className={`text-2xl font-bold ${report.savings >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                ₹{report.savings.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-700">Change vs previous</p>
              <p className={`text-2xl font-bold ${
                report.changePercent > 0 ? 'text-red-700'
                : report.changePercent < 0 ? 'text-green-700'
                : 'text-purple-700'
              }`}>
                {report.changePercent > 0 ? '+' : ''}{report.changePercent}%
              </p>
            </div>
          </div>

          {/* Category breakdown + transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded shadow">
              <h2 className="font-semibold mb-3">Category Breakdown (expenses)</h2>
              {report.categories.length === 0 ? (
                <p className="text-sm text-gray-500">No expenses in this period.</p>
              ) : (
                <ul className="space-y-2">
                  {report.categories.map((c) => {
                    const pct = report.expense
                      ? Math.round((c.total / report.expense) * 100)
                      : 0;
                    return (
                      <li key={c.category}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{c.category}</span>
                          <span className="text-gray-600">
                            ₹{c.total.toLocaleString('en-IN')} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="bg-white p-4 rounded shadow">
              <h2 className="font-semibold mb-3">Transactions ({report.count})</h2>
              {report.transactions.length === 0 ? (
                <p className="text-sm text-gray-500">No transactions in this period.</p>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-gray-500 border-b sticky top-0 bg-white">
                      <tr>
                        <th className="py-1">Date</th>
                        <th>Category</th>
                        <th className="text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.transactions.map((t) => (
                        <tr key={t._id} className="border-b last:border-0">
                          <td className="py-1">
                            {new Date(t.date).toLocaleDateString('en-IN')}
                          </td>
                          <td>{t.category}</td>
                          <td className={`text-right ${
                            t.type === 'income' ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </Layout>
  );
}