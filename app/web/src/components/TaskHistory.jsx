import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Archive, CheckCircle2, Calendar, GitCommit, User, ShieldCheck } from 'lucide-react';

export default function TaskHistory({ projectId = 1 }) {
  const { token } = useAuth();
  const [history, setHistory] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch(`/api/projects/${projectId}/history`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success) {
          setHistory(data.history);
          setIsOwner(data.isOwner);
        }
      } catch (err) {
        console.error('Error loading task history:', err);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [projectId, token]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Reciente';
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="w-full space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Historial de Tareas Terminadas
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                {history.length} archivadas
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isOwner 
                ? 'Vista de Creador: Viendo todas las tareas terminadas por el equipo en esta sala.'
                : 'Vista Personal: Viendo tus tareas terminadas y archivadas con éxito.'}
            </p>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="space-y-3">
        {history.map((task) => (
          <div
            key={task.id}
            className="p-4 rounded-2xl glass-card border border-slate-200 dark:border-slate-800/80 hover:border-emerald-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-brand-cyan px-2 py-0.5 rounded bg-brand-cyan/10 border border-brand-cyan/25">
                    #{task.id}
                  </span>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 line-through decoration-emerald-500/60">
                    {task.title}
                  </h4>
                </div>
                {task.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {task.description}
                  </p>
                )}
              </div>
            </div>

            {/* Metadata right */}
            <div className="flex items-center gap-4 text-xs font-mono shrink-0 pl-11 md:pl-0">
              {/* Assignee Avatar */}
              <div className="flex items-center gap-2">
                <img
                  src={task.assigned_avatar_url || 'https://avatars.githubusercontent.com/u/10101?v=4'}
                  alt={task.assigned_username || 'dev'}
                  className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-700 object-cover"
                />
                <span className="text-slate-700 dark:text-slate-300">@{task.assigned_username || 'dev'}</span>
              </div>

              {/* Date completed */}
              <div className="flex items-center gap-1.5 text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <span>{formatDate(task.completed_at || task.updated_at)}</span>
              </div>
            </div>
          </div>
        ))}

        {history.length === 0 && !loading && (
          <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-400 font-mono">
            No hay tareas en el historial aún. Cuando muevas una tarea a "Terminada" en el Kanban, se archivará aquí automáticamente.
          </div>
        )}
      </div>
    </div>
  );
}
