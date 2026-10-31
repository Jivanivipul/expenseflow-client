import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-white shadow px-6 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="text-xl font-bold text-blue-600">ExpenseFlow</Link>
        <div className="flex gap-4 items-center text-sm">
          <Link to="/dashboard" className="hover:text-blue-600">Dashboard</Link>
          <Link to="/transactions" className="hover:text-blue-600">Transactions</Link>
          <Link to="/budgets" className="hover:text-blue-600">Budgets</Link>
          <Link to="/reports" className="hover:text-blue-600">Reports</Link>
          <span className="text-gray-500">Hi, {user?.name}</span>
          <button onClick={handleLogout} className="text-red-600 hover:underline">Logout</button>
        </div>
      </nav>
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">{children}</main>
    </div>
  );
}