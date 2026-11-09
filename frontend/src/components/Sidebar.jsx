import { CHANNELS, DEMO_PROFILES } from '../constants/workspaceConfig';

export default function Sidebar({
  currentRoom,
  setCurrentRoom,
  progressPercent,
  doneCount,
  totalTasks,
  focusSeconds,
  isFocusActive,
  toggleFocusTimer,
  resetFocusTimer,
  triggerQuickCommand,
  onlineUsers,
  username,
  setUsername,
  onOpenCommand
}) {
  const formatTimer = (totalSec) => {
    const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <aside className="w-72 bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between overflow-y-auto">
      <div>
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight">TeamSync AI</h1>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Workspace Pro
              </span>
            </div>
          </div>
          <button
            onClick={onOpenCommand}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 px-2 py-1 rounded-lg cursor-pointer transition"
            title="Komut Paleti"
          >
            ⌘K
          </button>
        </div>

        <div className="p-3.5 border-b border-slate-800/60">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 font-medium">Sprint İlerlemesi</span>
            <span className="text-emerald-400 font-semibold">%{progressPercent}</span>
          </div>
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 mt-1">
            <span>{doneCount} Bitti</span>
            <span>{totalTasks} Görev</span>
          </div>
        </div>

        <div className="p-3 border-b border-slate-800/60 bg-slate-900/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              🎯 Deep Work Sayacı
            </span>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${isFocusActive ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-900 text-slate-300'}`}>
              {formatTimer(focusSeconds)}
            </span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={toggleFocusTimer}
              className={`flex-1 text-xs py-1.5 rounded-lg font-medium cursor-pointer transition ${
                isFocusActive
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              {isFocusActive ? 'Duraklat' : 'Odaklan'}
            </button>
            <button
              onClick={resetFocusTimer}
              className="px-2.5 py-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg border border-slate-800 cursor-pointer"
            >
              Sıfırla
            </button>
          </div>
        </div>

        <div className="p-3">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1.5">
            Çalışma Kanalları
          </p>
          <div className="space-y-1">
            {CHANNELS.map((channel) => (
              <button
                key={channel.id}
                onClick={() => setCurrentRoom(channel.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition cursor-pointer ${
                  currentRoom === channel.id
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none opacity-70">#</span>
                  <span>{channel.name}</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  currentRoom === channel.id ? 'bg-white/20 text-white' : 'bg-slate-900 text-slate-500'
                }`}>
                  {channel.badge}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-3">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1.5">
            ⚡ Otomasyon & AI Araçları
          </p>
          <div className="space-y-1.5">
            <button
              onClick={() => triggerQuickCommand('/plan E-Ticaret Sepet ve Ödeme Modülü')}
              className="w-full text-left text-xs bg-emerald-950/30 hover:bg-emerald-950/60 text-emerald-300 border border-emerald-500/20 px-3 py-2 rounded-xl transition cursor-pointer"
            >
              🚀 AI Sprint Planla (/plan)
            </button>
            <button
              onClick={() => triggerQuickCommand('/poll Veritabanı Seçimi? | MongoDB | PostgreSQL | Redis')}
              className="w-full text-left text-xs bg-amber-950/30 hover:bg-amber-950/60 text-amber-300 border border-amber-500/20 px-3 py-2 rounded-xl transition cursor-pointer"
            >
              📊 Canlı Anket Başlat (/poll)
            </button>
            <button
              onClick={() => triggerQuickCommand('/ai Bu kanal için örnek bir Express.js middleware kod bloğu yaz.')}
              className="w-full text-left text-xs bg-purple-950/30 hover:bg-purple-950/60 text-purple-300 border border-purple-500/20 px-3 py-2 rounded-xl transition cursor-pointer"
            >
              💻 AI Kod Şablonu İste
            </button>
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-slate-800/80 bg-slate-900/30 space-y-2.5">
        <div>
          <p className="text-[11px] text-slate-500 mb-1">Aktif Takım ({onlineUsers.length || 1})</p>
          <div className="flex flex-wrap gap-1.5">
            {(onlineUsers.length ? onlineUsers : [{ username, isFocusing: isFocusActive }]).map((u, i) => {
              const name = typeof u === 'string' ? u : u.username;
              const focusing = typeof u === 'object' && u.isFocusing;
              return (
                <span key={i} className="text-[11px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${focusing ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                  {name}
                  {focusing && <span title="Odaklanıyor">🎯</span>}
                </span>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-[11px] text-slate-400 block mb-1">Hızlı Demo Rolü Seç (İK Testi)</label>
          <div className="flex gap-1 mb-2">
            {DEMO_PROFILES.map((prof) => (
              <button
                key={prof.name}
                onClick={() => setUsername(prof.name)}
                className={`flex-1 text-[10px] py-1 px-1.5 rounded-lg border truncate cursor-pointer transition ${
                  username === prof.name
                    ? 'bg-blue-600/30 border-blue-500 text-blue-200 font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {prof.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 focus-within:border-blue-500">
            <span className="text-xs">👤</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-transparent text-xs text-white outline-none w-full font-medium"
            />
          </div>
        </div>
      </div>
    </aside>
  );
}