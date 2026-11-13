import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Archive, CheckCircle2, Calendar, GitCommit, User, Clock, Search } from 'lucide-react';

export default function TaskHistory({ projectId = 1 }) {
  const { token } = useAuth();
  const [history, setHistory] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');

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

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Reciente';
    const d = new Date(dateStr);
    const dateFormatted = d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    const timeFormatted = d.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return `${dateFormatted} · ${timeFormatted}`;
  };

  const filteredHistory = history.filter(task => 
    !filterText || 
    task.title.toLowerCase().includes(filterText.toLowerCase()) ||
    (task.assigned_username && task.assigned_username.toLowerCase().includes(filterText.toLowerCase()))
  );

  return (
    <div className="w-full space-y-4">
      
      {/* Header Bar: Aligned buttons on same line */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900/60 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Historial de Tareas Terminadas
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                {history.length} archivadas
              </span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {isOwner 
                ? 'Vista de Administrador: Viendo todas las tareas terminadas por el equipo en esta sala.'
                : 'Vista Personal: Viendo tus tareas terminadas y archivadas con éxito.'}
            </p>
          </div>
        </div>

        {/* Search filter in same line */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filtrar en historial..."
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none text-xs w-36 sm:w-44"
            />
          </div>
        </div>
      </div>

      {/* History Cards List: Fully Responsive Grid/Flex with Exact Alignment */}
      <div className="space-y-3">
        {filteredHistory.map((task) => (
          <div
            key={task.id}
            className="p-4 sm:p-5 rounded-2xl glass-card border border-slate-200 dark:border-slate-800/80 hover:border-emerald-500/40 transition-all bg-white dark:bg-dark-900/40 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            {/* Task Info (Left) */}
            <div className="flex items-start gap-3.5 flex-1 min-w-0">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-mono font-bold text-cyan-700 dark:text-brand-cyan px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30">
                    #{task.id}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                    Terminada
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-through decoration-emerald-500/60 truncate max-w-md">
                    {task.title}
                  </h4>
                </div>

                {task.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                    {task.description}
                  </p>
                )}
              </div>
            </div>

            {/* Parameter Details: Date, Time, Assignee (Right, Aligned) */}
            <div className="flex items-center gap-4 sm:gap-6 text-xs font-mono shrink-0 pl-11 md:pl-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-800 flex-wrap justify-between md:justify-end">
              
              {/* Assignee Avatar & Username */}
              <div className="flex items-center gap-2">
                <img
                  src={task.assigned_avatar_url || 'https://avatars.githubusercontent.com/u/10101?v=4'}
                  alt={task.assigned_username || 'dev'}
                  className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-700 object-cover"
                />
                <span className="text-slate-800 dark:text-slate-200 font-bold">
                  @{task.assigned_username || 'dev'}
                </span>
              </div>

              {/* Exact Completion Date and Time */}
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-dark-950 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{formatDateTime(task.completed_at || task.updated_at)}</span>
              </div>

              {/* Commits Badge */}
              <div 
                className="flex items-center gap-1 text-[11px] font-mono text-cyan-700 dark:text-brand-cyan"
                title="Commits vinculados a esta tarea"
              >
                <GitCommit className="w-3.5 h-3.5" />
                <span className="font-bold">{task.commits_count || 1}</span>
              </div>
            </div>

          </div>
        ))}

        {filteredHistory.length === 0 && !loading && (
          <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-mono">
            No se encontraron tareas terminadas en el historial. Mueve tareas a "Terminada" en el Kanban para archivarlas aquí.
          </div>
        )}
      </div>

    </div>
  );
}
