import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useUIFeedback } from '../context/UIFeedbackContext';
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
  Archive,
  ListChecks,
  ChevronDown,
  Play,
  RotateCcw,
  ExternalLink,
  Github,
  Sparkles,
  Link2
} from 'lucide-react';

const COLUMNS = [
  { id: 'TODO', title: 'Por Hacer', color: 'border-slate-300 dark:border-slate-700', badge: 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
  { id: 'IN_PROGRESS', title: 'En Progreso', color: 'border-blue-500/50', badge: 'bg-blue-500/10 text-blue-600 dark:text-brand-blue' },
  { id: 'REVIEW', title: 'En Revisión / PR', color: 'border-purple-500/50', badge: 'bg-purple-500/10 text-purple-600 dark:text-brand-violet' },
  { id: 'DONE', title: 'Terminada (Historial)', color: 'border-emerald-500/50', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' }
];

export default function KanbanBoard({ projectId = 1, onSwitchToHistory, onSwitchToReview, project }) {
  const { socket } = useSocket();
  const { user, token } = useAuth();
  const { showToast } = useUIFeedback();
  const [tasks, setTasks] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [isOwnerView, setIsOwnerView] = useState(false);
  const [viewScope, setViewScope] = useState('ALL'); // 'ALL' | 'MY_TASKS'
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState('ALL');

  // Repositories available for this room
  const availableRepos = project?.github_repos || (project?.github_repo ? project.github_repo.split(',').map(r => r.trim()).filter(Boolean) : ['edwin-esquivel-ADSO/GitFlow']);

  // New Task Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newAssignedUser, setNewAssignedUser] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Instructions interactive collapsible and editing states
  const [expandedInstructions, setExpandedInstructions] = useState({});
  const [editingInstructionsTask, setEditingInstructionsTask] = useState(null);

  // Commit linking modal state
  const [commitModal, setCommitModal] = useState({
    isOpen: false,
    task: null,
    targetStatus: null,
    commitHash: '',
    commitMsg: '',
    selectedRepo: availableRepos[0] || 'edwin-esquivel-ADSO/GitFlow',
    loading: false
  });

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
        return prev.map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } : t);
      });
    };

    const handleTaskCreated = (newTask) => {
      setTasks(prev => {
        if (prev.some(t => t.id === newTask.id)) return prev;
        return [...prev, newTask];
      });
    };

    const handleNewCommit = (payload) => {
      if (payload.task_id) {
        setTasks(prev => prev.map(t => {
          if (t.id === payload.task_id) {
            return {
              ...t,
              commits_count: (t.commits_count || 0) + 1,
              latest_commit_hash: payload.commit.hash,
              latest_commit_url: payload.commit.url
            };
          }
          return t;
        }));
      }
    };

    socket.on('task_status_changed', handleTaskUpdated);
    socket.on('task_created', handleTaskCreated);
    socket.on('new_commit', handleNewCommit);

    return () => {
      socket.off('task_status_changed', handleTaskUpdated);
      socket.off('task_created', handleTaskCreated);
      socket.off('new_commit', handleNewCommit);
    };
  }, [socket]);

  // Move status handler
  const handleMoveStatus = async (taskId, nextStatus) => {
    try {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus } : t));

      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: nextStatus,
          completion_notes: nextStatus === 'DONE' ? 'Completada desde el Tablero Ágil.' : null
        })
      });

      if (res.ok) {
        if (nextStatus === 'DONE') {
          showToast('Tarea marcada como Terminada. Ya aparece en la columna Terminada y en el Historial.', 'success');
        } else if (nextStatus === 'REVIEW') {
          showToast('Tarea enviada a Revisión Previa (QA).', 'info');
        } else {
          showToast(`Estado de la tarea actualizado a "${nextStatus}".`, 'info');
        }
      } else {
        loadTasks();
      }
    } catch (err) {
      console.error('Error updating status:', err);
      loadTasks();
    }
  };

  // Open Commit Modal before moving or standalone
  const openCommitModal = (task, targetStatus = null) => {
    const repos = availableRepos.length > 0 ? availableRepos : ['edwin-esquivel-ADSO/GitFlow'];
    setCommitModal({
      isOpen: true,
      task,
      targetStatus,
      commitHash: '',
      commitMsg: '',
      selectedRepo: repos[0],
      loading: false
    });
  };

  // Submit Commit Modal
  const handleCommitSubmit = async (e) => {
    e.preventDefault();
    if (!commitModal.task) return;

    setCommitModal(prev => ({ ...prev, loading: true }));
    const { task, targetStatus, commitHash, commitMsg, selectedRepo } = commitModal;

    try {
      if (commitHash && commitHash.trim()) {
        const res = await fetch(`/api/tasks/${task.id}/commit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            hash: commitHash.trim(),
            message: commitMsg.trim() || `Commit para tarea #${task.id}`,
            repo: selectedRepo
          })
        });

        const data = await res.json();
        if (res.ok) {
          showToast(`Commit #${commitHash.trim().substring(0, 7)} vinculado con éxito a ${selectedRepo}.`, 'success');
        } else {
          showToast(data.error || 'Error al vincular commit', 'error');
        }
      }

      // If moving to a target status, execute status update
      if (targetStatus && targetStatus !== task.status) {
        await handleMoveStatus(task.id, targetStatus);
      }

      setCommitModal({ isOpen: false, task: null, targetStatus: null, commitHash: '', commitMsg: '', selectedRepo: '', loading: false });
      loadTasks();
    } catch (err) {
      console.error('Error in commit submit:', err);
      showToast('Error de conexión al vincular commit.', 'error');
      setCommitModal(prev => ({ ...prev, loading: false }));
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
          instructions: newInstructions,
          priority: newPriority,
          assigned_to_user_id: newAssignedUser || null
        })
      });

      const data = await res.json();
      if (res.ok && data.task) {
        setTasks(prev => [...prev, data.task]);
        setIsModalOpen(false);
        setNewTitle('');
        setNewDescription('');
        setNewInstructions('');
        setNewPriority('MEDIUM');
        setNewAssignedUser('');
        showToast('Tarea creada exitosamente.', 'success');
      } else {
        showToast(data.error || 'Error al crear la tarea.', 'error');
      }
    } catch (err) {
      console.error('Error creating task:', err);
      showToast('Error de conexión al crear tarea.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Save edited instructions
  const handleSaveInstructions = async (e) => {
    e.preventDefault();
    if (!editingInstructionsTask) return;

    try {
      const res = await fetch(`/api/tasks/${editingInstructionsTask.id}/instructions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          instructions: editingInstructionsTask.instructions
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTasks(prev => prev.map(t => 
          t.id === editingInstructionsTask.id 
            ? { ...t, instructions: editingInstructionsTask.instructions } 
            : t
        ));
        setEditingInstructionsTask(null);
        showToast('Instrucciones actualizadas correctamente.', 'success');
      } else {
        showToast(data.error || 'Error al guardar las instrucciones.', 'error');
      }
    } catch (err) {
      console.error('Error saving instructions:', err);
      showToast('Error de conexión al guardar las instrucciones.', 'error');
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'URGENT':
        return <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/30 font-semibold"><Flame className="w-3 h-3" /> Urgente</span>;
      case 'HIGH':
        return <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30 font-semibold"><AlertCircle className="w-3 h-3" /> Alta</span>;
      case 'LOW':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 font-semibold">Baja</span>;
      default:
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/30 font-semibold">Media</span>;
    }
  };

  // Robust My Task matcher by ID, lowercase username, and user name
  const isMyTask = (t) => {
    if (!user) return false;
    const uid = Number(user.id);
    const matchId = (t.assigned_to_user_id && Number(t.assigned_to_user_id) === uid) ||
                    (t.created_by_user_id && Number(t.created_by_user_id) === uid);
    const matchUsername = (t.assigned_username && user.username && t.assigned_username.toLowerCase() === user.username.toLowerCase()) ||
                          (t.assigned_user?.username && user.username && t.assigned_user.username.toLowerCase() === user.username.toLowerCase());
    const matchName = t.assigned_name && user.name && (t.assigned_name.toLowerCase() === user.name.toLowerCase());
    return Boolean(matchId || matchUsername || matchName);
  };

  // Filter tasks based on viewScope and filterUser
  const filteredTasks = tasks.filter(t => {
    if (viewScope === 'MY_TASKS') {
      if (!isMyTask(t)) return false;
    }
    if (filterUser !== 'ALL') {
      const matchFilterId = String(t.assigned_to_user_id) === String(filterUser);
      const matchFilterUsername = t.assigned_username && String(t.assigned_username).toLowerCase() === String(filterUser).toLowerCase();
      if (!matchFilterId && !matchFilterUsername) return false;
    }
    return true;
  });

  const myTasksCount = tasks.filter(isMyTask).length;

  return (
    <div className="space-y-6">
      
      {/* Top Filter and Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800">
        
        {/* View Scope Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-dark-900 border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setViewScope('ALL')}
              className={`px-3 py-1.5 rounded-lg font-mono font-medium transition-colors ${
                viewScope === 'ALL'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todo el Equipo ({tasks.length})
            </button>
            <button
              onClick={() => setViewScope('MY_TASKS')}
              className={`px-3 py-1.5 rounded-lg font-mono font-medium transition-colors ${
                viewScope === 'MY_TASKS'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Mis Tareas ({myTasksCount})
            </button>
          </div>
        </div>

        {/* Right side: Developer filter & New Task button */}
        <div className="flex items-center gap-3">
          {teamUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-dark-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-brand-cyan font-mono"
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
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-brand-cyan text-dark-950 hover:bg-cyan-300 transition-all shadow-md shadow-brand-cyan/20 font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Tarea</span>
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
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${col.badge} font-bold`}>
                    {columnTasks.length}
                  </span>
                </span>
              </div>

              {/* Task Cards Container */}
              <div className="space-y-3 flex-1">
                {columnTasks.map(task => {
                  const defaultRepoForTask = availableRepos[0] || 'edwin-esquivel-ADSO/GitFlow';

                  return (
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

                      {/* Step-by-step Instructions Accordion Button */}
                      <div className="mt-2.5">
                        <button
                          type="button"
                          onClick={() => setExpandedInstructions(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                          className="w-full flex items-center justify-between p-1.5 px-2.5 rounded-xl bg-slate-100 dark:bg-dark-900/80 hover:bg-slate-200 dark:hover:bg-dark-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-800"
                        >
                          <span className="flex items-center gap-1.5 truncate font-semibold">
                            <ListChecks className="w-3.5 h-3.5 text-cyan-600 dark:text-brand-cyan" />
                            {task.instructions ? 'Ver instrucciones' : '+ Añadir instrucciones'}
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expandedInstructions[task.id] ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Collapsible content */}
                        {expandedInstructions[task.id] && (
                          <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-slate-800 space-y-2 animate-fade-in text-xs font-sans">
                            {task.instructions ? (
                              <div className="text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed text-[11px] font-mono">
                                {task.instructions}
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400 italic font-mono">
                                No se han registrado pasos para esta tarea.
                              </p>
                            )}

                            <div className="pt-1 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                              <button
                                type="button"
                                onClick={() => setEditingInstructionsTask({ id: task.id, title: task.title, instructions: task.instructions || '' })}
                                className="text-[10px] font-mono text-cyan-600 dark:text-brand-cyan hover:underline font-bold"
                              >
                                {task.instructions ? 'Editar pasos' : 'Redactar pasos'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bottom: Assignee & Commits count with Direct Link */}
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
                          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono truncate max-w-[95px] flex items-center gap-1">
                            <span>{task.assigned_username ? `@${task.assigned_username}` : 'Sin asignar'}</span>
                            {((project?.owner_id && Number(task.assigned_to_user_id) === Number(project.owner_id)) || (project?.owner_username && task.assigned_username?.toLowerCase() === project.owner_username.toLowerCase())) && (
                              <span title="Líder / Dueño de Sala" className="text-amber-500 text-[11px]">👑</span>
                            )}
                          </span>
                        </div>

                        {/* Commits Pill with link */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openCommitModal(task, null)}
                            className={`flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-lg border transition-colors ${
                              task.commits_count > 0 
                                ? 'bg-cyan-500/10 text-cyan-700 dark:text-brand-cyan border-cyan-500/30 hover:bg-cyan-500/20' 
                                : 'text-slate-400 border-transparent hover:border-slate-300'
                            }`}
                            title="Ver o vincular commit de GitHub"
                          >
                            <GitCommit className="w-3.5 h-3.5" />
                            <span className="font-bold">{task.commits_count || 0}</span>
                          </button>
                        </div>
                      </div>

                      {/* Status Action Buttons with Full Text & Clear Roles */}
                      <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/60 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                          <span className="font-semibold">Mover a:</span>
                          <button
                            type="button"
                            onClick={() => openCommitModal(task, null)}
                            className="text-[10px] text-cyan-600 dark:text-brand-cyan hover:underline flex items-center gap-1 font-bold"
                            title="Vincular un commit de GitHub a esta tarea"
                          >
                            <Link2 className="w-3 h-3" />
                            <span>+ Commit</span>
                          </button>
                        </div>

                        {/* Dynamic Action Buttons for TODO */}
                        {task.status === 'TODO' && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleMoveStatus(task.id, 'IN_PROGRESS')}
                              className="flex-1 py-1.5 px-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-[11px] font-mono font-semibold flex items-center justify-center gap-1 transition-all"
                              title="Iniciar trabajo en esta tarea"
                            >
                              <Play className="w-3 h-3" />
                              <span>En Progreso</span>
                            </button>
                            <button
                              onClick={() => openCommitModal(task, 'REVIEW')}
                              className="py-1.5 px-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[11px] font-mono font-semibold flex items-center gap-1 transition-all"
                              title="Pedir revisión técnica en QA"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>Pedir QA</span>
                            </button>
                            <button
                              onClick={() => openCommitModal(task, 'DONE')}
                              className="py-1.5 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-semibold flex items-center gap-1 transition-all"
                              title="Marcar como terminada y pasar al Historial"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Terminar</span>
                            </button>
                          </div>
                        )}

                        {/* Dynamic Action Buttons for IN_PROGRESS */}
                        {task.status === 'IN_PROGRESS' && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleMoveStatus(task.id, 'TODO')}
                              className="py-1.5 px-2 rounded-xl bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300/60 text-[11px] font-mono font-semibold flex items-center gap-1 transition-all"
                              title="Regresar a Por Hacer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Por Hacer</span>
                            </button>
                            <button
                              onClick={() => openCommitModal(task, 'REVIEW')}
                              className="flex-1 py-1.5 px-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[11px] font-mono font-semibold flex items-center justify-center gap-1 transition-all shadow-xs"
                              title="Enviar a Revisión Previa (QA) opcional"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Pedir Revisión QA</span>
                            </button>
                            <button
                              onClick={() => openCommitModal(task, 'DONE')}
                              className="py-1.5 px-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-bold flex items-center gap-1 transition-all shadow-xs"
                              title="Marcar directamente como terminada"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Terminar</span>
                            </button>
                          </div>
                        )}

                        {/* Dynamic Action Buttons for REVIEW */}
                        {task.status === 'REVIEW' && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleMoveStatus(task.id, 'IN_PROGRESS')}
                                className="flex-1 py-1.5 px-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-[11px] font-mono font-semibold flex items-center justify-center gap-1 transition-all"
                                title="Volver a En Progreso"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Volver a Progreso</span>
                              </button>
                              <button
                                onClick={() => handleMoveStatus(task.id, 'DONE')}
                                className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-bold flex items-center justify-center gap-1 transition-all"
                                title="Aprobar y pasar a Historial Terminado"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Aprobar y Terminar</span>
                              </button>
                            </div>

                            {onSwitchToReview && (
                              <button
                                type="button"
                                onClick={onSwitchToReview}
                                className="w-full py-1.5 px-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-[11px] font-mono flex items-center justify-center gap-1.5 font-semibold transition-all shadow-xs"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Ir a Revisión Previa (QA) ➔</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Dynamic Action Buttons for DONE */}
                        {task.status === 'DONE' && (
                          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Terminada (Historial)</span>
                            </span>
                            <button
                              onClick={() => handleMoveStatus(task.id, 'IN_PROGRESS')}
                              className="text-[10px] font-mono text-slate-500 hover:text-cyan-600 dark:hover:text-brand-cyan underline font-semibold"
                              title="Reabrir tarea en progreso"
                            >
                              Reabrir
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}

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

      {/* Commit Linking Modal with Multi-Repo Autonomous Support */}
      {commitModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-dark-950/80 backdrop-blur-md animate-fade-in font-sans">
          <div className="glass-panel w-full max-w-md p-5 sm:p-6 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl bg-white dark:bg-dark-900 animate-scale-up space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-brand-cyan" />
                <span>Vincular Commit de GitHub</span>
              </h3>
              <button
                onClick={() => setCommitModal({ isOpen: false, task: null, targetStatus: null, commitHash: '', commitMsg: '', selectedRepo: '', loading: false })}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Registra el hash o identificador del commit para asociarlo a la tarea <strong>#{commitModal.task?.id}</strong>. Podrás abrir el commit directamente en GitHub.
            </p>

            <form onSubmit={handleCommitSubmit} className="space-y-3.5">
              
              {/* Repository Selector (Auto if 1 repo, dropdown if multiple repos) */}
              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Github className="w-3.5 h-3.5 text-cyan-600 dark:text-brand-cyan" />
                    Repositorio de GitHub:
                  </span>
                  {availableRepos.length === 1 && (
                    <span className="text-[10px] text-cyan-600 dark:text-brand-cyan font-bold">
                      (Seleccionado automático)
                    </span>
                  )}
                </label>

                {availableRepos.length > 1 ? (
                  <select
                    value={commitModal.selectedRepo}
                    onChange={(e) => setCommitModal(prev => ({ ...prev, selectedRepo: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                  >
                    {availableRepos.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-dark-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-mono font-semibold flex items-center justify-between">
                    <span>{availableRepos[0] || 'edwin-esquivel-ADSO/GitFlow'}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">Único</span>
                  </div>
                )}
              </div>

              {/* Commit Hash input */}
              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1">
                  Hash / SHA del Commit de GitHub (ej. 3d4e5f6 o f608773):
                </label>
                <input
                  type="text"
                  value={commitModal.commitHash}
                  onChange={(e) => setCommitModal(prev => ({ ...prev, commitHash: e.target.value }))}
                  placeholder="ej. 3d4e5f6"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                />
              </div>

              {/* Commit Message input */}
              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1">
                  Mensaje del Commit (Opcional):
                </label>
                <input
                  type="text"
                  value={commitModal.commitMsg}
                  onChange={(e) => setCommitModal(prev => ({ ...prev, commitMsg: e.target.value }))}
                  placeholder="ej. feat: implementación de endpoint completada"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-sans"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const { task, targetStatus } = commitModal;
                    if (targetStatus && targetStatus !== task.status) {
                      handleMoveStatus(task.id, targetStatus);
                    }
                    setCommitModal({ isOpen: false, task: null, targetStatus: null, commitHash: '', commitMsg: '', selectedRepo: '', loading: false });
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  {commitModal.targetStatus ? 'Continuar sin Commit' : 'Cancelar'}
                </button>

                <button
                  type="submit"
                  disabled={commitModal.loading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-cyan hover:bg-cyan-300 text-dark-950 transition-all shadow-md shadow-brand-cyan/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <GitCommit className="w-3.5 h-3.5" />
                  <span>{commitModal.loading ? 'Guardando...' : (commitModal.targetStatus ? 'Guardar Commit y Mover' : 'Vincular Commit')}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-dark-950/80 backdrop-blur-sm animate-fade-in font-sans">
          <div className="glass-panel w-full max-w-lg p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl bg-white dark:bg-dark-900 max-h-[92vh] overflow-y-auto">
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
                  rows="2"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan resize-none font-sans"
                  placeholder="Detalles técnicos y criterios de aceptación..."
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5 text-cyan-600 dark:text-brand-cyan" />
                  Instrucciones de paso a paso:
                </label>
                <textarea
                  rows="3"
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan resize-none font-sans leading-relaxed"
                  placeholder="1. Paso inicial...\n2. Siguiente paso de desarrollo...\n3. Validación y pruebas..."
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
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-cyan text-dark-950 hover:bg-cyan-300 shadow-md shadow-brand-cyan/20 disabled:opacity-50 font-bold"
                >
                  {submitting ? 'Guardando...' : 'Crear Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Instructions Modal */}
      {editingInstructionsTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-dark-950/80 backdrop-blur-sm animate-fade-in font-sans">
          <div className="glass-panel w-full max-w-lg p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl bg-white dark:bg-dark-900 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-cyan-600 dark:text-brand-cyan" />
                <span>Instrucciones: #{editingInstructionsTask.id} {editingInstructionsTask.title}</span>
              </h3>
              <button
                onClick={() => setEditingInstructionsTask(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveInstructions} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1">
                  Pasos a paso y forma de realización:
                </label>
                <textarea
                  rows="6"
                  value={editingInstructionsTask.instructions}
                  onChange={(e) => setEditingInstructionsTask(prev => ({ ...prev, instructions: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-sans leading-relaxed resize-none"
                  placeholder="1. Requerimiento inicial...\n2. Pasos técnicos...\n3. Validación y pruebas..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingInstructionsTask(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-brand-cyan text-dark-950 hover:bg-cyan-300 shadow-sm font-bold"
                >
                  Guardar Pasos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
