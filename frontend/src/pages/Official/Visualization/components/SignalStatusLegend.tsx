export default function SignalStatusLegend() {
  return (
    <div className="absolute bottom-6 left-5 z-10 bg-white/65 rounded-lg shadow-lg px-4 py-2.5 flex flex-row gap-3 items-center flex-wrap">
      <div className="text-sm font-semibold text-gray-900">Signal Status:</div>

      {/* Critical Alert */}
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-3 bg-red-500 rounded-sm" />
        <span className="text-xs text-gray-600 font-medium">Critical</span>
      </div>

      {/* User-Initiated Alert */}
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-3 bg-yellow-500 rounded-sm" />
        <span className="text-xs text-gray-600 font-medium">
          User-Initiated
        </span>
      </div>

      {/* Online/Dispatched */}
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-3 bg-green-500 rounded-sm" />
        <span className="text-xs text-gray-600 font-medium">Online</span>
      </div>

      {/* Offline */}
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-3 bg-gray-500 rounded-sm" />
        <span className="text-xs text-gray-600 font-medium">Offline</span>
      </div>
    </div>
  );
}
