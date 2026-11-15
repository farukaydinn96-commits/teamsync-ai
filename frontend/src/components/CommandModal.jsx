export default function CommandModal({
  isOpen,
  onClose,
  setActiveTab,
  triggerQuickCommand
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-24 p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            ⚡ Quick Command Palette (⌘K)
          </span>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            ESC
          </button>
        </div>
        <div className="p-2 space-y-1">
          <button
            onClick={() => { setActiveTab('chat'); onClose(); }}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-sm flex items-center justify-between cursor-pointer"
          >
            <span>💬 Switch to Chat View</span>
            <span className="text-xs text-slate-500">Tab</span>
          </button>
          <button
            onClick={() => { setActiveTab('board'); onClose(); }}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-sm flex items-center justify-between cursor-pointer"
          >
            <span>📋 Switch to Kanban Board</span>
            <span className="text-xs text-slate-500">Tab</span>
          </button>
          <button
            onClick={() => { setActiveTab('docs'); onClose(); }}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-sm flex items-center justify-between cursor-pointer"
          >
            <span>📝 Collaborative Docs & Code Editor</span>
            <span className="text-xs text-slate-500">Live Wiki</span>
          </button>
          <button
            onClick={() => { setActiveTab('analytics'); onClose(); }}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-sm flex items-center justify-between cursor-pointer"
          >
            <span>📊 Sprint Analytics & Report Export</span>
            <span className="text-xs text-slate-500">Report</span>
          </button>
          <div className="border-t border-slate-800 my-1"></div>
          <button
            onClick={() => { triggerQuickCommand('/plan OAuth2 & RBAC Microservice Architecture'); onClose(); }}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-950/50 text-emerald-300 text-sm flex items-center justify-between cursor-pointer"
          >
            <span>🚀 AI Sprint Planner (Run /plan)</span>
            <span className="text-xs text-emerald-400">Automation</span>
          </button>
          <button
            onClick={() => { triggerQuickCommand('/poll State Management Choice? | Redux Toolkit | Zustand | React Context'); onClose(); }}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-purple-950/50 text-purple-300 text-sm flex items-center justify-between cursor-pointer"
          >
            <span>📊 Start Technical Poll (/poll)</span>
            <span className="text-xs text-purple-400">Voting</span>
          </button>
        </div>
      </div>
    </div>
  );
}
