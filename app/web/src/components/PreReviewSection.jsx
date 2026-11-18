import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  ShieldCheck, 
  CheckCircle2, 
  RotateCcw, 
  ListChecks, 
  GitCommit, 
  User, 
  Clock, 
  Calendar, 
  AlertCircle, 
  Flame, 
  Search, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  FileText,
  Layers,
  Sparkles
} from 'lucide-react';

export default function PreReviewSection({ projectId = 1, onSwitchToKanban, onSwitchToHistory }) {
  const { token, user } = useAuth();
  const { socket } = useSocket();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [reviewNotes, setReviewNotes] = useState({});
  const [checklists, setChecklists] = useState({});
  const [expandedInstructions, setExpandedInstructions] = useState({});
  const [filterText, setFilterText] = useState('');
  const [bannerNotice, setBannerNotice] = useState(null);

  const fetchTasks = async () => {
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/projects/${projectId}/tasks`, { headers });
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error('Error fetching review tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [projectId, token]);

  // Real-time synchronization via socket
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchTasks();
    };
    socket.on('task_status_changed', handleUpdate);
    socket.on('task_created', handleUpdate);

    return () => {
      socket.off('task_status_changed', handleUpdate);
      socket.off('task_created', handleUpdate);
    };
  }, [socket, projectId]);

  // Filter tasks in REVIEW
  const reviewTasks = tasks.filter(t => t.status === 'REVIEW' && !t.is_archived);

  // Search filter
  const displayedTasks = reviewTasks.filter(t => {
    if (!filterText.trim()) return true;
    const term = filterText.toLowerCase();
    return (
      t.title.toLowerCase().includes(term) ||
      (t.description && t.description.toLowerCase().includes(term)) ||
      (t.instructions && t.instructions.toLowerCase().includes(term)) ||
      (t.assigned_name && t.assigned_name.toLowerCase().includes(term)) ||
      (t.assigned_username && t.assigned_username.toLowerCase().includes(term))
    );
  });

  const toggleChecklist = (taskId, itemKey) => {
    setChecklists(prev => {
      const current = prev[taskId] || {};
      return {
        ...prev,
        [taskId]: {
          ...current,
          [itemKey]: !current[itemKey]
        }
      };
    });
  };

  const toggleInstructions = (taskId) => {
    setExpandedInstructions(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const handleApprove = async (task) => {
    setActionLoading(prev => ({ ...prev, [task.id]: 'approving' }));
    try {
      const note = reviewNotes[task.id] || 'Aprobado en Control de Calidad (QA) tras verificación exitosa.';
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/tasks/${task.id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status: 'DONE',
          completion_notes: note
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBannerNotice({
          type: 'success',
          text: `Tarea #${task.id} "${task.title}" aprobada y archivada exitosamente en el Historial.`
        });
        // Optimistic local update
        setTasks(prev => prev.filter(t => t.id !== task.id));
      } else {
        alert(data.error || 'Error al aprobar la tarea.');
      }
    } catch (err) {
      console.error('Error approving task:', err);
      alert('Error de conexión al aprobar la tarea.');
    } finally {
      setActionLoading(prev => ({ ...prev, [task.id]: null }));
    }
  };

  const handleReject = async (task) => {
    const feedback = reviewNotes[task.id];
    if (!feedback || !feedback.trim()) {
      const confirmNoFeedback = window.confirm(
        '¿Deseas devolver esta tarea a "En Progreso" sin notas de retroalimentación? Se recomienda detallar los ajustes requeridos.'
      );
      if (!confirmNoFeedback) return;
    }

    setActionLoading(prev => ({ ...prev, [task.id]: 'rejecting' }));
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/tasks/${task.id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status: 'IN_PROGRESS',
          completion_notes: feedback ? `Ajustes solicitados: ${feedback.trim()}` : null
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBannerNotice({
          type: 'warning',
          text: `Tarea #${task.id} devuelta a "En Progreso" para correcciones.`
        });
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'IN_PROGRESS' } : t));
      } else {
        alert(data.error || 'Error al solicitar ajustes.');
      }
    } catch (err) {
      console.error('Error rejecting task:', err);
      alert('Error de conexión al devolver la tarea.');
    } finally {
      setActionLoading(prev => ({ ...prev, [task.id]: null }));
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <Flame className="w-3 h-3 text-rose-500 fill-rose-500" />
            Urgente
          </span>
        );
      case 'HIGH':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <AlertCircle className="w-3 h-3 text-amber-500" />
            Alta
          </span>
        );
      case 'LOW':
        return (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
            Baja
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            Media
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/15 dark:bg-amber-400/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Control de Calidad & Revisión Previa (QA)</span>
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Puerta de control previa al cierre definitivo. Cada tarea en revisión debe ser verificada minuciosamente contra sus instrucciones y código antes de ser autorizada para el Historial Terminado.
            </p>
          </div>

          {/* Quick Counter & Nav Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-mono font-bold">
              <span>Pendientes QA:</span>
              <span className="text-sm px-2 py-0.5 rounded-full bg-amber-500 text-dark-950 font-black">
                {reviewTasks.length}
              </span>
            </div>

            {onSwitchToKanban && (
              <button
                onClick={onSwitchToKanban}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Ver Tablero</span>
              </button>
            )}

            {onSwitchToHistory && (
              <button
                onClick={onSwitchToHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ver Historial</span>
              </button>
            )}
          </div>
        </div>

        {/* Temporary Banner Notice */}
        {bannerNotice && (
          <div className={`mt-4 p-3 rounded-2xl text-xs font-mono flex items-center justify-between gap-2 border ${
            bannerNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
          }`}>
            <div className="flex items-center gap-2">
              {bannerNotice.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-amber-500" />}
              <span>{bannerNotice.text}</span>
            </div>
            <button 
              onClick={() => setBannerNotice(null)}
              className="text-[11px] font-bold underline opacity-80 hover:opacity-100"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Search bar when multiple tasks */}
        {reviewTasks.length > 1 && (
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filtrar por tarea, instrucciones o responsable..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-cyan"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Tasks in Review List */}
      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-slate-500">
          Cargando tareas en revisión previa...
        </div>
      ) : displayedTasks.length === 0 ? (
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {filterText ? 'No se encontraron tareas con ese filtro' : '¡Todo en orden! No hay tareas pendientes de QA'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {filterText 
                ? 'Intenta con otro término de búsqueda.' 
                : 'Cuando un desarrollador complete su labor en una tarea y la mueva a "En Revisión (QA)" desde el Tablero Ágil, aparecerá aquí para su verificación técnica antes de pasar a Finalizado.'}
            </p>
          </div>
          {onSwitchToKanban && (
            <button
              onClick={onSwitchToKanban}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white dark:bg-slate-800 dark:text-white hover:bg-cyan-600 dark:hover:bg-brand-cyan dark:hover:text-dark-950 transition-colors shadow-xs"
            >
              <Layers className="w-4 h-4" />
              <span>Ir al Tablero Ágil</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayedTasks.map((task) => {
            const taskChecklist = checklists[task.id] || {};
            const isInstrExpanded = expandedInstructions[task.id];
            const isApproving = actionLoading[task.id] === 'approving';
            const isRejecting = actionLoading[task.id] === 'rejecting';

            return (
              <div 
                key={task.id}
                className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Header line of card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-black text-cyan-600 dark:text-brand-cyan bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20">
                      #{task.id}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      EN REVISIÓN (QA)
                    </span>
                    {getPriorityBadge(task.priority)}
                  </div>

                  {/* Responsible user badge */}
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-dark-950 border border-slate-200 dark:border-slate-800 text-xs self-start sm:self-auto">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-brand-cyan to-brand-violet flex items-center justify-center text-[10px] font-bold text-dark-950 shrink-0">
                      {task.assigned_name ? task.assigned_name[0].toUpperCase() : 'U'}
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {task.assigned_name || 'Sin asignar'}
                    </span>
                    {task.assigned_username && (
                      <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400">
                        @{task.assigned_username}
                      </span>
                    )}
                  </div>
                </div>

                {/* Task Title & Description */}
                <div className="py-3 space-y-1.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {task.description}
                    </p>
                  )}
                </div>

                {/* Linked Commits telemetry indicator if present */}
                {task.commits_count > 0 && (
                  <div className="mb-3 flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 w-fit">
                    <GitCommit className="w-3.5 h-3.5" />
                    <span>{task.commits_count} commit(s) vinculados a esta tarea</span>
                  </div>
                )}

                {/* Collapsible Step-by-Step Instructions */}
                <div className="mb-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-dark-950/70 overflow-hidden">
                  <button
                    onClick={() => toggleInstructions(task.id)}
                    className="w-full flex items-center justify-between p-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-900 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-cyan-600 dark:text-brand-cyan" />
                      <span>Instrucciones de Paso a Paso Asignadas</span>
                      {task.instructions && (
                        <span className="text-[10px] bg-cyan-500/15 text-cyan-700 dark:text-brand-cyan px-1.5 py-0.2 rounded font-mono">
                          Documentadas
                        </span>
                      )}
                    </div>
                    {isInstrExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {isInstrExpanded && (
                    <div className="p-3.5 pt-0 border-t border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-dark-950">
                      {task.instructions ? (
                        <div className="whitespace-pre-wrap leading-relaxed py-2 pl-2 border-l-2 border-brand-cyan">
                          {task.instructions}
                        </div>
                      ) : (
                        <p className="text-slate-400 italic py-1">
                          No se definieron instrucciones de paso a paso para esta tarea.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Verification Checklist for QA Reviewer */}
                <div className="p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-400/5 border border-amber-500/20 mb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-500" />
                      Lista de Chequeo Técnico (QA):
                    </span>
                    <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                      {Object.values(taskChecklist).filter(Boolean).length} de 4 validados
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label 
                      onClick={() => toggleChecklist(task.id, 'tests')}
                      className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-brand-cyan transition-colors"
                    >
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                        taskChecklist.tests 
                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                          : 'border-slate-300 dark:border-slate-700'
                      }`}>
                        {taskChecklist.tests && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-slate-700 dark:text-slate-300 select-none">
                        Funcionalidad y pruebas locales OK
                      </span>
                    </label>

                    <label 
                      onClick={() => toggleChecklist(task.id, 'instructions')}
                      className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-brand-cyan transition-colors"
                    >
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                        taskChecklist.instructions 
                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                          : 'border-slate-300 dark:border-slate-700'
                      }`}>
                        {taskChecklist.instructions && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-slate-700 dark:text-slate-300 select-none">
                        Paso a paso cumplido cabalmente
                      </span>
                    </label>

                    <label 
                      onClick={() => toggleChecklist(task.id, 'cleanCode')}
                      className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-brand-cyan transition-colors"
                    >
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                        taskChecklist.cleanCode 
                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                          : 'border-slate-300 dark:border-slate-700'
                      }`}>
                        {taskChecklist.cleanCode && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-slate-700 dark:text-slate-300 select-none">
                        Código limpio, sin credenciales ni fugas
                      </span>
                    </label>

                    <label 
                      onClick={() => toggleChecklist(task.id, 'responsive')}
                      className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-brand-cyan transition-colors"
                    >
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                        taskChecklist.responsive 
                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                          : 'border-slate-300 dark:border-slate-700'
                      }`}>
                        {taskChecklist.responsive && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-slate-700 dark:text-slate-300 select-none">
                        Responsive móvil y estilo verificado
                      </span>
                    </label>
                  </div>
                </div>

                {/* Review / Completion Feedback textarea */}
                <div className="mb-4">
                  <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1">
                    Notas de Revisión / Dictamen de QA:
                  </label>
                  <textarea
                    rows="2"
                    value={reviewNotes[task.id] || ''}
                    onChange={(e) => setReviewNotes(prev => ({ ...prev, [task.id]: e.target.value }))}
                    placeholder="Escribe observaciones de aprobación o ajustes a corregir..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-cyan resize-none"
                  />
                </div>

                {/* Action buttons line */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handleReject(task)}
                    disabled={isRejecting || isApproving}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isRejecting ? 'Devolviendo...' : 'Solicitar Ajustes (Rechazar)'}</span>
                  </button>

                  <button
                    onClick={() => handleApprove(task)}
                    disabled={isRejecting || isApproving}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isApproving ? 'Aprobando y Finalizando...' : 'Aprobar y Finalizar (DONE)'}</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
