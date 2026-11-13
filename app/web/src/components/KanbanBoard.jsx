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
  MoreVertical,
  ChevronRight,
  User,
  Filter
} from 'lucide-react';

const COLUMNS = [
  { id: 'TODO', title: 'Por Hacer', color: 'border-slate-700', badge: 'bg-slate-800 text-slate-300' },
  { id: 'IN_PROGRESS', title: 'En Progreso', color: 'border-brand-blue/50', badge: 'bg-blue-500/10 text-brand-blue' },
  { id: 'REVIEW', title: 'En Revisión / PR', color: 'border-brand-violet/50', badge: 'bg-purple-500/10 text-brand-violet' },
  { id: 'DONE', title: 'Completado', color: 'border-emerald-500/50', badge: 'bg-emerald-500/10 text-emerald-400' }
];

export default function KanbanBoard({ projectId = 1 }) {
  const { socket } = useSocket();
  const { user, token } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
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
      const res = await fetch(`/api/projects/${projectId}/tasks`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error('[Kanban] Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Users for Assignment
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
  }, [projectId]);

  // WebSocket Live Updates
  useEffect(() => {
    if (!socket) return;

    const handleTaskUpdated = (updatedTask) => {
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
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

  // Update Status handler
  const handleMoveStatus = async (taskId, nextStatus) => {
    try {
      // Optimistic update
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus } : t));

      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!res.ok) {
        // Revert on error
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
          assigned_to_user_id: newAssignedUser ? parseInt(newAssignedUser, 10) : null
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
        return <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30"><Flame className="w-3 h-3" /> Urgente</span>;
      case 'HIGH':
        return <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30"><AlertCircle className="w-3 h-3" /> Alta</span>;
      case 'LOW':
        return <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">Baja</span>;
      default:
        return <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">Media</span>;
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filterUser === 'ALL') return true;
    return String(task.assigned_to_user_id) === String(filterUser);
  });

  return (
    <div className="w-full space-y-6">
      
      {/* Kanban Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Tablero Ágil Conectado a Git
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Los commits con tags <code className="text-brand-cyan font-mono">#ID</code> o <code className="text-emerald-400 font-mono">fixes #ID</code> se asocian y actualizan el estado automáticamente.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter by Assignee */}
          <div className="flex items-center gap-1.5 bg-dark-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none text-xs"
            >
              <option value="ALL">Todos los asignados</option>
              {teamUsers.map(u => (
                <option key={u.id} value={u.id}>@{u.username}</option>
              ))}
            </select>
          </div>

          {/* New Task Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-cyan text-dark-950 hover:bg-cyan-300 transition-all shadow-md shadow-brand-cyan/20"
          >
            <Plus className="w-4 h-4" />
            Nueva Tarea
          </button>
        </div>
      </div>

      {/* Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map(col => {
          const columnTasks = filteredTasks.filter(t => t.status === col.id);

          return (
            <div 
              key={col.id} 
              className="flex flex-col rounded-2xl bg-dark-900/40 border border-slate-800/80 p-3 min-h-[500px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold text-slate-200 tracking-wide flex items-center gap-2">
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
                    className="p-3.5 rounded-xl glass-card transition-all hover:shadow-lg hover:shadow-cyan-950/20 group relative border border-slate-800/90"
                  >
                    {/* Task Top: ID & Priority */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-mono font-bold text-brand-cyan px-2 py-0.5 rounded bg-brand-cyan/10 border border-brand-cyan/25">
                        #{task.id}
                      </span>
                      {getPriorityBadge(task.priority)}
                    </div>

                    {/* Task Title */}
                    <h4 className="text-sm font-semibold text-slate-100 group-hover:text-brand-cyan transition-colors line-clamp-2">
                      {task.title}
                    </h4>

                    {/* Task Description */}
                    {task.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    {/* Task Bottom Details: Assignee & Commits count */}
                    <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between text-xs">
                      {/* Assignee Avatar */}
                      <div className="flex items-center gap-2">
                        {task.assigned_avatar_url ? (
                          <img
                            src={task.assigned_avatar_url}
                            alt={task.assigned_username || 'dev'}
                            className="w-5 h-5 rounded-full border border-slate-700"
                            title={`Asignado a: @${task.assigned_username}`}
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400">
                            <User className="w-3 h-3" />
                          </div>
                        )}
                        <span className="text-[11px] text-slate-400 font-mono truncate max-w-[80px]">
                          {task.assigned_username ? `@${task.assigned_username}` : 'Sin asignar'}
                        </span>
                      </div>

                      {/* Commits Badge */}
                      <div 
                        className={`flex items-center gap-1 text-[11px] font-mono ${
                          task.commits_count > 0 ? 'text-brand-cyan' : 'text-slate-500'
                        }`}
                        title={`${task.commits_count} commit(s) vinculados a esta tarea`}
                      >
                        <GitCommit className="w-3.5 h-3.5" />
                        <span>{task.commits_count}</span>
                      </div>
                    </div>

                    {/* Quick Move Action Dropdown */}
                    <div className="mt-3 pt-2 border-t border-slate-800/50 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">Mover a:</span>
                      <div className="flex items-center gap-1">
                        {COLUMNS.filter(c => c.id !== task.status).map(targetCol => (
                          <button
                            key={targetCol.id}
                            onClick={() => handleMoveStatus(task.id, targetCol.id)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
                            title={`Mover a ${targetCol.title}`}
                          >
                            {targetCol.title.substring(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                ))}

                {columnTasks.length === 0 && (
                  <div className="h-32 border border-dashed border-slate-800 rounded-xl flex items-center justify-center text-xs text-slate-600 font-mono">
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
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-cyan" />
                Crear Nueva Tarea Ágil
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Título de la Tarea:</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-dark-900 border border-slate-700 text-white focus:outline-none focus:border-brand-cyan"
                  placeholder="ej. Refactorizar componente de autenticación"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Descripción / Criterios de Aceptación:</label>
                <textarea
                  rows="3"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-dark-900 border border-slate-700 text-white focus:outline-none focus:border-brand-cyan resize-none"
                  placeholder="Detalla los requisitos técnicos de la tarea..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Prioridad:</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-dark-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-brand-cyan"
                  >
                    <option value="LOW">Baja</option>
                    <option value="MEDIUM">Media</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Asignar Desarrollador:</label>
                  <select
                    value={newAssignedUser}
                    onChange={(e) => setNewAssignedUser(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-dark-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-brand-cyan"
                  >
                    <option value="">Sin asignar</option>
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
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-brand-cyan text-dark-950 hover:bg-cyan-300 shadow-md shadow-brand-cyan/20 disabled:opacity-50"
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
