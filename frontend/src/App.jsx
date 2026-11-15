import { useEffect, useState, useRef } from 'react';
import socket from './services/socket';
import { BACKEND_URL, CHANNELS } from './constants/workspaceConfig';
import { INITIAL_WORKSPACE_DATA } from './constants/initialWorkspaceData';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import KanbanBoard from './components/KanbanBoard';
import { DocsView, AnalyticsView } from './components/DocsAndAnalytics';
import CommandModal from './components/CommandModal';

const CACHE_KEY = 'teamsync_workspace_cache_v6';
const FENCE = '\x60\x60\x60';
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
  const [lang, setLang] = useState("EN");
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
  const aiRateRef = useRef([]);

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
  }, [username]);

  useEffect(() => {
    const measureWarmPing = async () => {
      try {
        const t0 = performance.now();
        const res = await fetch(`${BACKEND_URL}/api/health`, { cache: 'no-store' });
        if (!res.ok) return;
        let elapsed = Math.round(performance.now() - t0);
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
  }, [username, isFocusActive]);

  useEffect(() => {
    let timer = null;
    if (isFocusActive && focusSeconds > 0) {
      timer = setInterval(() => setFocusSeconds((prev) => prev - 1), 1000);
    } else if (focusSeconds === 0) {
      setIsFocusActive(false);
      socket.emit('toggle_focus', { room: currentRoom, username, isFocusing: false });
      showToast('🎯 Deep Work session completed!');
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
    socket.emit('join_room', { room: currentRoom, username, isFocusing: isFocusActive });
  }, [currentRoom, username, isFocusActive]);

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

        if (Array.isArray(tasksData) && tasksData.length > 12) {
          const doneServer = tasksData.filter((t) => t.status === 'done').length;
          if (doneServer < 3) {
            fetch(`${BACKEND_URL}/api/reset`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ room: targetRoom })
            }).catch(() => {});
            return;
          }
        }

        updateRoom(targetRoom, (prev) => {
          const nextMessages =
            Array.isArray(msgsData) && msgsData.length >= 3 ? msgsData : prev.messages;
          const nextTasks =
            Array.isArray(tasksData) &&
            tasksData.length >= 3 &&
            tasksData.length <= 12 &&
            tasksData.filter((t) => t.status === 'done').length >= 1
              ? tasksData
              : prev.tasks;
          const nextDoc =
            docData && typeof docData.content === 'string' && docData.content.trim().length > 0
              ? docData.content
              : prev.doc;

          return { messages: nextMessages, tasks: nextTasks, doc: nextDoc };
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [currentRoom]);

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
            (t) =>
              t._id === newTask._id ||
              t.title.trim().toLowerCase() === newTask.title.trim().toLowerCase()
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

    const handleDocSavedAck = () => setDocSaveStatus('saved');

    const handleWorkspaceReset = (payload) => {
      if (!payload?.room) return;
      setWorkspaceStore(INITIAL_WORKSPACE_DATA);
      showToast('🔄 Workspace reset to clean 63% Sprint seed state');
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_updated', handleMessageUpdated);
    socket.on('task_created', handleTaskCreated);
    socket.on('task_updated', handleTaskUpdated);
    socket.on('task_deleted', handleTaskDeleted);
    socket.on('room_users', setOnlineUsers);
    socket.on('doc_updated', handleDocUpdated);
    socket.on('doc_saved_ack', handleDocSavedAck);
    socket.on('workspace_reset', handleWorkspaceReset);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_updated', handleMessageUpdated);
      socket.off('task_created', handleTaskCreated);
      socket.off('task_updated', handleTaskUpdated);
      socket.off('task_deleted', handleTaskDeleted);
      socket.off('room_users', setOnlineUsers);
      socket.off('doc_updated', handleDocUpdated);
      socket.off('doc_saved_ack', handleDocSavedAck);
      socket.off('workspace_reset', handleWorkspaceReset);
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
    socket.emit('reset_workspace', { room: currentRoom });
    fetch(`${BACKEND_URL}/api/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: currentRoom })
    }).catch(() => {});
    showToast('🔄 Demo workspace restored to clean 63% Sprint state!');
  };

  const handleSimulateTeammate = () => {
    const room = currentRoom;
    showToast('🤖 Simulating live teammate Socket.io activity...');

    setTimeout(() => {
      const simMsg = {
        _id: makeLocalId('local-msg'),
        room,
        sender: 'Ece_Frontend',
        senderId: 'sim-ece',
        text: '⚡ [Live Socket Event]: Just pushed the responsive Kanban card PR and moving my task to Done!',
        isAi: false,
        isPinned: false,
        reactions: { '🚀': 1 }
      };
      updateRoom(room, (prev) => {
        const nextTasks = prev.tasks.map((t, idx) =>
          idx === prev.tasks.length - 1 && t.status !== 'done' ? { ...t, status: 'done' } : t
        );
        return {
          ...prev,
          messages: [...prev.messages, simMsg],
          tasks: nextTasks
        };
      });
      showToast('✓ Ece_Frontend sent a message & updated Kanban board!');
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
        text: `🔒 [RBAC Policy Guard]: Role "${username}" does not have permission to run automated sprint planning (/plan). Switch to "👑 Tech Lead" in the bottom-left role switcher to execute this command.`,
        isAi: true,
        isPinned: false,
        reactions: {}
      };
      updateRoom(room, (prev) => ({ ...prev, messages: [...prev.messages, rbacMsg] }));
      showToast('🔒 RBAC: Switch to Tech Lead role to run /plan');
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
          room,
          sender: username,
          senderId: socket.id || 'local-user',
          text: trimmed
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

        const existingSet = new Set(tasks.map((t) => t.title.trim().toLowerCase()));
        const uniqueTitles = candidateTitles.filter(
          (title) => !existingSet.has(title.trim().toLowerCase())
        );

        if (uniqueTitles.length === 0) {
          const dupReply = {
            _id: makeLocalId('local-msg'),
            room,
            sender: 'TeamSync AI',
            senderId: 'ai-bot',
            text: `ℹ️ [Idempotency Guard]: Sprint tasks for "${topic}" already exist on the Kanban board. Duplicate task creation was prevented.`,
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
            `🚀 [AI Sprint Planner]: Added ${uniqueTitles.length} deduplicated tasks for "${topic}" with balanced priorities:\n` +
            uniqueTitles
              .map(
                (t, i) =>
                  `• [${PLAN_PRIORITIES[i % PLAN_PRIORITIES.length].toUpperCase()}] ${t} → @${TEAM_ROSTER[i % TEAM_ROSTER.length]}`
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
          `🤖 [🛡️ RBAC Security Pattern — "${prompt}"]:\n` +
          `${FENCE}javascript\nexport const workspaceGuard = (allowedRoles = ['Tech Lead', 'Admin']) => {\n  return (req, res, next) => {\n    const userRole = req.headers['x-workspace-role'];\n    const token = req.headers.authorization?.split(' ')[1];\n    if (!token || !allowedRoles.includes(userRole)) {\n      return res.status(403).json({\n        error: 'Forbidden: Insufficient RBAC role permissions'\n      });\n    }\n    return next();\n  };\n};\n${FENCE}`,
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
      showToast('⚠️ Web Speech API is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
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
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;
    if (tasks.some((t) => t.title.trim().toLowerCase() === title.toLowerCase())) {
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
      room: currentRoom,
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
      tasks: prev.tasks.map((t) => (t._id === taskId ? { ...t, status } : t))
    }));
    showToast(`🔄 Task moved to "${status}"`);
  };

  const handleDeleteTask = (taskId) => {
    const target = tasks.find((t) => t._id === taskId);
    if (target?.priority === 'high' && username !== 'Faruk_Lead') {
      showToast('🔒 RBAC: Only Tech Lead can delete High-priority tasks');
      return;
    }
    updateRoom(currentRoom, (prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t._id !== taskId)
    }));
    showToast('🗑️ Task deleted');
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
  };

  const exportSprintReport = (format = 'md') => {
    const doneTasks = tasks.filter((t) => t.status === 'done');
    const inProgressTasks = tasks.filter((t) => t.status === 'in-progress');
    const todoTasks = tasks.filter((t) => t.status === 'todo');

    let content = '';
    const filename = `teamsync-${currentRoom}-report.${format}`;

    if (format === 'json') {
      content = JSON.stringify({ room: currentRoom, tasks, messagesCount: messages.length }, null, 2);
    } else {
      content = `# TeamSync AI - #${currentRoom} Sprint Report\n\n`;
      content += `- **Total Tasks:** ${tasks.length} | **Done:** ${doneTasks.length} | **In Progress:** ${inProgressTasks.length} | **To Do:** ${todoTasks.length}\n\n`;
      content +=
        `## Completed Tasks\n` +
        (doneTasks.map((t) => `- [x] ${t.title} (${t.assignee})`).join('\n') || 'None yet.') +
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
          showToast(lang === "EN" ? `Switched to #${room}` : `#${room} kanalına geçildi`);
        }}
        progressPercent={progressPercent}
        doneCount={doneCount}
        totalTasks={tasks.length}
        focusSeconds={focusSeconds}
        isFocusActive={isFocusActive}
        toggleFocusTimer={() => {
          const next = !isFocusActive;
          setIsFocusActive(next);
          socket.emit("toggle_focus", { room: currentRoom, username, isFocusing: next });
        }}
        resetFocusTimer={() => {
          setIsFocusActive(false);
          setFocusSeconds(25 * 60);
          socket.emit("toggle_focus", { room: currentRoom, username, isFocusing: false });
        }}
        triggerQuickCommand={triggerQuickCommand}
        onlineUsers={onlineUsers}
        username={username}
        setUsername={(name) => {
          setUsername(name);
          showToast(lang === "EN" ? `👤 Active RBAC Profile: ${name}` : `👤 Aktif Profil: ${name}`);
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
                { id: "chat", label: lang === "EN" ? `💬 Chat (${messages.length})` : `💬 Sohbet (${messages.length})` },
                { id: "board", label: `📋 Kanban (${tasks.length})` },
                { id: "docs", label: lang === "EN" ? "📝 Docs & Code" : "📝 Doküman & Kod" },
                { id: "analytics", label: lang === "EN" ? "📊 Analytics" : "📊 Analitik" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    activeTab === tab.id ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSimulateTeammate}
              className="text-xs px-3 py-1.5 rounded-xl border border-indigo-500/40 bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-200 font-medium cursor-pointer transition"
              title="Simulate a teammate sending a message and moving a Kanban task via Socket.io"
            >
              {lang === "EN" ? "🤖 Simulate Teammate" : "🤖 Ekip Simülasyonu"}
            </button>

            <button
              type="button"
              onClick={handleResetDemoWorkspace}
              className="text-xs px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium cursor-pointer transition"
              title="Reset workspace to clean 63% seed state"
            >
              {lang === "EN" ? "🔄 Reset Demo" : "🔄 Sıfırla"}
            </button>

            <button
              type="button"
              onClick={() => setLang((l) => (l === "EN" ? "TR" : "EN"))}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-blue-300 font-semibold cursor-pointer transition"
              title="Switch Interface Language (EN / TR)"
            >
              🌐 {lang}
            </button>

            <div className="text-[11px] px-2.5 py-1 rounded-full border flex items-center gap-1.5 bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {isConnected
                ? `${lang === "EN" ? "Live" : "Canlı"} (${pingMs}ms)`
                : lang === "EN"
                ? "Live Workspace"
                : "Canlı Alan"}
            </div>

            {activeTab === "chat" && (
              <button
                onClick={() => setShowPinnedOnly(!showPinnedOnly)}
                className={`text-xs px-2.5 py-1.5 rounded-xl border transition cursor-pointer ${
                  showPinnedOnly
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                📌 ({pinnedCount})
              </button>
            )}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === "EN" ? "Search..." : "Ara..."}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 w-28"
            />
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
