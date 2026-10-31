export default function StatCard({ title, value, color = 'blue', prefix = '₹' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <p className="text-sm opacity-80">{title}</p>
      <p className="text-2xl font-bold mt-1">
        {prefix}{Number(value).toLocaleString('en-IN')}
      </p>
    </div>
  );
}