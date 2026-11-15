import { useEffect, useState, useRef } from 'react';
import socket from './services/socket';
import { BACKEND_URL, CHANNELS } from './constants/workspaceConfig';
import { INITIAL_WORKSPACE_DATA } from './constants/initialWorkspaceData';
import { TRANSLATIONS } from './constants/i18n';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import KanbanBoard from './components/KanbanBoard';
import { DocsView, AnalyticsView } from './components/DocsAndAnalytics';
import CommandModal from './components/CommandModal';

const SESSION_ID_KEY = 'teamsync_session_id_v2';
const getOrCreateSessionId = () => {
  try {
    let sid = localStorage.getItem(SESSION_ID_KEY);
    if (!sid || !/^sess_[a-z0-9]{5,12}$/i.test(sid)) {
      sid = 'sess_' + Math.random().toString(36).slice(2, 9);
      localStorage.setItem(SESSION_ID_KEY, sid);
    }
    return sid;
  } catch {
    return 'sess_demo01';
  }
};

const SESSION_ID = getOrCreateSessionId();
const CACHE_KEY = 'teamsync_workspace_cache_v8_' + SESSION_ID;
const FENCE = '```';
const TEAM_ROSTER = ['Faruk_Lead', 'Mert_Backend', 'Ece_Frontend', 'Zeynep_QA'];
const PLAN_PRIORITIES = ['high', 'medium', 'medium', 'low'];

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
      const savedTasks = Array.isArray(saved?.tasks) ? saved.tasks : [];
      const doneSaved = savedTasks.filter((t) => t.status === 'done').length;
      const isHealthy = savedTasks.length > 0 && savedTasks.length <= 14 && doneSaved >= 1;

      merged[id] = {
        messages:
          Array.isArray(saved?.messages) && saved.messages.length > 0
            ? saved.messages.filter((m) => !String(m._id).startsWith('ai-thinking-'))
            : fallback.messages,
        tasks: isHealthy ? savedTasks : fallback.tasks,
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
  const [lang, setLang] = useState('EN');
  const [currentRoom, setCurrentRoom] = useState('general');
  const [activeTab, setActiveTab] = useState('chat');
  const [workspaceStore, setWorkspaceStore] = useState(loadInitialStore);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [docSaveStatus, setDocSaveStatus] = useState('saved');
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isServerWarming, setIsServerWarming] = useState(false);
  const [pingMs, setPingMs] = useState(28);
  const [toastMessage, setToastMessage] = useState(null);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
  const [jwtToken, setJwtToken] = useState(() => {
    try {
      return localStorage.getItem('teamsync_jwt') || '';
    } catch {
      return '';
    }
  });

  const t = TRANSLATIONS[lang] || TRANSLATIONS.EN;
  const scopedRoom = `${SESSION_ID}:${currentRoom}`;
  const currentRoomRef = useRef(currentRoom);
  const docDebounceRef = useRef(null);
  const toastTimerRef = useRef(null);
  const aiRateRef = useRef([]);

  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  const currentRoomData = workspaceStore[currentRoom] || INITIAL_WORKSPACE_DATA.general;
  const messages = currentRoomData.messages;
  const tasks = currentRoomData.tasks;
  const sharedDoc = currentRoomData.doc;

  const updateRoom = (room, updater) => {
    const cleanRoom = room.includes(':') ? room.split(':')[1] : room;
    setWorkspaceStore((prev) => {
      const existing = prev[cleanRoom] || INITIAL_WORKSPACE_DATA[cleanRoom] || INITIAL_WORKSPACE_DATA.general;
      const updated = updater(existing);
      return { ...prev, [cleanRoom]: updated };
    });
  };

  useEffect(() => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(workspaceStore));
    } catch {}
  }, [workspaceStore]);

  const showToast = (msg) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2800);
  };

  useEffect(() => {
    try {
      localStorage.setItem('teamsync_user', username);
    } catch {}

    fetch(`${BACKEND_URL}/api/auth/demo-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.token) {
          setJwtToken(data.token);
          socket.auth = { token: data.token, username };
          try {
            localStorage.setItem('teamsync_jwt', data.token);
          } catch {}
        }
      })
      .catch(() => {});
  }, [username]);

  useEffect(() => {
    const measureWarmPing = async () => {
      const slowTimer = setTimeout(() => {
        if (!socket.connected) setIsServerWarming(true);
      }, 1500);
      try {
        const t0 = performance.now();
        const res = await fetch(`${BACKEND_URL}/api/health`, { cache: 'no-store' });
        clearTimeout(slowTimer);
        if (!res.ok) return;
        let elapsed = Math.round(performance.now() - t0);
        if (elapsed > 800) {
          const t1 = performance.now();
          await fetch(`${BACKEND_URL}/api/health`, { cache: 'no-store' });
          elapsed = Math.round(performance.now() - t1);
        }
        setPingMs(Math.max(12, Math.min(elapsed, 450)));
        setIsConnected(true);
        setIsServerWarming(false);
      } catch {
        clearTimeout(slowTimer);
        setIsConnected(socket.connected);
      }
    };

    const onConnect = () => {
      setIsConnected(true);
      setIsServerWarming(false);
      socket.emit('join_room', {
        room: `${SESSION_ID}:${currentRoomRef.current}`,
        username,
        isFocusing: isFocusActive,
        token: jwtToken
      });
      measureWarmPing();
    };

    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    measureWarmPing();
    const interval = setInterval(measureWarmPing, 20000);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      clearInterval(interval);
    };
  }, [username, isFocusActive, jwtToken]);

  useEffect(() => {
    let timer = null;
    if (isFocusActive && focusSeconds > 0) {
      timer = setInterval(() => setFocusSeconds((prev) => prev - 1), 1000);
    } else if (focusSeconds === 0) {
      setIsFocusActive(false);
      socket.emit('toggle_focus', { room: scopedRoom, username, isFocusing: false });
      showToast('🎯 Deep Work session completed!');
    }
    return () => clearInterval(timer);
  }, [isFocusActive, focusSeconds, scopedRoom, username]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsCommandOpen(false);
        setIsToolsOpen(false);
        setIsMobileSidebarOpen(false);
        setReplyingTo(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    socket.emit('join_room', {
      room: scopedRoom,
      username,
      isFocusing: isFocusActive,
      token: jwtToken
    });
  }, [scopedRoom, username, isFocusActive, jwtToken]);

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
        if (
          prev.tasks.some(
            (tItem) =>
              tItem._id === newTask._id ||
              tItem.title.trim().toLowerCase() === newTask.title.trim().toLowerCase()
          )
        ) {
          return prev;
        }
        return { ...prev, tasks: [newTask, ...prev.tasks] };
      });
    };

    const handleTaskUpdated = (updatedTask) => {
      const targetRoom = updatedTask.room || currentRoomRef.current;
      updateRoom(targetRoom, (prev) => ({
        ...prev,
        tasks: prev.tasks.map((tItem) => (tItem._id === updatedTask._id ? updatedTask : tItem))
      }));
    };

    const handleTaskDeleted = (taskId) => {
      updateRoom(currentRoomRef.current, (prev) => ({
        ...prev,
        tasks: prev.tasks.filter((tItem) => tItem._id !== taskId)
      }));
    };

    const handleDocUpdated = (content) => {
      updateRoom(currentRoomRef.current, (prev) => ({ ...prev, doc: content }));
    };

    const handleDocSavedAck = () => setDocSaveStatus('saved');

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
    updateRoom(currentRoom, (prev) => ({ ...prev, doc: val }));
    setDocSaveStatus('saving');

    socket.emit('sync_doc_live', { room: scopedRoom, content: val });

    if (docDebounceRef.current) clearTimeout(docDebounceRef.current);
    docDebounceRef.current = setTimeout(() => {
      if (socket.connected) {
        socket.emit('save_doc_db', { room: scopedRoom, content: val });
      } else {
        setDocSaveStatus('saved');
      }
    }, 800);
  };

  const checkLocalAiRateLimit = () => {
    const now = Date.now();
    aiRateRef.current = aiRateRef.current.filter((ts) => now - ts < 60_000);
    if (aiRateRef.current.length >= 5) {
      showToast('⏳ Rate Limit: Max 5 AI requests/minute allowed.');
      return false;
    }
    aiRateRef.current.push(now);
    return true;
  };

  const handleResetDemoWorkspace = () => {
    localStorage.removeItem(CACHE_KEY);
    setWorkspaceStore(INITIAL_WORKSPACE_DATA);
    setIsToolsOpen(false);
    showToast('🔄 Session sandbox restored to clean 63% Sprint state!');
  };

  const handleSimulateTeammate = () => {
    const room = currentRoom;
    setIsToolsOpen(false);
    showToast('🤖 Simulating live teammate Socket.io activity...');

    setTimeout(() => {
      const simMsg = {
        _id: makeLocalId('local-msg'),
        room,
        sender: 'Ece_Frontend (Sim)',
        senderId: 'sim-ece',
        text: '⚡ [Simulated Teammate Socket Event]: Just pushed the responsive Kanban card PR and moved my task to Done!',
        isAi: false,
        isPinned: false,
        reactions: { '🚀': 1 }
      };
      updateRoom(room, (prev) => {
        const nextTasks = prev.tasks.map((taskItem, idx) =>
          idx === prev.tasks.length - 1 && taskItem.status !== 'done'
            ? { ...taskItem, status: 'done' }
            : taskItem
        );
        return {
          ...prev,
          messages: [...prev.messages, simMsg],
          tasks: nextTasks
        };
      });
      showToast('✓ Ece_Frontend (Sim) sent a message & updated Kanban board!');
    }, 450);
  };

  const dispatchMessageOrCommand = (rawText, replyContext = null) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;
    const room = currentRoom;

    if (trimmed.startsWith('/plan ') && username !== 'Faruk_Lead') {
      const rbacMsg = {
        _id: makeLocalId('local-msg'),
        room,
        sender: 'TeamSync AI',
        senderId: 'ai-bot',
        text: `🔒 [HTTP 403 Forbidden — JWT RBAC Guard]: Signed JWT token for "${username}" carries role "Developer". Only "Tech Lead" claim is authorized to execute /plan. Switch to "👑 Tech Lead" in the bottom-left switcher.`,
        isAi: true,
        isPinned: false,
        reactions: {}
      };
      updateRoom(room, (prev) => ({ ...prev, messages: [...prev.messages, rbacMsg] }));
      showToast('🔒 403 Forbidden: Switch to Tech Lead JWT role to run /plan');
      return;
    }

    if (trimmed.startsWith('/plan ') || trimmed.startsWith('/ai ')) {
      if (!checkLocalAiRateLimit()) return;
    }

    if (trimmed.startsWith('/poll ')) {
      const parts = trimmed
        .replace('/poll ', '')
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean);

      if (parts.length >= 2) {
        const question = parts[0];
        const options = parts.slice(1).map((opt, idx) => ({ text: opt, votes: idx === 0 ? 1 : 0 }));
        const optimisticPoll = {
          _id: makeLocalId('local-msg'),
          room,
          sender: username,
          senderId: socket.id || 'local-user',
          text: `📊 Poll: ${question}`,
          poll: { question, options },
          isAi: false,
          isPinned: false,
          reactions: {}
        };
        updateRoom(room, (prev) => ({ ...prev, messages: [...prev.messages, optimisticPoll] }));
        socket.emit('send_message', {
          room: scopedRoom,
          sender: username,
          senderId: socket.id || 'local-user',
          text: trimmed,
          token: jwtToken
        });
        return;
      }
    }

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

    if (trimmed.startsWith('/plan ')) {
      const topic = trimmed.replace('/plan ', '').trim();
      if (topic) {
        const candidateTitles = [
          `${topic} - Schema & Architecture Design`,
          `${topic} - REST/Socket API & Security Guard`,
          `${topic} - UI Components & State Integration`,
          `${topic} - Automated Integration Tests`
        ];

        const existingSet = new Set(tasks.map((tItem) => tItem.title.trim().toLowerCase()));
        const uniqueTitles = candidateTitles.filter(
          (title) => !existingSet.has(title.trim().toLowerCase())
        );

        if (uniqueTitles.length === 0) {
          const dupReply = {
            _id: makeLocalId('local-msg'),
            room,
            sender: 'TeamSync AI',
            senderId: 'ai-bot',
            text: `ℹ️ [Duplicate-Preventing Guard]: Sprint tasks for "${topic}" already exist on the Kanban board.`,
            isAi: true,
            isPinned: false,
            reactions: {}
          };
          updateRoom(room, (prev) => ({ ...prev, messages: [...prev.messages, dupReply] }));
          showToast('ℹ️ Tasks already on board (duplicates prevented)');
          return;
        }

        const createdTasks = uniqueTitles.map((title, i) => ({
          _id: makeLocalId('local-task'),
          room,
          title,
          status: i === 0 ? 'in-progress' : 'todo',
          priority: PLAN_PRIORITIES[i % PLAN_PRIORITIES.length],
          assignee: TEAM_ROSTER[i % TEAM_ROSTER.length],
          subtasks: [
            { _id: makeLocalId('st'), title: 'Complete implementation', completed: i === 0 },
            { _id: makeLocalId('st'), title: 'Pass PR review & unit tests', completed: false }
          ]
        }));

        const planReply = {
          _id: makeLocalId('local-msg'),
          room,
          sender: 'TeamSync AI',
          senderId: 'ai-bot',
          text:
            `🚀 [🛡️ Deterministic Fallback Template]: Added ${uniqueTitles.length} sprint tasks for "${topic}":\n` +
            uniqueTitles
              .map(
                (tTitle, i) =>
                  `• [${PLAN_PRIORITIES[i % PLAN_PRIORITIES.length].toUpperCase()}] ${tTitle} → @${TEAM_ROSTER[i % TEAM_ROSTER.length]}`
              )
              .join('\n'),
          isAi: true,
          isPinned: false,
          reactions: {}
        };

        updateRoom(room, (prev) => ({
          ...prev,
          tasks: [...createdTasks, ...prev.tasks],
          messages: [...prev.messages, planReply]
        }));
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
        text:
          `🤖 [🛡️ Deterministic Fallback Template — "${prompt}"]:\n` +
          FENCE +
          `javascript\nimport jwt from 'jsonwebtoken';\n\nexport const workspaceGuard = (allowedRoles = ['Tech Lead']) => (req, res, next) => {\n  try {\n    const token = req.headers.authorization?.split(' ')[1];\n    const { username, role } = jwt.verify(token, process.env.JWT_SECRET);\n    if (!role || !allowedRoles.includes(role)) {\n      return res.status(403).json({ message: 'RBAC: Insufficient permissions' });\n    }\n    req.user = { username, role };\n    return next();\n  } catch {\n    return res.status(401).json({ message: 'Invalid or missing token' });\n  }\n};\n` +
          FENCE,
        isAi: true,
        isPinned: false,
        reactions: {}
      };
      updateRoom(room, (prev) => ({ ...prev, messages: [...prev.messages, aiReply] }));
      return;
    }

    if (trimmed.startsWith('/task ')) {
      const taskTitle = trimmed.replace('/task ', '').trim();
      if (taskTitle) {
        const localTask = {
          _id: makeLocalId('local-task'),
          room,
          title: taskTitle,
          status: 'todo',
          priority: 'medium',
          assignee: username,
          subtasks: [
            { _id: makeLocalId('st'), title: 'Analyze technical requirements', completed: false },
            { _id: makeLocalId('st'), title: 'Implement & add unit tests', completed: false }
          ]
        };
        const botReply = {
          _id: makeLocalId('local-msg'),
          room,
          sender: 'TeamSync AI',
          senderId: 'ai-bot',
          text: `✅ Task "${taskTitle}" added to Kanban board (@${username}).`,
          isAi: true,
          isPinned: false,
          reactions: {}
        };
        updateRoom(room, (prev) => ({
          ...prev,
          tasks: [localTask, ...prev.tasks],
          messages: [...prev.messages, botReply]
        }));
      }
      return;
    }

    socket.emit('send_message', {
      room: scopedRoom,
      sender: username,
      senderId: socket.id || 'local-user',
      text: trimmed,
      replyTo: optimisticMsg.replyTo,
      token: jwtToken
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
      showToast('⚠️ Web Speech API is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'EN' ? 'en-US' : 'tr-TR';
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
    setIsMobileSidebarOpen(false);
    dispatchMessageOrCommand(commandText, null);
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;
    if (tasks.some((tItem) => tItem.title.trim().toLowerCase() === title.toLowerCase())) {
      showToast('ℹ️ Task with this title already exists.');
      return;
    }
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
      room: scopedRoom,
      title,
      priority: newTaskPriority,
      assignee: username,
      subtasks: []
    });
    setNewTaskTitle('');
    showToast('✅ New task added to Kanban board');
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
  };

  const handlePinMessage = (messageId) => {
    updateRoom(currentRoom, (prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m._id === messageId ? { ...m, isPinned: !m.isPinned } : m
      )
    }));
    showToast('📌 Pin status updated');
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
    showToast('🗳️ Vote recorded in real-time');
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
      subtasks: [{ _id: makeLocalId('st'), title: 'Review message context', completed: false }]
    };
    updateRoom(currentRoom, (prev) => ({
      ...prev,
      tasks: [optimisticTask, ...prev.tasks]
    }));
    setActiveTab('board');
    showToast('📋 Message converted to Kanban task');
  };

  const handleStatusChange = (taskId, status) => {
    updateRoom(currentRoom, (prev) => ({
      ...prev,
      tasks: prev.tasks.map((tItem) => (tItem._id === taskId ? { ...tItem, status } : tItem))
    }));
    showToast(`🔄 Task moved to "${status}"`);
  };

  const handleDeleteTask = (taskId) => {
    const target = tasks.find((tItem) => tItem._id === taskId);
    if (target?.priority === 'high' && username !== 'Faruk_Lead') {
      showToast('🔒 403 Forbidden: Only Tech Lead JWT role can delete High-priority tasks');
      return;
    }
    updateRoom(currentRoom, (prev) => ({
      ...prev,
      tasks: prev.tasks.filter((tItem) => tItem._id !== taskId)
    }));
    socket.emit('delete_task', { room: scopedRoom, taskId, token: jwtToken });
    showToast('🗑️ Task deleted');
  };

  const handleAddSubtask = (taskId, title) => {
    updateRoom(currentRoom, (prev) => ({
      ...prev,
      tasks: prev.tasks.map((tItem) =>
        tItem._id === taskId
          ? {
              ...tItem,
              subtasks: [
                ...(tItem.subtasks || []),
                { _id: makeLocalId('st'), title, completed: false }
              ]
            }
          : tItem
      )
    }));
  };

  const handleToggleSubtask = (taskId, subtaskId) => {
    updateRoom(currentRoom, (prev) => ({
      ...prev,
      tasks: prev.tasks.map((tItem) =>
        tItem._id === taskId
          ? {
              ...tItem,
              subtasks: (tItem.subtasks || []).map((st) =>
                st._id === subtaskId ? { ...st, completed: !st.completed } : st
              )
            }
          : tItem
      )
    }));
  };

  const exportSprintReport = (format = 'md') => {
    const doneTasks = tasks.filter((tItem) => tItem.status === 'done');
    const inProgressTasks = tasks.filter((tItem) => tItem.status === 'in-progress');
    const todoTasks = tasks.filter((tItem) => tItem.status === 'todo');

    let content = '';
    const filename = `teamsync-${currentRoom}-report.${format}`;

    if (format === 'json') {
      content = JSON.stringify({ room: currentRoom, sessionId: SESSION_ID, tasks, messagesCount: messages.length }, null, 2);
    } else {
      content = `# TeamSync AI - #${currentRoom} Sprint Report\n\n`;
      content += `- **Total Tasks:** ${tasks.length} | **Done:** ${doneTasks.length} | **In Progress:** ${inProgressTasks.length} | **To Do:** ${todoTasks.length}\n\n`;
      content +=
        `## Completed Tasks\n` +
        (doneTasks.map((tItem) => `- [x] ${tItem.title} (${tItem.assignee})`).join('\n') || 'None yet.') +
        `\n\n`;
      content += `## Shared Channel Document\n${sharedDoc}\n`;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`⬇ Sprint report exported (.${format})`);
  };

  const activeChannel = CHANNELS.find((c) => c.id === currentRoom);
  const filteredMessages = messages.filter((m) => {
    const matchesSearch =
      m.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sender.toLowerCase().includes(searchQuery.toLowerCase());
    return showPinnedOnly ? matchesSearch && m.isPinned : matchesSearch;
  });

  const filteredTasks = tasks.filter((tItem) => {
    const matchesSearch = tItem.title.toLowerCase().includes(searchQuery.toLowerCase());
    return priorityFilter === 'all' ? matchesSearch : matchesSearch && tItem.priority === priorityFilter;
  });

  const doneCount = tasks.filter((tItem) => tItem.status === 'done').length;
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

      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden flex"
        >
          <div onClick={(e) => e.stopPropagation()} className="h-full">
            <Sidebar
              lang={lang}
              currentRoom={currentRoom}
              setCurrentRoom={(room) => {
                setCurrentRoom(room);
                setIsMobileSidebarOpen(false);
                showToast(`#${room}`);
              }}
              progressPercent={progressPercent}
              doneCount={doneCount}
              totalTasks={tasks.length}
              focusSeconds={focusSeconds}
              isFocusActive={isFocusActive}
              toggleFocusTimer={() => {
                const next = !isFocusActive;
                setIsFocusActive(next);
                socket.emit("toggle_focus", { room: scopedRoom, username, isFocusing: next });
              }}
              resetFocusTimer={() => {
                setIsFocusActive(false);
                setFocusSeconds(25 * 60);
                socket.emit("toggle_focus", { room: scopedRoom, username, isFocusing: false });
              }}
              triggerQuickCommand={triggerQuickCommand}
              onlineUsers={onlineUsers}
              username={username}
              setUsername={(name) => {
                setUsername(name);
                const roleName = name === "Faruk_Lead" ? "Tech Lead" : "Developer";
                showToast(`🔑 Signed JWT Issued: ${name} (${roleName})`);
              }}
              onOpenCommand={() => setIsCommandOpen(true)}
            />
          </div>
        </div>
      )}

      <div className="hidden lg:flex h-full">
        <Sidebar
          lang={lang}
          currentRoom={currentRoom}
          setCurrentRoom={(room) => {
            setCurrentRoom(room);
            showToast(`#${room}`);
          }}
          progressPercent={progressPercent}
          doneCount={doneCount}
          totalTasks={tasks.length}
          focusSeconds={focusSeconds}
          isFocusActive={isFocusActive}
          toggleFocusTimer={() => {
            const next = !isFocusActive;
            setIsFocusActive(next);
            socket.emit("toggle_focus", { room: scopedRoom, username, isFocusing: next });
          }}
          resetFocusTimer={() => {
            setIsFocusActive(false);
            setFocusSeconds(25 * 60);
            socket.emit("toggle_focus", { room: scopedRoom, username, isFocusing: false });
          }}
          triggerQuickCommand={triggerQuickCommand}
          onlineUsers={onlineUsers}
          username={username}
          setUsername={(name) => {
            setUsername(name);
            const roleName = name === "Faruk_Lead" ? "Tech Lead" : "Developer";
            showToast(`🔑 Signed JWT Issued: ${name} (${roleName})`);
          }}
          onOpenCommand={() => setIsCommandOpen(true)}
        />
      </div>

      <main className="flex-1 min-w-0 flex flex-col bg-slate-900/60">
        {isServerWarming && !isConnected && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 text-[11px] text-amber-200 flex items-center justify-between">
            <span>⚡ Render free-tier container is waking up (~20s) — workspace is running instantaneously via isolated session cache.</span>
            <span className="font-mono">Session: {SESSION_ID}</span>
          </div>
        )}

        <header className="h-14 border-b border-slate-800/80 px-4 flex items-center justify-between gap-2 bg-slate-950/60 backdrop-blur shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              aria-label="Toggle navigation drawer"
              onClick={() => setIsMobileSidebarOpen((v) => !v)}
              className="lg:hidden px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs cursor-pointer"
            >
              ☰
            </button>

            <div className="hidden xl:flex items-center gap-1 shrink-0">
              <span className="text-base font-bold text-blue-400">#</span>
              <h2 className="font-semibold text-sm truncate">{activeChannel?.name}</h2>
            </div>

            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0 overflow-x-auto">
              {[
                { id: "chat", label: `💬 ${t.chatTab} (${messages.length})` },
                { id: "board", label: `📋 ${t.kanbanTab} (${tasks.length})` },
                { id: "docs", label: `📝 ${t.docsTab}` },
                { id: "analytics", label: `📊 ${t.analyticsTab}` }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                    activeTab === tab.id ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              type="text"
              aria-label="Search messages and tasks"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="hidden md:block bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 w-32"
            />

            <div className="text-[11px] px-2.5 py-1 rounded-full border flex items-center gap-1.5 whitespace-nowrap bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {isConnected ? `${t.live} (${pingMs}ms)` : t.liveWorkspace}
            </div>

            <button
              type="button"
              aria-label="Switch interface language"
              onClick={() => setLang((l) => (l === "EN" ? "TR" : "EN"))}
              className="text-xs px-2.5 py-1 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-blue-300 font-semibold whitespace-nowrap cursor-pointer transition"
            >
              🌐 {lang}
            </button>

            <div className="relative">
              <button
                type="button"
                aria-label="Open Demo Tools Menu"
                onClick={() => setIsToolsOpen((v) => !v)}
                className="text-xs px-3 py-1 rounded-xl border border-indigo-500/40 bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-200 font-medium whitespace-nowrap cursor-pointer transition flex items-center gap-1"
              >
                ⚡ {t.demoTools} ▾
              </button>

              {isToolsOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 space-y-1">
                  <button
                    type="button"
                    onClick={handleSimulateTeammate}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-indigo-200 hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                  >
                    <span>🤖 {t.simulateTeammate}</span>
                    <span className="text-[10px] text-slate-400">Socket</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowPinnedOnly(!showPinnedOnly);
                      setIsToolsOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-amber-200 hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                  >
                    <span>📌 {t.pinnedOnly}</span>
                    <span className="text-[10px] text-slate-400">({pinnedCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetDemoWorkspace}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-rose-300 hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                  >
                    <span>🔄 {t.resetDemo}</span>
                    <span className="text-[10px] text-slate-400">63%</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {activeTab === "chat" && (
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

        {activeTab === "board" && (
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

        {activeTab === "docs" && (
          <DocsView
            currentRoom={currentRoom}
            sharedDoc={sharedDoc}
            handleDocChange={handleDocChange}
            docSaveStatus={docSaveStatus}
          />
        )}

        {activeTab === "analytics" && (
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
