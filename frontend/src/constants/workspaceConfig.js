export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

export const CHANNELS = [
  { id: 'general', name: 'general', desc: 'Core engineering communication & live polls', badge: 'Main' },
  { id: 'development', name: 'development', desc: 'Architecture, PRs & RBAC middleware', badge: 'Tech' },
  { id: 'sprint-planning', name: 'sprint-planning', desc: 'Sprint velocity & AI task breakdown', badge: 'Agile' }
];

export const COLUMNS = [
  { id: 'todo', title: 'To Do / Yapılacak', dot: 'bg-slate-400', border: 'border-slate-800' },
  { id: 'in-progress', title: 'In Progress / Sürüyor', dot: 'bg-amber-400', border: 'border-amber-500/20' },
  { id: 'done', title: 'Done / Tamamlandı', dot: 'bg-emerald-400', border: 'border-emerald-500/20' }
];

export const PRIORITY_STYLES = {
  low: 'bg-slate-800 text-slate-300 border-slate-700',
  medium: 'bg-blue-950/60 text-blue-300 border-blue-500/30',
  high: 'bg-rose-950/60 text-rose-300 border-rose-500/30'
};

export const QUICK_EMOJIS = ['🚀', '🔥', '👍', '❤️'];

export const DEMO_PROFILES = [
  { label: '👑 Tech Lead (Admin)', name: 'Faruk_Lead', role: 'Tech Lead' },
  { label: '⚡ Frontend Dev', name: 'Ece_Frontend', role: 'Developer' },
  { label: '🛠️ Backend Dev', name: 'Mert_Backend', role: 'Developer' }
];

export const DEFAULT_TEAM_PRESENCE = [
  { username: 'Faruk_Lead', isFocusing: false },
  { username: 'Ece_Frontend', isFocusing: true },
  { username: 'Mert_Backend', isFocusing: false }
];

const AVATAR_COLORS = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-blue-600'
];

export const getAvatarGradient = (name = '') => {
  if (name === 'TeamSync AI') return 'from-purple-600 to-indigo-600';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export const getInitials = (name = '') => {
  if (name === 'TeamSync AI') return 'AI';
  return name
    .split(/[_\s-]+/)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};
