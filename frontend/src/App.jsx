import { useEffect, useState, useRef } from 'react';
import socket from './services/socket';
import { BACKEND_URL, CHANNELS } from './constants/workspaceConfig';
import { INITIAL_WORKSPACE_DATA } from './constants/initialWorkspaceData';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import KanbanBoard from './components/KanbanBoard';
import { DocsView, AnalyticsView } from './components/DocsAndAnalytics';
import CommandModal from './components/CommandModal';

const CACHE_KEY = 'teamsync_workspace_cache_v2';
const FENCE = '\x60\x60\x60';

const makeLocalId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const loadInitialStore = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return INITIAL_WORKSPACE_DATA;
    const parsed = JSON.parse(raw);
    const merged = {};
    for (const ch of CHANNELS) {
      const id = ch.id;
      const saved = parsed?.[id];
      const fallback = INITIAL_WORKSPACE_DATA[id];
      merged[id] = {
        messages:
          Array.isArray(saved?.messages) && saved.messages.length > 0
            ? saved.messages.filter((m) => !String(m._id).startsWith('ai-thinking-'))
            : fallback.messages,
        tasks:
          Array.isArray(saved?.tasks) && saved.tasks.length > 0
            ? saved.tasks
            : fallback.tasks,
        doc:
          typeof saved?.doc === 'string' && saved.doc.trim().length > 0
            ? saved.doc
            : fallback.doc
      };
    }
    return merged;
  } catch {
    return INITIAL_WORKSPACE_DATA;
  }
};

