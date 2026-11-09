import { useState } from 'react';
import { COLUMNS, PRIORITY_STYLES, getAvatarGradient, getInitials } from '../constants/workspaceConfig';

export default function KanbanBoard({
  tasks,
  priorityFilter,
  setPriorityFilter,
  newTaskTitle,
  setNewTaskTitle,
  newTaskPriority,
  setNewTaskPriority,
  handleCreateTask,
  handleStatusChange,
  handleDeleteTask,
  onAddSubtask,
  handleToggleSubtask
}) {
  const [subtaskInputs, setSubtaskInputs] = useState({});
  const [dragOverCol, setDragOverCol] = useState(null);

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    if (dragOverCol !== colId) setDragOverCol(colId);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = (e, status) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      handleStatusChange(taskId, status);
    }
  };

  const submitSubtask = (e, taskId) => {
    e.preventDefault();
    const title = (subtaskInputs[taskId] || '').trim();
    if (!title) return;
    onAddSubtask(taskId, title);
    setSubtaskInputs((prev) => ({ ...prev, [taskId]: '' }));
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
        <form onSubmit={handleCreateTask} className="flex gap-3 items-center flex-1">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Yeni görev başlığı yazın..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
          />
          <select
            value={newTaskPriority}
            onChange={(e) => setNewTaskPriority(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none"
          >
            <option value="low">Düşük Öncelik</option>
            <option value="medium">Orta Öncelik</option>
            <option value="high">Yüksek Öncelik</option>
          </select>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer"
          >
            + Görev Ekle
          </button>
        </form>

        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
          {['all', 'high', 'medium', 'low'].map((prio) => (
            <button
              key={prio}
              onClick={() => setPriorityFilter(prio)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium uppercase cursor-pointer transition ${
                priorityFilter === prio ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {prio === 'all' ? 'Tümü' : prio}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          const isHighlighted = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`bg-slate-950/60 border rounded-2xl p-4 flex flex-col transition-all duration-200 ${
                isHighlighted
                  ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-950/20'
                  : col.border
              }`}
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`}></span>
                  <h3 className="font-semibold text-sm text-slate-200">{col.title}</h3>
                </div>
                <span className="text-xs bg-slate-900 border border-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full">
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                {colTasks.map((task) => {
                  const subs = task.subtasks || [];
                  const doneSubs = subs.filter((s) => s.completed).length;
                  const subPct = subs.length > 0 ? Math.round((doneSubs / subs.length) * 100) : 0;

                  return (
                    <div
                      key={task._id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task._id)}
                      className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-4 rounded-xl shadow-sm cursor-grab active:cursor-grabbing transition group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium}`}>
                          {task.priority}
                        </span>
                        <button
                          onClick={() => handleDeleteTask(task._id)}
                          className="text-slate-500 hover:text-rose-400 text-xs opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        >
                          Sil
                        </button>
                      </div>
                      <p className="text-sm font-medium text-slate-100 mb-3 leading-snug">{task.title}</p>

                      <div className="mb-3 space-y-1.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/70">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                          <span>Alt Görevler</span>
                          <span>{doneSubs}/{subs.length} (%{subPct})</span>
                        </div>
                        {subs.length > 0 && (
                          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-1.5">
                            <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${subPct}%` }} />
                          </div>
                        )}
                        {subs.map((st) => (
                          <label
                            key={st._id}
                            className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={st.completed}
                              onChange={() => handleToggleSubtask(task._id, st._id)}
                              className="rounded accent-blue-500"
                            />
                            <span className={st.completed ? 'line-through text-slate-500' : ''}>
                              {st.title}
                            </span>
                          </label>
                        ))}
                        <form onSubmit={(e) => submitSubtask(e, task._id)} className="flex gap-1 pt-1">
                          <input
                            type="text"
                            value={subtaskInputs[task._id] || ''}
                            onChange={(e) =>
                              setSubtaskInputs((prev) => ({ ...prev, [task._id]: e.target.value }))
                            }
                            placeholder="+ Alt adım ekle..."
                            className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-white outline-none focus:border-blue-500"
                          />
                        </form>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-5 h-5 rounded-md bg-gradient-to-br ${getAvatarGradient(task.assignee)} text-[9px] font-bold text-white flex items-center justify-center`}>
                            {getInitials(task.assignee)}
                          </span>
                          <span className="truncate max-w-[100px]">{task.assignee}</span>
                        </div>
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task._id, e.target.value)}
                          className="bg-slate-950 text-slate-300 rounded-lg px-2 py-1 text-[11px] outline-none border border-slate-800"
                        >
                          <option value="todo">Yapılacak</option>
                          <option value="in-progress">Sürüyor</option>
                          <option value="done">Tamamlandı</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}