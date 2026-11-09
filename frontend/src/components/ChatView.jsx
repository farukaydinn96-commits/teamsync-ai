import { useState, useRef, useEffect } from 'react';
import { QUICK_EMOJIS, getAvatarGradient, getInitials } from '../constants/workspaceConfig';

export default function ChatView({
  messages,
  isLoading,
  username,
  input,
  setInput,
  sendMessage,
  replyingTo,
  setReplyingTo,
  isListening,
  handleVoiceInput,
  handleReaction,
  handlePinMessage,
  convertMessageToTask,
  handleVotePoll,
  showToast
}) {
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const renderMessageContent = (text, msgId) => {
    if (!text.includes('```')) {
      return <span className="whitespace-pre-wrap">{text}</span>;
    }

    const parts = text.split('```');
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        const cleanCode = part.replace(/^[a-z]+\n/i, '').trim();
        const copyKey = `${msgId}-${index}`;
        return (
          <div key={index} className="my-2 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden text-xs font-mono">
            <div className="bg-slate-900 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-slate-400">
              <span>Kod Bloğu</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(cleanCode);
                  setCopiedId(copyKey);
                  showToast('📋 Kod panoya kopyalandı');
                  setTimeout(() => setCopiedId(null), 1500);
                }}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded cursor-pointer"
              >
                {copiedId === copyKey ? '✓ Kopyalandı' : 'Kopyala'}
              </button>
            </div>
            <pre className="p-3 overflow-x-auto text-emerald-300">{cleanCode}</pre>
          </div>
        );
      }
      return <span key={index} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  return (
    <>
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-start gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-slate-800" />
                <div className="space-y-2 flex-1 max-w-md">
                  <div className="h-3 bg-slate-800 rounded w-24" />
                  <div className="h-14 bg-slate-800/70 rounded-2xl w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender === username && !msg.isAi;
            const reactionsObj = msg.reactions || {};
            const hasPoll = msg.poll && Array.isArray(msg.poll.options) && msg.poll.options.length > 0;
            const totalVotes = hasPoll ? msg.poll.options.reduce((sum, o) => sum + (o.votes || 0), 0) : 0;

            return (
              <div
                key={msg._id || idx}
                className={`flex items-start gap-3 group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl bg-gradient-to-br ${getAvatarGradient(msg.sender)} flex items-center justify-center text-[11px] font-bold text-white shadow-md shrink-0 mt-1`}
                  title={msg.sender}
                >
                  {getInitials(msg.sender)}
                </div>

                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-2xl`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    {msg.isAi && (
                      <span className="text-[10px] bg-purple-500/20 border border-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded font-semibold">
                        AI ASİSTAN
                      </span>
                    )}
                    <span className={`text-xs font-medium ${msg.isAi ? 'text-purple-400' : 'text-slate-400'}`}>
                      {msg.sender}
                    </span>
                    {msg.isPinned && (
                      <span className="text-[10px] text-amber-400 font-medium">📌 Sabitlendi</span>
                    )}
                  </div>

                  <div
                    className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.isAi
                        ? 'bg-gradient-to-br from-purple-950/80 to-indigo-950/80 border border-purple-500/40 text-purple-100'
                        : msg.isPinned
                        ? 'bg-amber-950/40 border border-amber-500/40 text-slate-100'
                        : isMe
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800/90 text-slate-100 border border-slate-700/80'
                    }`}
                  >
                    {msg.replyTo && msg.replyTo.text && (
                      <div className="mb-2 p-2 rounded-lg bg-black/25 border-l-2 border-blue-400 text-xs opacity-90">
                        <span className="font-semibold block">{msg.replyTo.sender}</span>
                        <span className="line-clamp-1">{msg.replyTo.text}</span>
                      </div>
                    )}

                    {renderMessageContent(msg.text, msg._id || idx)}

                    {hasPoll && (
                      <div className="mt-3 space-y-2 bg-slate-950/50 p-3 rounded-xl border border-white/10 min-w-[260px]">
                        {msg.poll.options.map((opt, optIdx) => {
                          const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                          return (
                            <button
                              key={optIdx}
                              onClick={() => handleVotePoll(msg._id, optIdx)}
                              className="w-full text-left bg-slate-900 hover:bg-slate-800 p-2 rounded-lg border border-slate-700/80 transition cursor-pointer"
                            >
                              <div className="flex justify-between text-xs mb-1">
                                <span>{opt.text}</span>
                                <span className="text-slate-400">{opt.votes} oy (%{pct})</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${pct}%` }} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-1">
                        {QUICK_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(msg._id, emoji)}
                            className="hover:scale-125 transition text-xs px-1 cursor-pointer"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className="text-slate-300 hover:text-white cursor-pointer"
                        >
                          ↩ Yanıtla
                        </button>
                        <button
                          onClick={() => handlePinMessage(msg._id)}
                          className="text-slate-300 hover:text-amber-300 cursor-pointer"
                        >
                          {msg.isPinned ? 'Sabiti Kaldır' : '📌 Sabitle'}
                        </button>
                        <button
                          onClick={() => convertMessageToTask(msg.text)}
                          className="text-slate-300 hover:text-emerald-300 cursor-pointer"
                        >
                          + Görev Yap
                        </button>
                      </div>
                    </div>
                  </div>

                  {Object.keys(reactionsObj).length > 0 && (
                    <div className="flex gap-1.5 mt-1.5 px-1">
                      {Object.entries(reactionsObj).map(([emoji, count]) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(msg._id, emoji)}
                          className="text-xs bg-slate-800/90 hover:bg-slate-700 border border-slate-700 px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                        >
                          <span>{emoji}</span>
                          <span className="text-[11px] text-slate-300">{count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t border-slate-800/80 bg-slate-950/60">
        <div className="max-w-5xl mx-auto space-y-2">
          {replyingTo && (
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
              <span className="text-slate-300 truncate">
                ↩ <strong>{replyingTo.sender}</strong> kişisine yanıt veriliyor: "{replyingTo.text}"
              </span>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="text-slate-400 hover:text-rose-400 ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleVoiceInput}
              className={`px-3.5 py-3 rounded-xl border text-sm transition cursor-pointer ${
                isListening
                  ? 'bg-rose-600 border-rose-500 text-white animate-pulse'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
              title="Sesle Yazdır"
            >
              🎙️
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Mesaj yaz veya /ai, /task, /plan [konu], /poll Soru | Şık1 | Şık2 kullan..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 transition"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-medium text-sm transition cursor-pointer shadow-lg shadow-blue-600/20"
            >
              Gönder
            </button>
          </div>
        </div>
      </form>
    </>
  );
}