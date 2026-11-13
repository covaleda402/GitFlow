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

  // WebSocket listeners to refresh stats in real-time
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
        Cargando telemetría de aportes...
      </div>
    );
  }

  const { taskCounts, completionRate, totalCommits, contributors } = stats;

  return (
    <div className="w-full space-y-6">
      
      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Commits KPI */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-cyan/10 rounded-full blur-2xl group-hover:bg-brand-cyan/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">COMMITS REGISTRADOS</span>
            <div className="p-2 rounded-xl bg-brand-cyan/10 text-brand-cyan">
              <GitCommit className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{totalCommits}</span>
            <span className="text-xs text-emerald-400 font-mono">+100% verificado</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Sincronizados vía Webhooks</p>
        </div>

        {/* Closed Tasks KPI */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">TAREAS COMPLETADAS</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{taskCounts.DONE}</span>
            <span className="text-xs text-slate-400 font-mono">de {taskCounts.total} tareas</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Cerradas mediante commits o kanban</p>
        </div>

        {/* Tasks In Progress KPI */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-blue/10 rounded-full blur-2xl group-hover:bg-brand-blue/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">EN DESARROLLO ACTIVO</span>
            <div className="p-2 rounded-xl bg-brand-blue/10 text-brand-blue">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{taskCounts.IN_PROGRESS}</span>
            <span className="text-xs text-brand-blue font-mono">{taskCounts.TODO} por iniciar</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Flujo ágil en curso</p>
        </div>

        {/* Completion Rate KPI */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-violet/10 rounded-full blur-2xl group-hover:bg-brand-violet/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">VELOCIDAD DE SPRINT</span>
            <div className="p-2 rounded-xl bg-brand-violet/10 text-brand-violet">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{completionRate}%</span>
            <span className="text-xs text-brand-violet font-mono">eficiencia</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-brand-cyan to-brand-violet h-full rounded-full transition-all duration-500" 
              style={{ width: `${completionRate}%` }} 
            />
          </div>
        </div>

      </div>

      {/* Contributions Leaderboard */}
      <div className="rounded-2xl glass-panel border border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 bg-dark-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Impacto y Aportes del Equipo</h3>
              <p className="text-[11px] text-slate-400">
                Puntaje cruzado: Commits realizados (10 pts) + Tareas cerradas (25 pts)
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {contributors.length} desarrolladores
          </span>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {contributors.map((member, index) => (
              <div 
                key={member.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-dark-900/60 border border-slate-800/80 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono font-bold text-slate-500 w-4">
                    #{index + 1}
                  </span>
                  <img
                    src={member.avatar_url || 'https://avatars.githubusercontent.com/u/10101?v=4'}
                    alt={member.username}
                    className="w-10 h-10 rounded-full border border-slate-700 object-cover"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-white">{member.name || member.username}</h4>
                    <span className="text-xs text-slate-400 font-mono">@{member.username}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Commits stat */}
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-slate-400 block font-mono">Commits</span>
                    <span className="text-sm font-bold text-brand-cyan font-mono flex items-center gap-1 sm:justify-end">
                      <GitCommit className="w-3.5 h-3.5" />
                      {member.commits_count}
                    </span>
                  </div>

                  {/* Impact score bar */}
                  <div className="text-left sm:text-right min-w-[100px]">
                    <span className="text-xs text-slate-400 block font-mono">Score de Impacto</span>
                    <span className="text-base font-extrabold text-amber-400 font-mono">
                      {member.impact_score} <span className="text-[10px] text-slate-500">pts</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
