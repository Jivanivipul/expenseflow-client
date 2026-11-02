import { useEffect, useState } from 'react';
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

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data.accounts);
      setTotalBalance(res.data.totalBalance);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (a) => {
    setEditing(a);
    setModalOpen(true);
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <button
          onClick={openAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Add Account
        </button>
      </div>

      {/* Total balance */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg p-6 mb-6 shadow">
        <p className="text-sm opacity-90">Total Balance (all accounts)</p>
        <p className="text-3xl font-bold mt-1">
          ₹{totalBalance.toLocaleString('en-IN')}
        </p>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : accounts.length === 0 ? (
        <div className="bg-white p-6 rounded shadow text-center text-gray-500">
          No accounts yet. Click "Add Account" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((a) => (
            <div
              key={a._id}
              className="bg-white rounded-lg shadow p-4 border-l-4"
              style={{ borderLeftColor: a.color }}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{TYPE_ICONS[a.type]}</span>
                    <h3 className="font-semibold text-lg">{a.name}</h3>
                  </div>
                  <p className="text-xs text-gray-500 capitalize mt-1">
                    {a.type.replace('_', ' ')} · {a.transactionCount} transactions
                  </p>
                </div>
              </div>

              <p
                className={`text-2xl font-bold mt-3 ${
                  a.balance < 0 ? 'text-red-600' : 'text-gray-800'
                }`}
              >
                ₹{a.balance.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Opening: ₹{a.openingBalance.toLocaleString('en-IN')}
              </p>

              <div className="flex justify-end gap-3 text-sm mt-3">
                <button onClick={() => openEdit(a)} className="text-blue-600 hover:underline">
                  Edit
                </button>
                <button onClick={() => handleDelete(a)} className="text-red-600 hover:underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AccountModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
        initial={editing}
      />
    </Layout>
  );
}