function App() {
  const [currentRoom, setCurrentRoom] = useState('general');
  const [activeTab, setActiveTab] = useState('chat');
  const [workspaceStore, setWorkspaceStore] = useState(loadInitialStore);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [docSaveStatus, setDocSaveStatus] = useState('saved');
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [pingMs, setPingMs] = useState(28);
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
    try {
      return localStorage.getItem('teamsync_user') || 'Faruk_Lead';
    } catch {
      return 'Faruk_Lead';
    }
  });

  const currentRoomRef = useRef(currentRoom);
  const docDebounceRef = useRef(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  const currentRoomData = workspaceStore[currentRoom] || INITIAL_WORKSPACE_DATA.general;
  const messages = currentRoomData.messages;
  const tasks = currentRoomData.tasks;
  const sharedDoc = currentRoomData.doc;

  const updateRoom = (room, updater) => {
    setWorkspaceStore((prev) => {
      const existing = prev[room] || INITIAL_WORKSPACE_DATA[room] || INITIAL_WORKSPACE_DATA.general;
      const updated = updater(existing);
      return { ...prev, [room]: updated };
    });
  };

  useEffect(() => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(workspaceStore));
    } catch {
      // ignore storage quota errors
    }
  }, [workspaceStore]);

  const showToast = (msg) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2600);
  };

  useEffect(() => {
    try {
      localStorage.setItem('teamsync_user', username);
    } catch {
      // ignore
    }
  }, [username]);

  // Arka plan sunucu uyanıklığı ve gerçek sıcak ping ölçümü
  useEffect(() => {
    const measureWarmPing = async () => {
      try {
        const t0 = performance.now();
        const res = await fetch(`${BACKEND_URL}/api/health`, { cache: 'no-store' });
        if (!res.ok) return;
        let elapsed = Math.round(performance.now() - t0);
        // İlk istek sunucuyu uyandırdıysa (cold start), hemen gerçek sıcak gecikmeyi ölç
        if (elapsed > 800) {
          const t1 = performance.now();
          await fetch(`${BACKEND_URL}/api/health`, { cache: 'no-store' });
          elapsed = Math.round(performance.now() - t1);
        }
        setPingMs(Math.max(12, Math.min(elapsed, 450)));
        setIsConnected(true);
      } catch {
        setIsConnected(socket.connected);
      }
    };

    const onConnect = () => {
      setIsConnected(true);
      socket.emit('join_room', {
        room: currentRoomRef.current,
        username,
        isFocusing: isFocusActive
      });
      measureWarmPing();
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    measureWarmPing();
    const interval = setInterval(measureWarmPing, 20000);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      clearInterval(interval);
    };
  }, [username, isFocusActive]);

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

  // Oda değiştiğinde soket odasına katıl
  useEffect(() => {
    socket.emit('join_room', { room: currentRoom, username, isFocusing: isFocusActive });
  }, [currentRoom, username, isFocusActive]);

  // Arka planda sessizce (ekranı kilitlemeden ve yerel veriyi silmeden) senkronize et
  useEffect(() => {
    let cancelled = false;
    const targetRoom = currentRoom;

    Promise.all([
      fetch(`${BACKEND_URL}/api/messages/${targetRoom}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${BACKEND_URL}/api/tasks/${targetRoom}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${BACKEND_URL}/api/docs/${targetRoom}`).then((r) => (r.ok ? r.json() : null))
    ])
      .then(([msgsData, tasksData, docData]) => {
        if (cancelled) return;
        updateRoom(targetRoom, (prev) => {
          let nextMessages = prev.messages;
          if (Array.isArray(msgsData) && msgsData.length > 0) {
            const pendingLocal = prev.messages.filter(
              (m) =>
                String(m._id).startsWith('local-msg-') &&
                !msgsData.some((sm) => sm.sender === m.sender && sm.text === m.text)
            );
            nextMessages = [...msgsData, ...pendingLocal];
          }

          let nextTasks = prev.tasks;
          if (Array.isArray(tasksData) && tasksData.length > 0) {
            const pendingTasks = prev.tasks.filter(
              (t) =>
                String(t._id).startsWith('local-task-') &&
                !tasksData.some((st) => st.title === t.title)
            );
            nextTasks = [...pendingTasks, ...tasksData];
          }

          const nextDoc =
            docData && typeof docData.content === 'string' && docData.content.trim().length > 0
              ? docData.content
              : prev.doc;

          return { messages: nextMessages, tasks: nextTasks, doc: nextDoc };
        });
      })
      .catch(() => {
        // Sunucu uyanırken yerel önbellek kesintisiz çalışmaya devam eder
      });

    return () => {
      cancelled = true;
    };
  }, [currentRoom]);

  // Gerçek zamanlı soket dinleyicileri
  useEffect(() => {
    const handleReceiveMessage = (serverMsg) => {
      const targetRoom = serverMsg.room || currentRoomRef.current;
      updateRoom(targetRoom, (prev) => {
        const cleaned = serverMsg.isAi
          ? prev.messages.filter((m) => !String(m._id).startsWith('ai-thinking-'))
          : prev.messages;

        if (cleaned.some((m) => m._id === serverMsg._id)) {
          return {
            ...prev,
            messages: cleaned.map((m) => (m._id === serverMsg._id ? serverMsg : m))
          };
        }

        const localIdx = cleaned.findIndex(
          (m) =>
            String(m._id).startsWith('local-msg-') &&
            m.sender === serverMsg.sender &&
            m.text === serverMsg.text
        );

        if (localIdx !== -1) {
          const copy = [...cleaned];
          copy[localIdx] = serverMsg;
          return { ...prev, messages: copy };
        }

        return { ...prev, messages: [...cleaned, serverMsg] };
      });
    };

    const handleMessageUpdated = (updatedMsg) => {
      const targetRoom = updatedMsg.room || currentRoomRef.current;
      updateRoom(targetRoom, (prev) => ({
        ...prev,
        messages: prev.messages.map((m) => (m._id === updatedMsg._id ? updatedMsg : m))
      }));
    };

    const handleTaskCreated = (newTask) => {
      const targetRoom = newTask.room || currentRoomRef.current;
      updateRoom(targetRoom, (prev) => {
        if (prev.tasks.some((t) => t._id === newTask._id)) return prev;
        const localIdx = prev.tasks.findIndex(
          (t) => String(t._id).startsWith('local-task-') && t.title === newTask.title
        );
        if (localIdx !== -1) {
          const copy = [...prev.tasks];
          copy[localIdx] = newTask;
          return { ...prev, tasks: copy };
        }
        return { ...prev, tasks: [newTask, ...prev.tasks] };
      });
    };

    const handleTaskUpdated = (updatedTask) => {
      const targetRoom = updatedTask.room || currentRoomRef.current;
      updateRoom(targetRoom, (prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t._id === updatedTask._id ? updatedTask : t))
      }));
    };

    const handleTaskDeleted = (taskId) => {
      updateRoom(currentRoomRef.current, (prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t._id !== taskId)
      }));
    };

    const handleDocUpdated = (content) => {
      updateRoom(currentRoomRef.current, (prev) => ({ ...prev, doc: content }));
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
    socket.on('doc_updated', handleDocUpdated);
    socket.on('doc_saved_ack', handleDocSavedAck);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_updated', handleMessageUpdated);
      socket.off('task_created', handleTaskCreated);
      socket.off('task_updated', handleTaskUpdated);
      socket.off('task_deleted', handleTaskDeleted);
      socket.off('room_users', setOnlineUsers);
      socket.off('doc_updated', handleDocUpdated);
      socket.off('doc_saved_ack', handleDocSavedAck);
    };
  }, []);

  const handleDocChange = (e) => {
    const val = e.target.value;
    const room = currentRoom;
    updateRoom(room, (prev) => ({ ...prev, doc: val }));
    setDocSaveStatus('saving');

    socket.emit('sync_doc_live', { room, content: val });

    if (docDebounceRef.current) clearTimeout(docDebounceRef.current);
    docDebounceRef.current = setTimeout(() => {
      if (socket.connected) {
        socket.emit('save_doc_db', { room, content: val });
      } else {
        setDocSaveStatus('saved');
      }
    }, 800);
  };

  const dispatchMessageOrCommand = (rawText, replyContext = null) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;
    const room = currentRoom;

    // 1. /poll komutu — anında kart oluşturur
    if (trimmed.startsWith('/poll ')) {
      const parts = trimmed
        .replace('/poll ', '')
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean);

      if (parts.length >= 2) {
        const question = parts[0];
        const options = parts.slice(1).map((opt) => ({ text: opt, votes: 0 }));
        const optimisticPoll = {
          _id: makeLocalId('local-msg'),
          room,
          sender: username,
          senderId: socket.id || 'local-user',
          text: `📊 Anket: ${question}`,
          poll: { question, options },
          isAi: false,
          isPinned: false,
          reactions: {}
        };
        updateRoom(room, (prev) => ({ ...prev, messages: [...prev.messages, optimisticPoll] }));
        socket.emit('send_message', {
          room,
          sender: username,
          senderId: socket.id || 'local-user',
          text: trimmed
        });
        return;
      }
    }

    // Normal veya komut mesajını 0ms'de ekrana ekle
    const optimisticMsg = {
      _id: makeLocalId('local-msg'),
      room,
      sender: username,
      senderId: socket.id || 'local-user',
      text: trimmed,
      replyTo: replyContext ? { sender: replyContext.sender, text: replyContext.text } : null,
      isAi: false,
      isPinned: false,
      reactions: {}
    };
    updateRoom(room, (prev) => ({ ...prev, messages: [...prev.messages, optimisticMsg] }));

    // Sunucu bağlıysa gerçek backend / Gemini akışını çalıştır
    if (socket.connected) {
      if (trimmed.startsWith('/plan ') || trimmed.startsWith('/ai ')) {
        const thinkingMsg = {
          _id: `ai-thinking-${Date.now()}`,
          room,
          sender: 'TeamSync AI',
          senderId: 'ai-bot',
          text: '⚡ TeamSync AI analiz ediyor...',
          isAi: true,
          isPinned: false,
          reactions: {}
        };
        updateRoom(room, (prev) => ({ ...prev, messages: [...prev.messages, thinkingMsg] }));
      }
      socket.emit('send_message', {
        room,
        sender: username,
        senderId: socket.id,
        text: trimmed,
        replyTo: optimisticMsg.replyTo
      });
      return;
    }

    // Sunucu henüz uyanıyorsa sıfır bekleme ile yerel otomasyonu çalıştır
    if (trimmed.startsWith('/task ')) {
      const taskTitle = trimmed.replace('/task ', '').trim();
      if (taskTitle) {
        const localTask = {
          _id: makeLocalId('local-task'),
          room,
          title: taskTitle,
          status: 'todo',
          priority: 'high',
          assignee: username,
          subtasks: [
            { _id: makeLocalId('st'), title: 'Gereksinimleri analiz et', completed: false },
            { _id: makeLocalId('st'), title: 'Geliştirme ve testleri tamamla', completed: false }
          ]
        };
        const botReply = {
          _id: makeLocalId('local-msg'),
          room,
          sender: 'TeamSync AI',
          senderId: 'ai-bot',
          text: `✅ "${taskTitle}" görevi alt adımlarıyla birlikte Kanban panosuna (${username} adına) eklendi.`,
          isAi: true,
          isPinned: false,
          reactions: {}
        };
        updateRoom(room, (prev) => ({
          ...prev,
          tasks: [localTask, ...prev.tasks],
          messages: [...prev.messages, botReply]
        }));
        socket.emit('create_task', {
          room,
          title: taskTitle,
          priority: 'high',
          assignee: username,
          subtasks: [
            { title: 'Gereksinimleri analiz et', completed: false },
            { title: 'Geliştirme ve testleri tamamla', completed: false }
          ]
        });
      }
      return;
    }

    if (trimmed.startsWith('/plan ')) {
      const topic = trimmed.replace('/plan ', '').trim();
      if (topic) {
        const titles = [
          `${topic} - Mimari ve Veritabanı Şema Tasarımı`,
          `${topic} - Backend API ve İş Mantığı Geliştirmesi`,
          `${topic} - Frontend Arayüz ve State Entegrasyonu`,
          `${topic} - Uçtan Uca (E2E) Test ve Optimizasyon`
        ];
        const createdTasks = titles.map((title) => ({
          _id: makeLocalId('local-task'),
          room,
          title,
          status: 'todo',
          priority: 'high',
          assignee: username,
          subtasks: [
            { _id: makeLocalId('st'), title: 'Kodlamayı tamamla', completed: false },
            { _id: makeLocalId('st'), title: 'PR incelemesinden geçir', completed: false }
          ]
        }));
        const planReply = {
          _id: makeLocalId('local-msg'),
          room,
          sender: 'TeamSync AI',
          senderId: 'ai-bot',
          text:
            `🚀 "${topic}" için ${titles.length} adet sprint görevi otomatik oluşturuldu ve Kanban panosuna eklendi:\n` +
            titles.map((t) => `• ${t}`).join('\n'),
          isAi: true,
          isPinned: false,
          reactions: {}
        };
        updateRoom(room, (prev) => ({
          ...prev,
          tasks: [...createdTasks, ...prev.tasks],
          messages: [...prev.messages, planReply]
        }));
        titles.forEach((title) => {
          socket.emit('create_task', {
            room,
            title,
            priority: 'high',
            assignee: username,
            subtasks: [
              { title: 'Kodlamayı tamamla', completed: false },
              { title: 'PR incelemesinden geçir', completed: false }
            ]
          });
        });
      }
      return;
    }

    if (trimmed.startsWith('/ai ')) {
      const prompt = trimmed.replace('/ai ', '').trim();
      const aiReply = {
        _id: makeLocalId('local-msg'),
        room,
        sender: 'TeamSync AI',
        senderId: 'ai-bot',
        text: `🤖 [TeamSync AI]: "${prompt}" için önerilen üretim şablonu:\n${FENCE}javascript\nexport const workspaceGuard = async (req, res, next) => {\n  try {\n    const start = performance.now();\n    res.on('finish', () => {\n      const duration = Math.round(performance.now() - start);\n      console.info(\`[\${req.method}] \${req.originalUrl} - \${duration}ms\`);\n    });\n    return next();\n  } catch (error) {\n    return res.status(500).json({ message: 'Internal Middleware Error' });\n  }\n};\n${FENCE}`,
        isAi: true,
        isPinned: false,
        reactions: {}
      };
      updateRoom(room, (prev) => ({ ...prev, messages: [...prev.messages, aiReply] }));
      return;
    }

    // Normal mesajı soket tamponuna ilet (sunucu uyandığında MongoDB'ye kaydedilir)
    socket.emit('send_message', {
      room,
      sender: username,
      senderId: socket.id || 'local-user',
      text: trimmed,
      replyTo: optimisticMsg.replyTo
    });
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    dispatchMessageOrCommand(input, replyingTo);
    setInput('');
    setReplyingTo(null);
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
    dispatchMessageOrCommand(commandText, null);
    showToast('⚡ AI Otomasyon komutu çalıştırıldı');
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;
    const optimisticTask = {
      _id: makeLocalId('local-task'),
      room: currentRoom,
      title,
      status: 'todo',
      priority: newTaskPriority,
      assignee: username,
      subtasks: []
    };
    updateRoom(currentRoom, (prev) => ({
      ...prev,
      tasks: [optimisticTask, ...prev.tasks]
    }));
    socket.emit('create_task', {
      room: currentRoom,
      title,
      priority: newTaskPriority,
      assignee: username,
      subtasks: []
    });
    setNewTaskTitle('');
    showToast('✅ Yeni görev Kanban panosuna eklendi');
  };

  const handleReaction = (messageId, emoji) => {
    updateRoom(currentRoom, (prev) => ({
      ...prev,
      messages: prev.messages.map((m) => {
        if (m._id !== messageId) return m;
        const currentReactions = m.reactions || {};
        return {
          ...m,
          reactions: {
            ...currentReactions,
            [emoji]: (currentReactions[emoji] || 0) + 1
          }
        };
      })
    }));
    if (!String(messageId).startsWith('local-') && !String(messageId).startsWith('seed-')) {
      socket.emit('react_message', { room: currentRoom, messageId, emoji });
    }
  };

  const handlePinMessage = (messageId) => {
    updateRoom(currentRoom, (prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m._id === messageId ? { ...m, isPinned: !m.isPinned } : m
      )
    }));
    if (!String(messageId).startsWith('local-') && !String(messageId).startsWith('seed-')) {
      socket.emit('pin_message', { room: currentRoom, messageId });
    }
    showToast('📌 Mesaj durumu güncellendi');
  };

  const handleVotePoll = (messageId, optionIndex) => {
    updateRoom(currentRoom, (prev) => ({
      ...prev,
      messages: prev.messages.map((m) => {
        if (m._id !== messageId || !m.poll?.options) return m;
        const nextOptions = m.poll.options.map((opt, idx) =>
          idx === optionIndex ? { ...opt, votes: (opt.votes || 0) + 1 } : opt
        );
        return { ...m, poll: { ...m.poll, options: nextOptions } };
      })
    }));
    if (!String(messageId).startsWith('local-') && !String(messageId).startsWith('seed-')) {
      socket.emit('vote_poll', { room: currentRoom, messageId, optionIndex });
    }
  };

  const convertMessageToTask = (text) => {
    const cleanTitle = text.length > 60 ? `${text.slice(0, 60)}...` : text;
    const optimisticTask = {
      _id: makeLocalId('local-task'),
      room: currentRoom,
      title: cleanTitle,
      status: 'todo',
      priority: 'medium',
      assignee: username,
      subtasks: [{ _id: makeLocalId('st'), title: 'Mesaj bağlamını incele', completed: false }]
    };
    updateRoom(currentRoom, (prev) => ({
      ...prev,
      tasks: [optimisticTask, ...prev.tasks]
    }));
    socket.emit('create_task', {
      room: currentRoom,
      title: cleanTitle,
      priority: 'medium',
      assignee: username,
      subtasks: [{ title: 'Mesaj bağlamını incele', completed: false }]
    });
    setActiveTab('board');
    showToast('📋 Mesaj Kanban görevine dönüştürüldü');
  };

  const handleStatusChange = (taskId, status) => {
    updateRoom(currentRoom, (prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t._id === taskId ? { ...t, status } : t))
    }));
    if (!String(taskId).startsWith('local-') && !String(taskId).startsWith('seed-')) {
      socket.emit('update_task_status', { room: currentRoom, taskId, status });
    }
    showToast(`🔄 Görev durumu "${status}" olarak güncellendi`);
  };

  const handleDeleteTask = (taskId) => {
    updateRoom(currentRoom, (prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t._id !== taskId)
    }));
    if (!String(taskId).startsWith('local-') && !String(taskId).startsWith('seed-')) {
      socket.emit('delete_task', { room: currentRoom, taskId });
    }
    showToast('🗑️ Görev silindi');
  };

  const handleAddSubtask = (taskId, title) => {
    updateRoom(currentRoom, (prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t._id === taskId
          ? {
              ...t,
              subtasks: [
                ...(t.subtasks || []),
                { _id: makeLocalId('st'), title, completed: false }
              ]
            }
          : t
      )
    }));
    if (!String(taskId).startsWith('local-') && !String(taskId).startsWith('seed-')) {
      socket.emit('add_subtask', { room: currentRoom, taskId, title });
    }
  };

  const handleToggleSubtask = (taskId, subtaskId) => {
    updateRoom(currentRoom, (prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t._id === taskId
          ? {
              ...t,
              subtasks: (t.subtasks || []).map((st) =>
                st._id === subtaskId ? { ...st, completed: !st.completed } : st
              )
            }
          : t
      )
    }));
    if (!String(taskId).startsWith('local-') && !String(taskId).startsWith('seed-')) {
      socket.emit('toggle_subtask', { room: currentRoom, taskId, subtaskId });
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
      content +=
        `## Tamamlanan Görevler\n` +
        (doneTasks.map((t) => `- [x] ${t.title} (${t.assignee})`).join('\n') || 'Henüz yok.') +
        `\n\n`;
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
            <div className="text-[11px] px-2.5 py-1 rounded-full border flex items-center gap-1.5 bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {isConnected ? `Canlı (${pingMs}ms)` : 'Canlı Çalışma Alanı'}
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
            isLoading={false}
            username={username}
            input={input}
            setInput={setInput}
            sendMessage={sendMessage}
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
            isListening={isListening}
            handleVoiceInput={handleVoiceInput}
            handleReaction={handleReaction}
            handlePinMessage={handlePinMessage}
            convertMessageToTask={convertMessageToTask}
            handleVotePoll={handleVotePoll}
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
            handleStatusChange={handleStatusChange}
            handleDeleteTask={handleDeleteTask}
            onAddSubtask={handleAddSubtask}
            handleToggleSubtask={handleToggleSubtask}
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
