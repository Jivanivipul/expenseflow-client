import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import Layout from '../layouts/Layout';
import StatCard from '../components/StatCard';
import api from '../services/api';

const PIE_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [debtSummary, setDebtSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
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
    };
    load();
  }, []);

  if (loading) return <Layout><p className="p-4">Loading dashboard...</p></Layout>;
  if (error) return <Layout><p className="p-4 text-red-600">{error}</p></Layout>;

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Main stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Income" value={data.totalIncome} color="green" />
        <StatCard title="Total Expenses" value={data.totalExpenses} color="red" />
        <StatCard title="Balance" value={data.balance} color="blue" />
        <StatCard title="Monthly Savings" value={data.monthlySavings} color="purple" />
      </div>

      {/* Debt summary (new) */}
      {debtSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            title="Money Lent (pending)"
            value={debtSummary.totalLent}
            color="green"
          />
          <StatCard
            title="Money Borrowed (pending)"
            value={debtSummary.totalBorrowed}
            color="red"
          />
          <StatCard
            title="Net Position"
            value={debtSummary.net}
            color="blue"
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Income vs Expense bar chart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold mb-4">Income vs Expenses (last 6 months)</h2>
          {data.chartData.length === 0 ? (
            <p className="text-sm text-gray-500">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.chartData}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                <Legend />
                <Bar dataKey="income" fill="#10b981" name="Income" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#ef4444" name="Expense" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category pie chart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold mb-4">Expense by Category</h2>
          {data.categoryBreakdown.length === 0 ? (
            <p className="text-sm text-gray-500">No expenses yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.categoryBreakdown}
                  dataKey="total"
                  nameKey="category"
                  cx="50%" cy="50%" outerRadius={90}
                  label={(entry) => entry.category}
                >
                  {data.categoryBreakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="font-semibold mb-4">Recent Transactions</h2>
        {data.recentTransactions.length === 0 ? (
          <p className="text-sm text-gray-500">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 border-b">
                <tr>
                  <th className="py-2">Date</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTransactions.map((t) => (
                  <tr key={t._id} className="border-b last:border-0">
                    <td className="py-2">{new Date(t.date).toLocaleDateString('en-IN')}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-xs ${t.type === 'income'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                        }`}>
                        {t.type}
                      </span>
                    </td>
                    <td>{t.category}</td>
                    <td className="text-gray-600">{t.description || '-'}</td>
                    <td className={`text-right font-medium ${t.type === 'income' ? 'text-green-700' : 'text-red-700'
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
    </Layout>
  );
}