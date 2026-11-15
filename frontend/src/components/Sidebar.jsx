import { CHANNELS, DEMO_PROFILES, DEFAULT_TEAM_PRESENCE } from '../constants/workspaceConfig';
import { TRANSLATIONS } from '../constants/i18n';

export default function Sidebar({
  lang = 'EN',
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
  const t = TRANSLATIONS[lang] || TRANSLATIONS.EN;

  const formatTimer = (totalSec) => {
    const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const isTechLead = username === 'Faruk_Lead';

  const mergedPresence = () => {
    const map = new Map();
    DEFAULT_TEAM_PRESENCE.forEach((u) => map.set(u.username, { ...u, isSim: u.username !== 'Faruk_Lead' }));
    (onlineUsers || []).forEach((u) => {
      const name = typeof u === 'string' ? u : u.username;
      if (name) map.set(name, typeof u === 'object' ? u : { username: name, isFocusing: false });
    });
    map.set(username, { username, isFocusing: isFocusActive, isSim: false });
    return Array.from(map.values());
  };

  const activeTeamList = mergedPresence();

  return (
    <aside className="w-72 shrink-0 bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between overflow-y-auto">
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
            title="Command Palette (⌘K)"
          >
            ⌘K
          </button>
        </div>

        <div className="p-3.5 border-b border-slate-800/60">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 font-medium">{t.sprintProgress}</span>
            <span className="text-emerald-400 font-semibold">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 mt-1">
            <span>{doneCount} {t.completed}</span>
            <span>{totalTasks} {t.totalTasks}</span>
          </div>
        </div>

        <div className="p-3 border-b border-slate-800/60 bg-slate-900/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              🎯 {t.deepWorkTimer}
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
              {isFocusActive ? t.pauseSession : t.startFocus}
            </button>
            <button
              onClick={resetFocusTimer}
              className="px-2.5 py-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg border border-slate-800 cursor-pointer"
            >
              {t.reset}
            </button>
          </div>
        </div>

        <div className="p-3">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1.5">
            {t.workspaceChannels}
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
            ⚡ {t.aiAutomation}
          </p>
          <div className="space-y-1.5">
            <button
              onClick={() => triggerQuickCommand('/plan OAuth2 & RBAC Microservice Module')}
              className="w-full text-left text-xs bg-emerald-950/30 hover:bg-emerald-950/60 text-emerald-300 border border-emerald-500/20 px-3 py-2 rounded-xl transition cursor-pointer flex items-center justify-between"
            >
              <span>🚀 {t.aiSprintPlan}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200">{t.leadOnly}</span>
            </button>
            <button
              onClick={() => triggerQuickCommand('/poll Primary Database? | MongoDB Atlas | PostgreSQL | Redis')}
              className="w-full text-left text-xs bg-amber-950/30 hover:bg-amber-950/60 text-amber-300 border border-amber-500/20 px-3 py-2 rounded-xl transition cursor-pointer"
            >
              📊 {t.startLivePoll}
            </button>
            <button
              onClick={() => triggerQuickCommand('/ai Write an Express JWT RBAC workspaceGuard middleware.')}
              className="w-full text-left text-xs bg-purple-950/30 hover:bg-purple-950/60 text-purple-300 border border-purple-500/20 px-3 py-2 rounded-xl transition cursor-pointer"
            >
              💻 {t.generateRbacGuard}
            </button>
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-slate-800/80 bg-slate-900/30 space-y-2.5">
        <div>
          <p className="text-[11px] text-slate-500 mb-1">
            {t.activeTeam} ({activeTeamList.length} {t.online})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {activeTeamList.map((u, i) => {
              const name = u.username;
              const focusing = u.isFocusing;
              const isSim = name !== username && (name === 'Ece_Frontend' || name === 'Mert_Backend');
              return (
                <span key={i} className="text-[11px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${focusing ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                  {name}
                  {isSim && <span className="text-[9px] text-slate-500">(Sim)</span>}
                  {focusing && <span title="Deep Work Mode">🎯</span>}
                </span>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] text-slate-400">{t.rbacRoleSwitcher}</label>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${isTechLead ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-400'}`}>
              {isTechLead ? t.adminLead : t.developer}
            </span>
          </div>
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
        </div>
      </div>
    </aside>
  );
}
