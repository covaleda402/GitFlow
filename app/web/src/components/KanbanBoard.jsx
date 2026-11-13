import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  GitCommit, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Flame, 
  User, 
  Filter, 
  ShieldCheck, 
  Eye, 
  Archive 
} from 'lucide-react';

const COLUMNS = [
  { id: 'TODO', title: 'Por Hacer', color: 'border-slate-300 dark:border-slate-700', badge: 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
  { id: 'IN_PROGRESS', title: 'En Progreso', color: 'border-blue-500/50', badge: 'bg-blue-500/10 text-blue-600 dark:text-brand-blue' },
  { id: 'REVIEW', title: 'En Revisión / PR', color: 'border-purple-500/50', badge: 'bg-purple-500/10 text-purple-600 dark:text-brand-violet' },
  { id: 'DONE', title: 'Terminada (Historial)', color: 'border-emerald-500/50', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' }
];

export default function KanbanBoard({ projectId = 1, onSwitchToHistory }) {
  const { socket } = useSocket();
  const { user, token } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [isOwnerView, setIsOwnerView] = useState(false);
  const [viewScope, setViewScope] = useState('ALL'); // 'ALL' | 'MY_TASKS'
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState('ALL');

  // New Task Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newAssignedUser, setNewAssignedUser] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load Tasks
  const loadTasks = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks);
        setIsOwnerView(data.isOwnerView);
      }
    } catch (err) {
      console.error('[Kanban] Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setTeamUsers(data.users);
      }
    } catch (err) {
      console.error('[Kanban] Error loading team users:', err);
    }
  };

  useEffect(() => {
    loadTasks();
    loadUsers();
  }, [projectId, token]);

  // WebSocket Live Updates
  useEffect(() => {
    if (!socket) return;

    const handleTaskUpdated = (updatedTask) => {
      setTasks(prev => {
        // If task transitioned to DONE and archived, filter it out or update
        if (updatedTask.status === 'DONE' && updatedTask.is_archived) {
          return prev.filter(t => t.id !== updatedTask.id);
        }
        return prev.map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } : t);
      });
    };

    const handleTaskCreated = (newTask) => {
      setTasks(prev => {
        if (prev.some(t => t.id === newTask.id)) return prev;
        return [...prev, newTask];
      });
    };

    socket.on('task_status_changed', handleTaskUpdated);
    socket.on('task_created', handleTaskCreated);

    return () => {
      socket.off('task_status_changed', handleTaskUpdated);
      socket.off('task_created', handleTaskCreated);
    };
  }, [socket]);

  // Move status handler
  const handleMoveStatus = async (taskId, nextStatus) => {
    try {
      if (nextStatus === 'DONE') {
        // Optimistically remove from active board and move to history
        setTasks(prev => prev.filter(t => t.id !== taskId));
      } else {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus } : t));
      }

      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!res.ok) {
        loadTasks();
      }
    } catch (err) {
      console.error('Error updating status:', err);
      loadTasks();
    }
  };

  // Create Task handler
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          priority: newPriority,
          assigned_to_user_id: newAssignedUser ? parseInt(newAssignedUser, 10) : user?.id
        })
      });

      const data = await res.json();
      if (res.ok && data.task) {
        setIsModalOpen(false);
        setNewTitle('');
        setNewDescription('');
        setNewPriority('MEDIUM');
        setNewAssignedUser('');
        setTasks(prev => [...prev, data.task]);
      }
    } catch (err) {
      console.error('Error creating task:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'URGENT':
        return <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/30 font-semibold"><Flame className="w-3 h-3" /> Urgente</span>;
      case 'HIGH':
        return <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30 font-semibold"><AlertCircle className="w-3 h-3" /> Alta</span>;
      case 'LOW':
        return <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">Baja</span>;
      default:
        return <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/30 font-semibold">Media</span>;
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (viewScope === 'MY_TASKS') {
      return task.assigned_to_user_id === user?.id || task.created_by_user_id === user?.id;
    }
    if (filterUser !== 'ALL') {
      return String(task.assigned_to_user_id) === String(filterUser);
    }
    return true;
  });

  return (
    <div className="w-full space-y-4">
      
      {/* Privacy Notice Banner & Scope Switcher */}
      <div className={`p-3.5 rounded-2xl border text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isOwnerView 
          ? 'bg-cyan-500/10 border-cyan-500/30 text-slate-800 dark:text-brand-cyan' 
          : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-300'
      }`}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 text-cyan-600 dark:text-brand-cyan" />
          <span>
            {isOwnerView 
              ? '👑 Vista de Administrador/Creador: Supervisión completa de todo el equipo.'
              : '🔒 Vista Personal: Solo ves tus tareas asignadas. El creador de la sala supervisa el equipo completo.'}
          </span>
        </div>

        {/* Scope Toggle for Owner */}
        {isOwnerView && (
          <div className="flex items-center bg-white dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl p-0.5 self-start sm:self-auto shrink-0 shadow-xs">
            <button
              onClick={() => setViewScope('ALL')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                viewScope === 'ALL'
                  ? 'bg-cyan-500/20 text-cyan-700 dark:text-brand-cyan shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Todo el Equipo
            </button>
            <button
              onClick={() => setViewScope('MY_TASKS')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                viewScope === 'MY_TASKS'
                  ? 'bg-cyan-500/20 text-cyan-700 dark:text-brand-cyan shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Mis Tareas
            </button>
          </div>
        )}
      </div>

      {/* Kanban Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Tablero Ágil & Telemetría
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Vinculación automática mediante commits <code className="text-brand-cyan font-mono">#ID</code> y cierre con <code className="text-emerald-500 font-mono">fixes #ID</code>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter by Member (if Owner) */}
          {isOwnerView && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-dark-900 border border-slate-200 dark:border-slate-700/80 rounded-xl px-2.5 py-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none text-xs"
              >
                <option value="ALL">Todos los asignados</option>
                {teamUsers.map(u => (
                  <option key={u.id} value={u.id}>@{u.username}</option>
                ))}
              </select>
            </div>
          )}

          {/* New Task Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-brand-cyan text-dark-950 hover:bg-cyan-300 transition-all shadow-md shadow-brand-cyan/20"
          >
            <Plus className="w-4 h-4" />
            Nueva Tarea
          </button>
        </div>
      </div>

      {/* Kanban Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map(col => {
          const columnTasks = filteredTasks.filter(t => t.status === col.id);

          return (
            <div 
              key={col.id} 
              className="flex flex-col rounded-2xl bg-slate-100/70 dark:bg-dark-900/40 border border-slate-200 dark:border-slate-800/80 p-3 min-h-[480px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wide flex items-center gap-2">
                  {col.title}
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${col.badge}`}>
                    {columnTasks.length}
                  </span>
                </span>
              </div>

              {/* Task Cards Container */}
              <div className="space-y-3 flex-1">
                {columnTasks.map(task => (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-2xl glass-card transition-all hover:shadow-lg group relative border border-slate-200 dark:border-slate-800"
                  >
                    {/* Top: ID & Priority */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-mono font-bold text-brand-cyan px-2 py-0.5 rounded bg-brand-cyan/10 border border-brand-cyan/25">
                        #{task.id}
                      </span>
                      {getPriorityBadge(task.priority)}
                    </div>

                    {/* Title */}
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-cyan transition-colors line-clamp-2">
                      {task.title}
                    </h4>

                    {/* Description */}
                    {task.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    {/* Bottom: Assignee & Commits count */}
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/70 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {task.assigned_avatar_url ? (
                          <img
                            src={task.assigned_avatar_url}
                            alt={task.assigned_username || 'dev'}
                            className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700 object-cover"
                            title={`Asignado a: @${task.assigned_username}`}
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-500">
                            <User className="w-3 h-3" />
                          </div>
                        )}
                        <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono truncate max-w-[85px]">
                          {task.assigned_username ? `@${task.assigned_username}` : 'Sin asignar'}
                        </span>
                      </div>

                      <div 
                        className={`flex items-center gap-1 text-[11px] font-mono ${
                          task.commits_count > 0 ? 'text-brand-cyan' : 'text-slate-400'
                        }`}
                        title={`${task.commits_count} commits vinculados`}
                      >
                        <GitCommit className="w-3.5 h-3.5" />
                        <span>{task.commits_count}</span>
                      </div>
                    </div>

                    {/* Status Action Buttons */}
                    <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800/50 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Mover:</span>
                      <div className="flex items-center gap-1">
                        {COLUMNS.filter(c => c.id !== task.status).map(targetCol => (
                          <button
                            key={targetCol.id}
                            onClick={() => handleMoveStatus(task.id, targetCol.id)}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-brand-cyan/20 text-slate-700 dark:text-slate-300 transition-colors font-mono"
                            title={`Mover a ${targetCol.title}`}
                          >
                            {targetCol.id === 'DONE' ? 'Terminar' : targetCol.title.substring(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                ))}

                {columnTasks.length === 0 && (
                  <div className="h-32 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl flex items-center justify-center text-xs text-slate-400 font-mono">
                    Vacío
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-lg p-6 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl bg-white dark:bg-dark-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-cyan" />
                Crear Nueva Tarea
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1">Título de la Tarea:</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                  placeholder="ej. Implementar rotación de código cada 5 minutos"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1">Descripción / Criterios:</label>
                <textarea
                  rows="3"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan resize-none"
                  placeholder="Detalles técnicos y criterios de aceptación..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1">Prioridad:</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                  >
                    <option value="LOW">Baja</option>
                    <option value="MEDIUM">Media</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1">Asignar Desarrollador:</label>
                  <select
                    value={newAssignedUser}
                    onChange={(e) => setNewAssignedUser(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                  >
                    <option value="">A mí mismo</option>
                    {teamUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name || u.username} (@{u.username})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-cyan text-dark-950 hover:bg-cyan-300 shadow-md shadow-brand-cyan/20 disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Crear Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
