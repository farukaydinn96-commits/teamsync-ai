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
            ⚡ Hızlı Komut Paleti (⌘K)
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
            <span>💬 Sohbet Görünümüne Geç</span>
            <span className="text-xs text-slate-500">Sekme</span>
          </button>
          <button
            onClick={() => { setActiveTab('board'); onClose(); }}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-sm flex items-center justify-between cursor-pointer"
          >
            <span>📋 Kanban Panosuna Geç</span>
            <span className="text-xs text-slate-500">Sekme</span>
          </button>
          <button
            onClick={() => { setActiveTab('docs'); onClose(); }}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-sm flex items-center justify-between cursor-pointer"
          >
            <span>📝 Ortak Doküman & Kod Editörü</span>
            <span className="text-xs text-slate-500">Canlı Wiki</span>
          </button>
          <button
            onClick={() => { setActiveTab('analytics'); onClose(); }}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-sm flex items-center justify-between cursor-pointer"
          >
            <span>📊 Sprint Analitiği & Rapor İndir</span>
            <span className="text-xs text-slate-500">Rapor</span>
          </button>
          <div className="border-t border-slate-800 my-1"></div>
          <button
            onClick={() => { triggerQuickCommand('/plan Yeni Mikroservis ve Auth Mimarisi'); onClose(); }}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-950/50 text-emerald-300 text-sm flex items-center justify-between cursor-pointer"
          >
            <span>🚀 AI Sprint Planlayıcı (/plan çalıştır)</span>
            <span className="text-xs text-emerald-400">Otomasyon</span>
          </button>
          <button
            onClick={() => { triggerQuickCommand('/poll Hangi State Yönetimi? | Redux Toolkit | Zustand | Context API'); onClose(); }}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-purple-950/50 text-purple-300 text-sm flex items-center justify-between cursor-pointer"
          >
            <span>📊 Hızlı Teknik Anket Başlat (/poll)</span>
            <span className="text-xs text-purple-400">Oylama</span>
          </button>
        </div>
      </div>
    </div>
  );
}