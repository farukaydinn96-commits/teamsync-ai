export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

export const CHANNELS = [
  { id: 'general', name: 'general', desc: 'Genel takım içi iletişim', badge: 'Ana Kanal' },
  { id: 'development', name: 'development', desc: 'Mimari, PR ve kod tartışmaları', badge: 'Teknik' },
  { id: 'sprint-planning', name: 'sprint-planning', desc: 'Görevler ve yol haritası', badge: 'Planlama' }
];

export const COLUMNS = [
  { id: 'todo', title: 'Yapılacaklar', dot: 'bg-slate-400', border: 'border-slate-800' },
  { id: 'in-progress', title: 'Sürüyor', dot: 'bg-amber-400', border: 'border-amber-500/20' },
  { id: 'done', title: 'Tamamlandı', dot: 'bg-emerald-400', border: 'border-emerald-500/20' }
];

export const PRIORITY_STYLES = {
  low: 'bg-slate-800 text-slate-300 border-slate-700',
  medium: 'bg-blue-950/60 text-blue-300 border-blue-500/30',
  high: 'bg-rose-950/60 text-rose-300 border-rose-500/30'
};

export const QUICK_EMOJIS = ['🚀', '🔥', '👍', '❤️'];

export const DEMO_PROFILES = [
  { label: '👑 Tech Lead (Faruk)', name: 'Faruk_Lead' },
  { label: '⚡ Frontend Dev', name: 'Ece_Frontend' },
  { label: '🛠️ Backend Dev', name: 'Mert_Backend' }
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