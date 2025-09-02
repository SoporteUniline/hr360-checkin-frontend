export const StatCard = ({ title, count }) => {
  return (
    <div
      className={`p-6 rounded-2xl shadow-md bg-white flex flex-col items-center justify-center`}
    >
      <p className={`text-4xl font-bold text-slate-700`}>{count || 0}</p>
      <p className="text-center mt-2 text-sm font-medium text-gray-600">
        {title}
      </p>
    </div>
  );
};
