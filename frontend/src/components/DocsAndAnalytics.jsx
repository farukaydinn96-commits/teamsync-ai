export function DocsView({ currentRoom, sharedDoc, handleDocChange, docSaveStatus }) {
  return (
    <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden">
      <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">
            📝 #{currentRoom} — Live Collaborative Markdown & Code Pad (800ms Debounced Auto-Save)
          </h3>
          <p className="text-xs text-slate-400">
            Broadcasts keystrokes in real-time via WebSocket and persists to MongoDB 800ms after typing stops (Last-Write-Wins).
          </p>
        </div>
        <span
          className={`text-xs px-3 py-1 rounded-full border font-medium transition ${
            docSaveStatus === 'saving'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          {docSaveStatus === 'saving' ? '⏳ Syncing...' : '✓ Saved to Cloud'}
        </span>
      </div>

      <textarea
        value={sharedDoc}
        onChange={handleDocChange}
        className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 font-mono text-sm text-slate-100 leading-relaxed outline-none focus:border-blue-500 resize-none"
        placeholder="Write architecture decisions, meeting notes, or shared code snippets here..."
      />
    </div>
  );
}

export function AnalyticsView({
  currentRoom,
  messages,
  tasks,
  doneCount,
  progressPercent,
  exportSprintReport
}) {
  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6">
      <div className="flex items-center justify-between bg-slate-950/70 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h3 className="text-sm font-semibold text-white">Sprint Retrospective Report & Data Export</h3>
          <p className="text-xs text-slate-400">Download channel tasks, velocity metrics, and shared documentation with one click.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportSprintReport('md')}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-4 py-2 rounded-xl cursor-pointer transition"
          >
            ⬇ Export Markdown (.md)
          </button>
          <button
            onClick={() => exportSprintReport('json')}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-4 py-2 rounded-xl border border-slate-700 cursor-pointer transition"
          >
            ⬇ Export JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-950/70 border border-slate-800 p-5 rounded-2xl">
          <p className="text-xs text-slate-400">Total Messages</p>
          <p className="text-3xl font-bold text-white mt-2">{messages.length}</p>
          <span className="text-[11px] text-blue-400 mt-1 block">#{currentRoom} channel</span>
        </div>
        <div className="bg-slate-950/70 border border-slate-800 p-5 rounded-2xl">
          <p className="text-xs text-slate-400">AI Automation Output</p>
          <p className="text-3xl font-bold text-purple-400 mt-2">
            {messages.filter((m) => m.isAi).length}
          </p>
          <span className="text-[11px] text-purple-300 mt-1 block">Code & sprint plans</span>
        </div>
        <div className="bg-slate-950/70 border border-slate-800 p-5 rounded-2xl">
          <p className="text-xs text-slate-400">Completed Tasks</p>
          <p className="text-3xl font-bold text-emerald-400 mt-2">{doneCount}</p>
          <span className="text-[11px] text-emerald-300 mt-1 block">{progressPercent}% completion rate</span>
        </div>
        <div className="bg-slate-950/70 border border-slate-800 p-5 rounded-2xl">
          <p className="text-xs text-slate-400">Critical (High) Tasks</p>
          <p className="text-3xl font-bold text-rose-400 mt-2">
            {tasks.filter((t) => t.priority === 'high').length}
          </p>
          <span className="text-[11px] text-rose-300 mt-1 block">High-priority workload</span>
        </div>
      </div>

      <div className="bg-slate-950/70 border border-slate-800 p-6 rounded-2xl">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Team Member Workload Distribution</h3>
        <div className="space-y-3">
          {Array.from(new Set(tasks.map((t) => t.assignee))).map((member) => {
            const memberTasks = tasks.filter((t) => t.assignee === member);
            const memberDone = memberTasks.filter((t) => t.status === 'done').length;
            return (
              <div key={member} className="flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-sm font-medium text-slate-200">👤 {member}</span>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-slate-400">Assigned: {memberTasks.length}</span>
                  <span className="text-emerald-400 font-semibold">Completed: {memberDone}</span>
                </div>
              </div>
            );
          })}
          {tasks.length === 0 && (
            <p className="text-xs text-slate-500">No tasks assigned in this channel yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
