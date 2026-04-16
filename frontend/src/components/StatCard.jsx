export default function StatCard({ title, value, subtitle, colorClass, icon: Icon }) {
  return (
    <div className={`p-6 rounded-3xl ${colorClass} bg-opacity-40 border border-white/60 shadow-sm backdrop-blur-md relative overflow-hidden group`}>
      <div className="relative z-10 flex flex-col h-full justify-between">
          <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{title}</h3>
              {Icon && <div className="p-2 rounded-xl bg-white/40"><Icon size={18} className="text-gray-700"/></div>}
          </div>
          <div>
            <p className="text-4xl font-bold text-gray-900 tracking-tight">{value}</p>
            {subtitle && <p className="text-sm text-gray-600 mt-2 font-medium">{subtitle}</p>}
          </div>
      </div>
      <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white opacity-20 group-hover:scale-110 transition-transform duration-500 ease-out"></div>
    </div>
  );
}
