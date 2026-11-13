import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { 
  GitCommit, 
  CheckCircle2, 
  Clock, 
  Award, 
  TrendingUp, 
  Users, 
  Sparkles, 
  BarChart3, 
  Target 
} from 'lucide-react';

export default function ContributionDashboard({ projectId = 1 }) {
  const { socket } = useSocket();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/dashboard`);
      const data = await res.json();
      if (data.success && data.data) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('[Dashboard] Error fetching telemetry stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [projectId]);

  useEffect(() => {
    if (!socket) return;

    const handleRefresh = () => {
      fetchStats();
    };

    socket.on('new_commit', handleRefresh);
    socket.on('task_status_changed', handleRefresh);
    socket.on('task_created', handleRefresh);

    return () => {
      socket.off('new_commit', handleRefresh);
      socket.off('task_status_changed', handleRefresh);
      socket.off('task_created', handleRefresh);
    };
  }, [socket]);

  if (loading || !stats) {
    return (
      <div className="w-full p-8 text-center text-xs text-slate-500 font-mono">
        Cargando analítica de la sala...
      </div>
    );
  }

  const { taskCounts, completionRate, totalCommits, contributors } = stats;

  return (
    <div className="w-full space-y-6">
      
      {/* Top 4 KPI Metrics - High Contrast in Light & Dark Mode */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Commits KPI */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 relative overflow-hidden group shadow-sm bg-white dark:bg-dark-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 uppercase">COMMITS REGISTRADOS</span>
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-brand-cyan">
              <GitCommit className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">{totalCommits}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold">+100% verificado</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">Sincronizados vía Webhooks</p>
        </div>

        {/* Closed Tasks KPI */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 relative overflow-hidden group shadow-sm bg-white dark:bg-dark-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 uppercase">TAREAS COMPLETADAS</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">{taskCounts.DONE}</span>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-mono font-bold">de {taskCounts.total} tareas</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">Cerradas mediante commits o kanban</p>
        </div>

        {/* Tasks In Progress KPI */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 relative overflow-hidden group shadow-sm bg-white dark:bg-dark-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 uppercase">EN DESARROLLO ACTIVO</span>
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-600 dark:text-brand-blue">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">{taskCounts.IN_PROGRESS}</span>
            <span className="text-xs text-blue-600 dark:text-brand-blue font-mono font-bold">{taskCounts.TODO} por iniciar</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">Flujo ágil en curso</p>
        </div>

        {/* Velocity / Completion Rate */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 relative overflow-hidden group shadow-sm bg-white dark:bg-dark-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 uppercase">VELOCIDAD DE SPRINT</span>
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-600 dark:text-brand-violet">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">{completionRate}%</span>
            <span className="text-xs text-purple-600 dark:text-brand-violet font-mono font-bold">eficiencia</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full mt-2.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-brand-cyan to-brand-violet h-full rounded-full transition-all duration-500" 
              style={{ width: `${completionRate}%` }} 
            />
          </div>
        </div>

      </div>

      {/* Leaderboard Table - High Contrast */}
      <div className="rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm bg-white dark:bg-dark-900/60">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-dark-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Impacto y Aportes del Equipo</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Fórmula de puntuación: (Commits × 10) + (Tareas Cerradas × 25)
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
            {contributors.length} desarrolladores
          </span>
        </div>

        <div className="p-4 sm:p-6 space-y-3">
          {contributors.map((member, index) => (
            <div 
              key={member.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-dark-900/80 border border-slate-200 dark:border-slate-800 hover:border-brand-cyan/40 transition-all shadow-xs"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono font-bold text-slate-500 dark:text-slate-400 w-5">
                  #{index + 1}
                </span>
                <img
                  src={member.avatar_url || 'https://avatars.githubusercontent.com/u/10101?v=4'}
                  alt={member.username}
                  className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 object-cover shrink-0"
                />
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{member.name || member.username}</h4>
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">@{member.username}</span>
                </div>
              </div>

              <div className="flex items-center gap-6 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-slate-800">
                <div className="text-left sm:text-right">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-mono">Commits</span>
                  <span className="text-sm font-bold text-cyan-700 dark:text-brand-cyan font-mono flex items-center gap-1 sm:justify-end">
                    <GitCommit className="w-3.5 h-3.5" />
                    {member.commits_count}
                  </span>
                </div>

                <div className="text-right min-w-[90px]">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-mono">Impact Score</span>
                  <span className="text-base font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                    {member.impact_score} <span className="text-[10px] text-slate-500">pts</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
