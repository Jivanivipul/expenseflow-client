import { useEffect, useState } from 'react';
import Layout from '../layouts/Layout';
import DebtModal from '../components/DebtModal';
import api from '../services/api';

export default function Debts() {
    const [debts, setDebts] = useState([]);
    const [summary, setSummary] = useState({
        totalLent: 0,
        totalBorrowed: 0,
        net: 0,
        pendingCount: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [filters, setFilters] = useState({
        direction: '',
        status: 'pending',
    });

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const load = async () => {
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
            setSummary(sumRes.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load debts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [filters.direction, filters.status]);

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

    const openAdd = () => {
        setEditing(null);
        setModalOpen(true);
    };
    const openEdit = (d) => {
        setEditing(d);
        setModalOpen(true);
    };

    const isOverdue = (d) => {
        if (!d.dueDate || d.status === 'settled') return false;
        return new Date(d.dueDate) < new Date();
    };

    const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');

    return (
        <Layout>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h1 className="text-2xl font-bold">Debts</h1>
                <button
                    onClick={openAdd}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    + Add Debt
                </button>
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-700">Money Lent (pending)</p>
                    <p className="text-2xl font-bold text-green-700">
                        ₹{summary.totalLent.toLocaleString('en-IN')}
                    </p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-700">Money Borrowed (pending)</p>
                    <p className="text-2xl font-bold text-red-700">
                        ₹{summary.totalBorrowed.toLocaleString('en-IN')}
                    </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-700">Net Position</p>
                    <p className="text-2xl font-bold text-blue-700">
                        ₹{summary.net.toLocaleString('en-IN')}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <form className="bg-white p-4 rounded shadow mb-4 flex flex-wrap gap-3 items-end">
                <div>
                    <label className="block text-sm font-medium mb-1">Direction</label>
                    <select
                        value={filters.direction}
                        onChange={(e) =>
                            setFilters({ ...filters, direction: e.target.value })
                        }
                        className="border rounded p-2"
                    >
                        <option value="">All</option>
                        <option value="lent">Lent (they owe me)</option>
                        <option value="borrowed">Borrowed (I owe them)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                        value={filters.status}
                        onChange={(e) =>
                            setFilters({ ...filters, status: e.target.value })
                        }
                        className="border rounded p-2"
                    >
                        <option value="">All</option>
                        <option value="pending">Pending</option>
                        <option value="settled">Settled</option>
                    </select>
                </div>
            </form>

            {/* Table */}
            <div className="bg-white rounded shadow overflow-x-auto">
                {loading ? (
                    <p className="p-4">Loading...</p>
                ) : error ? (
                    <p className="p-4 text-red-600">{error}</p>
                ) : debts.length === 0 ? (
                    <p className="p-4 text-gray-500">No debts found.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-gray-600">
                            <tr>
                                <th className="p-3">Person</th>
                                <th className="p-3">Direction</th>
                                <th className="p-3">Amount</th>
                                <th className="p-3">Date</th>
                                <th className="p-3">Due</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Note</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {debts.map((d) => (
                                <tr key={d._id} className="border-t hover:bg-gray-50">
                                    <td className="p-3 font-medium">{d.personName}</td>
                                    <td className="p-3">
                                        <span
                                            className={`px-2 py-0.5 rounded text-xs ${d.direction === 'lent'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                                }`}
                                        >
                                            {d.direction === 'lent' ? 'They owe me' : 'I owe them'}
                                        </span>
                                    </td>
                                    <td className="p-3 font-medium">
                                        ₹{d.amount.toLocaleString('en-IN')}
                                    </td>
                                    <td className="p-3">{formatDate(d.date)}</td>
                                    <td className="p-3">
                                        {d.dueDate ? (
                                            <span
                                                className={
                                                    isOverdue(d) ? 'text-red-600 font-medium' : ''
                                                }
                                            >
                                                {formatDate(d.dueDate)}
                                                {isOverdue(d) && ' (overdue)'}
                                            </span>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td className="p-3">
                                        <span
                                            className={`px-2 py-0.5 rounded text-xs ${d.status === 'settled'
                                                    ? 'bg-gray-100 text-gray-700'
                                                    : 'bg-amber-100 text-amber-700'
                                                }`}
                                        >
                                            {d.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-gray-600">{d.note || '-'}</td>
                                    <td className="p-3 text-right whitespace-nowrap">
                                        {d.status === 'pending' && (
                                            <button
                                                onClick={() => handleSettle(d._id)}
                                                className="text-green-600 hover:underline mr-3"
                                            >
                                                Settle
                                            </button>
                                        )}
                                        <button
                                            onClick={() => openEdit(d)}
                                            className="text-blue-600 hover:underline mr-3"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(d._id)}
                                            className="text-red-600 hover:underline"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <DebtModal
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