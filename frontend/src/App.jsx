import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { BACKEND_URL, CHANNELS } from './constants/workspaceConfig';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import KanbanBoard from './components/KanbanBoard';
import { DocsView, AnalyticsView } from './components/DocsAndAnalytics';
import CommandModal from './components/CommandModal';

const socket = io(BACKEND_URL);

function App() {
  const [currentRoom, setCurrentRoom] = useState('general');
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [sharedDoc, setSharedDoc] = useState('');
  const [docSaveStatus, setDocSaveStatus] = useState('saved');
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [pingMs, setPingMs] = useState(14);
  const [toastMessage, setToastMessage] = useState(null);

  const [input, setInput] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [isFocusActive, setIsFocusActive] = useState(false);

  const [username, setUsername] = useState(() => {
    return localStorage.getItem('teamsync_user') || 'Faruk_Lead';
  });

  const docDebounceRef = useRef(null);
  const toastTimerRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2600);
  };

  useEffect(() => {
    localStorage.setItem('teamsync_user', username);
  }, [username]);

  // Bağlantı ve Canlı Ping Kontrolü
  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    const checkPing = async () => {
      const start = Date.now();
      try {
        await fetch(`${BACKEND_URL}/api/health`);
        setPingMs(Date.now() - start);
        setIsConnected(true);
      } catch {
        setIsConnected(false);
      }
    };

    checkPing();
    const interval = setInterval(checkPing, 15000);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let timer = null;
    if (isFocusActive && focusSeconds > 0) {
      timer = setInterval(() => setFocusSeconds((prev) => prev - 1), 1000);
    } else if (focusSeconds === 0) {
      setIsFocusActive(false);
      socket.emit('toggle_focus', { room: currentRoom, username, isFocusing: false });
      showToast('🎯 Deep Work oturumu tamamlandı!');
    }
    return () => clearInterval(timer);
  }, [isFocusActive, focusSeconds, currentRoom, username]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsCommandOpen(false);
        setReplyingTo(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setIsLoadingRoom(true);
    socket.emit('join_room', { room: currentRoom, username, isFocusing: isFocusActive });

    Promise.all([
      fetch(`${BACKEND_URL}/api/messages/${currentRoom}`).then((r) => r.json()),
      fetch(`${BACKEND_URL}/api/tasks/${currentRoom}`).then((r) => r.json()),
      fetch(`${BACKEND_URL}/api/docs/${currentRoom}`).then((r) => r.json())
    ])
      .then(([msgsData, tasksData, docData]) => {
        if (Array.isArray(msgsData)) setMessages(msgsData);
        if (Array.isArray(tasksData)) setTasks(tasksData);
        if (docData && typeof docData.content === 'string') setSharedDoc(docData.content);
      })
      .catch(console.error)
      .finally(() => setIsLoadingRoom(false));
  }, [currentRoom, username]);

  useEffect(() => {
    const handleReceiveMessage = (data) => {
      if (data.room === currentRoom) setMessages((prev) => [...prev, data]);
    };
    const handleMessageUpdated = (updatedMsg) => {
      if (updatedMsg.room === currentRoom) {
        setMessages((prev) => prev.map((m) => (m._id === updatedMsg._id ? updatedMsg : m)));
      }
    };
    const handleTaskCreated = (newTask) => {
      if (newTask.room === currentRoom) setTasks((prev) => [newTask, ...prev]);
    };
    const handleTaskUpdated = (updatedTask) => {
      if (updatedTask.room === currentRoom) {
        setTasks((prev) => prev.map((t) => (t._id === updatedTask._id ? updatedTask : t)));
      }
    };
    const handleTaskDeleted = (taskId) => {
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    };
    const handleDocSavedAck = () => {
      setDocSaveStatus('saved');
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_updated', handleMessageUpdated);
    socket.on('task_created', handleTaskCreated);
    socket.on('task_updated', handleTaskUpdated);
    socket.on('task_deleted', handleTaskDeleted);
    socket.on('room_users', setOnlineUsers);
    socket.on('doc_updated', setSharedDoc);
    socket.on('doc_saved_ack', handleDocSavedAck);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_updated', handleMessageUpdated);
      socket.off('task_created', handleTaskCreated);
      socket.off('task_updated', handleTaskUpdated);
      socket.off('task_deleted', handleTaskDeleted);
      socket.off('room_users', setOnlineUsers);
      socket.off('doc_updated', setSharedDoc);
      socket.off('doc_saved_ack', handleDocSavedAck);
    };
  }, [currentRoom]);

  // 800ms Debounce ile Ortak Doküman Güncelleme
  const handleDocChange = (e) => {
    const val = e.target.value;
    setSharedDoc(val);
    setDocSaveStatus('saving');

    // Diğer kullanıcılara anında yayınla
    socket.emit('sync_doc_live', { room: currentRoom, content: val });

    // Veritabanına yazmayı 800ms geciktir (Debounce)
    if (docDebounceRef.current) clearTimeout(docDebounceRef.current);
    docDebounceRef.current = setTimeout(() => {
      socket.emit('save_doc_db', { room: currentRoom, content: val });
    }, 800);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (input.trim()) {
      socket.emit('send_message', {
        room: currentRoom,
        sender: username,
        senderId: socket.id,
        text: input,
        replyTo: replyingTo ? { sender: replyingTo.sender, text: replyingTo.text } : null
      });
      setInput('');
      setReplyingTo(null);
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('⚠️ Tarayıcınız Web Speech API desteklemiyor.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'tr-TR';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.start();
  };

  const triggerQuickCommand = (commandText) => {
    setActiveTab('chat');
    socket.emit('send_message', {
      room: currentRoom,
      sender: username,
      senderId: socket.id,
      text: commandText
    });
    showToast('⚡ AI Otomasyon komutu tetiklendi');
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (newTaskTitle.trim()) {
      socket.emit('create_task', {
        room: currentRoom,
        title: newTaskTitle,
        priority: newTaskPriority,
        assignee: username,
        subtasks: []
      });
      setNewTaskTitle('');
      showToast('✅ Yeni görev Kanban panosuna eklendi');
    }
  };

  const exportSprintReport = (format = 'md') => {
    const doneTasks = tasks.filter((t) => t.status === 'done');
    const inProgressTasks = tasks.filter((t) => t.status === 'in-progress');
    const todoTasks = tasks.filter((t) => t.status === 'todo');

    let content = '';
    const filename = `teamsync-${currentRoom}-rapor.${format}`;

    if (format === 'json') {
      content = JSON.stringify({ room: currentRoom, tasks, messagesCount: messages.length }, null, 2);
    } else {
      content = `# TeamSync AI - #${currentRoom} Sprint Raporu\n\n`;
      content += `- **Toplam Görev:** ${tasks.length} | **Tamamlanan:** ${doneTasks.length} | **Süren:** ${inProgressTasks.length} | **Yapılacak:** ${todoTasks.length}\n\n`;
      content += `## Tamamlanan Görevler\n` + (doneTasks.map((t) => `- [x] ${t.title} (${t.assignee})`).join('\n') || 'Henüz yok.') + `\n\n`;
      content += `## Ortak Kanal Dokümanı\n${sharedDoc}\n`;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`⬇ Rapor (.${format}) olarak indirildi`);
  };

  const activeChannel = CHANNELS.find((c) => c.id === currentRoom);
  const filteredMessages = messages.filter((m) => {
    const matchesSearch =
      m.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sender.toLowerCase().includes(searchQuery.toLowerCase());
    return showPinnedOnly ? matchesSearch && m.isPinned : matchesSearch;
  });

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    return priorityFilter === 'all' ? matchesSearch : matchesSearch && t.priority === priorityFilter;
  });

  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const progressPercent = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;
  const pinnedCount = messages.filter((m) => m.isPinned).length;

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex overflow-hidden font-sans selection:bg-blue-600 selection:text-white relative">
      {/* Sağ Üst Canlı Toast Bildirimi */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 border border-blue-500/40 text-slate-100 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
          {toastMessage}
        </div>
      )}

      <CommandModal
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        setActiveTab={setActiveTab}
        triggerQuickCommand={triggerQuickCommand}
      />

      <Sidebar
        currentRoom={currentRoom}
        setCurrentRoom={(room) => {
          setCurrentRoom(room);
          showToast(`#${room} kanalına geçildi`);
        }}
        progressPercent={progressPercent}
        doneCount={doneCount}
        totalTasks={tasks.length}
        focusSeconds={focusSeconds}
        isFocusActive={isFocusActive}
        toggleFocusTimer={() => {
          const next = !isFocusActive;
          setIsFocusActive(next);
          socket.emit('toggle_focus', { room: currentRoom, username, isFocusing: next });
        }}
        resetFocusTimer={() => {
          setIsFocusActive(false);
          setFocusSeconds(25 * 60);
          socket.emit('toggle_focus', { room: currentRoom, username, isFocusing: false });
        }}
        triggerQuickCommand={triggerQuickCommand}
        onlineUsers={onlineUsers}
        username={username}
        setUsername={(name) => {
          setUsername(name);
          showToast(`👤 Aktif profil: ${name}`);
        }}
        onOpenCommand={() => setIsCommandOpen(true)}
      />

      <main className="flex-1 flex flex-col bg-slate-900/60">
        <header className="h-16 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-950/60 backdrop-blur">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-blue-400">#</span>
                <h2 className="font-semibold text-base">{activeChannel?.name}</h2>
              </div>
              <p className="text-[11px] text-slate-400">{activeChannel?.desc}</p>
            </div>

            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
              {[
                { id: 'chat', label: `💬 Sohbet (${messages.length})` },
                { id: 'board', label: `📋 Kanban (${tasks.length})` },
                { id: 'docs', label: '📝 Doküman & Kod' },
                { id: 'analytics', label: '📊 Analitik' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    activeTab === tab.id ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Canlı Bağlantı & Ping Göstergesi */}
            <div
              className={`text-[11px] px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                isConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
              {isConnected ? `Canlı (${pingMs}ms)` : 'Yeniden Bağlanıyor...'}
            </div>

            {activeTab === 'chat' && (
              <button
                onClick={() => setShowPinnedOnly(!showPinnedOnly)}
                className={`text-xs px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                  showPinnedOnly
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                📌 Sabitler ({pinnedCount})
              </button>
            )}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ara..."
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 w-40"
            />
          </div>
        </header>

        {activeTab === 'chat' && (
          <ChatView
            messages={filteredMessages}
            isLoading={isLoadingRoom}
            username={username}
            input={input}
            setInput={setInput}
            sendMessage={sendMessage}
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
            isListening={isListening}
            handleVoiceInput={handleVoiceInput}
            handleReaction={(messageId, emoji) => socket.emit('react_message', { room: currentRoom, messageId, emoji })}
            handlePinMessage={(messageId) => {
              socket.emit('pin_message', { room: currentRoom, messageId });
              showToast('📌 Mesaj durumu güncellendi');
            }}
            convertMessageToTask={(text) => {
              socket.emit('create_task', {
                room: currentRoom,
                title: text.length > 60 ? text.slice(0, 60) + '...' : text,
                priority: 'medium',
                assignee: username,
                subtasks: [{ title: 'Mesaj bağlamını incele', completed: false }]
              });
              setActiveTab('board');
              showToast('📋 Mesaj Kanban görevine dönüştürüldü');
            }}
            handleVotePoll={(messageId, optionIndex) => socket.emit('vote_poll', { room: currentRoom, messageId, optionIndex })}
            showToast={showToast}
          />
        )}

        {activeTab === 'board' && (
          <KanbanBoard
            tasks={filteredTasks}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            newTaskTitle={newTaskTitle}
            setNewTaskTitle={setNewTaskTitle}
            newTaskPriority={newTaskPriority}
            setNewTaskPriority={setNewTaskPriority}
            handleCreateTask={handleCreateTask}
            handleStatusChange={(taskId, status) => {
              socket.emit('update_task_status', { room: currentRoom, taskId, status });
              showToast(`🔄 Görev durumu "${status}" olarak güncellendi`);
            }}
            handleDeleteTask={(taskId) => {
              socket.emit('delete_task', { room: currentRoom, taskId });
              showToast('🗑️ Görev silindi');
            }}
            onAddSubtask={(taskId, title) => socket.emit('add_subtask', { room: currentRoom, taskId, title })}
            handleToggleSubtask={(taskId, subtaskId) => socket.emit('toggle_subtask', { room: currentRoom, taskId, subtaskId })}
          />
        )}

        {activeTab === 'docs' && (
          <DocsView
            currentRoom={currentRoom}
            sharedDoc={sharedDoc}
            handleDocChange={handleDocChange}
            docSaveStatus={docSaveStatus}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            currentRoom={currentRoom}
            messages={messages}
            tasks={tasks}
            doneCount={doneCount}
            progressPercent={progressPercent}
            exportSprintReport={exportSprintReport}
          />
        )}
      </main>
    </div>
  );
}

export default App;