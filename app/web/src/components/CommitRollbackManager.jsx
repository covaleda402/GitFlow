import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useUIFeedback } from '../context/UIFeedbackContext';
import { 
  ShieldCheck, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  GitCommit, 
  Terminal,
  Sparkles,
  ExternalLink,
  Flame,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function CommitRollbackManager({ projectId = 1, project }) {
  const { token } = useAuth();
  const { socket } = useSocket();
  const { showToast, confirm } = useUIFeedback();

  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [showExplainer, setShowExplainer] = useState(false);

  const defaultRepo = project?.github_repos?.[0] || project?.github_repo || 'edwin-esquivel-ADSO/GitFlow';

  const fetchHealth = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/commit-health`);
      const data = await res.json();
      if (data.success) {
        setHealthData(data);
      }
    } catch (err) {
      console.error('Error fetching commit health:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, [projectId]);

  useEffect(() => {
    if (!socket) return;
    socket.on('new_commit', fetchHealth);
    socket.on('project_rolled_back', fetchHealth);
    socket.on('commit_health_changed', fetchHealth);
    return () => {
      socket.off('new_commit', fetchHealth);
      socket.off('project_rolled_back', fetchHealth);
      socket.off('commit_health_changed', fetchHealth);
    };
  }, [socket]);

  // Execute Rollback
  const handleRollback = async () => {
    const ok = await confirm({
      title: 'Restaurar al Último Respaldo Estable',
      message: `¿Deseas restaurar las tareas y estado del proyecto al último punto funcional verificado (${healthData?.lastStableCommit?.hash || 'estable'})? Las tareas que hayan sido afectadas por commits con errores volverán a "En Progreso" para ser corregidas.`,
      confirmText: 'Confirmar Restauración',
      cancelText: 'Cancelar',
      type: 'warning'
    });
    if (!ok) return;

    setRestoring(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/rollback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Restauración completada con éxito.', 'success');
        fetchHealth();
      } else {
        showToast(data.error || 'Error al ejecutar restauración.', 'error');
      }
    } catch (err) {
      showToast('Error de conexión al restaurar.', 'error');
    } finally {
      setRestoring(false);
    }
  };

  // Toggle commit health (Dañino vs Estable)
  const handleToggleFaulty = async (commitHash, currentFaulty) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/commits/${commitHash}/toggle-faulty`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_faulty: !currentFaulty })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message, !currentFaulty ? 'warning' : 'success');
        fetchHealth();
      } else {
        showToast(data.error || 'Error al actualizar commit.', 'error');
      }
    } catch (err) {
      showToast('Error de conexión al actualizar estado del commit.', 'error');
    }
  };

  if (!healthData) return null;

  const faultyCommits = healthData.faultyCommits || [];
  const evaluatedCommits = healthData.evaluatedCommits || [];

  return (
    <div className="p-5 sm:p-6 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900/60 shadow-sm space-y-5 font-sans">
      
      {/* Top Banner with Rollback Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
              <span>Control de Commits y Respaldo Continuo</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                Rollback Engine Activo
              </span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Rastreo automático de telemetría de commits, detección de cambios dañinos y restauración a puntos seguros.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setShowExplainer(!showExplainer)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-brand-cyan border border-cyan-500/30 transition-all font-mono"
            title="¿Cómo funciona la telemetría en GitFlow?"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>¿Cómo funciona el flujo?</span>
          </button>

          <button
            onClick={handleRollback}
            disabled={restoring}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-dark-950 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
            title="Restaurar tareas y estado al último commit verificado"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${restoring ? 'animate-spin' : ''}`} />
            <span>{restoring ? 'Restaurando...' : 'Restaurar a Último Respaldo'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Telemetry Flow Explainer Card (Collapsible) */}
      {showExplainer && (
        <div className="p-4 sm:p-5 rounded-2xl bg-cyan-500/5 dark:bg-cyan-500/10 border border-cyan-500/25 space-y-3 animate-fade-in text-xs font-sans">
          <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
            <h5 className="font-bold text-cyan-900 dark:text-brand-cyan flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-cyan" />
              <span>Flujo de Telemetría Ágil y Medición de Commits:</span>
            </h5>
            <button
              onClick={() => setShowExplainer(false)}
              className="text-[11px] font-mono text-cyan-700 dark:text-brand-cyan underline"
            >
              Ocultar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-slate-700 dark:text-slate-300">
            <div className="p-3 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-brand-cyan block">PASO 1</span>
              <strong className="block text-slate-900 dark:text-white">Push en GitHub / Local</strong>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                El desarrollador hace commit con <code>#ID</code> o vincula el commit hash al mover la tarea a QA o Terminar.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-brand-cyan block">PASO 2</span>
              <strong className="block text-slate-900 dark:text-white">Ingesta de Telemetría</strong>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                El webhook o API vincula el commit al repositorio exacto (soporta múltiples repositorios conectados, ej. Frontend y Backend) y emite por WebSocket.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-brand-cyan block">PASO 3</span>
              <strong className="block text-slate-900 dark:text-white">Auditoría de Salud</strong>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Cada commit se analiza: los que superan QA son <strong>Estables</strong>; si introducen errores o rompen pruebas, se marcan como <strong>Dañinos</strong>.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-dark-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-brand-cyan block">PASO 4</span>
              <strong className="block text-slate-900 dark:text-white">Rollback Resiliente</strong>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Al restaurar, las tareas afectadas se reubican en <em>En Progreso</em> y el sistema asegura el código en el último respaldo funcional.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Faulty Commits Alert Banner (if errors detected) */}
      {faultyCommits.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs space-y-2 animate-fade-in">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>⚠️ ALERTA DE INTEGRIDAD: Se han detectado commits dañinos o con errores:</span>
          </div>
          <div className="space-y-1 pl-6">
            {faultyCommits.map(fc => (
              <div key={fc.hash} className="flex items-center gap-2 font-mono text-[11px]">
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold">
                  #{fc.hash}
                </span>
                <span>{fc.message}</span>
                <span className="text-slate-500">(@{fc.author_name})</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-rose-700 dark:text-rose-300 pl-6">
            Puedes pulsar <strong>"Restaurar a Último Respaldo"</strong> arriba para revertir de inmediato las tareas afectadas al último commit estable funcional ({healthData.lastStableCommit?.hash}).
          </p>
        </div>
      )}

      {/* Stable Point & Commits Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Left: Last Known Good Commit Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
            ÚLTIMO RESPALDO ESTABLE VERIFICADO
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25">
              #{healthData.lastStableCommit?.hash || '7a9f1b2'}
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
              {healthData.lastStableCommit?.message || 'feat: configuración inicial estable'}
            </span>
            {healthData.lastStableCommit?.url && (
              <a
                href={healthData.lastStableCommit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-brand-cyan"
                title="Abrir en GitHub"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <span className="text-[10px] font-mono text-slate-500 block pt-1">
            Respaldo asegurado en base de datos • Listo para recuperación inmediata
          </span>
        </div>

        {/* Right: Health Metrics */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block mb-1">
              ESTADO DE INTEGRIDAD DEL CÓDIGO
            </span>
            {faultyCommits.length === 0 ? (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                100% Sin errores bloqueantes (Saludable)
              </span>
            ) : (
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                {faultyCommits.length} commit(s) con fallas detectadas
              </span>
            )}
          </div>
          <div className="text-right font-mono">
            <span className="text-xs text-slate-500 block">Commits Auditados</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">{healthData.totalTracked || 6}</span>
          </div>
        </div>

      </div>

      {/* Audited Commits List with Healthy vs Faulty Badges and Actions */}
      <div className="space-y-2 pt-2">
        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between px-1">
          <span>Historial de Commits Auditados ({evaluatedCommits.length})</span>
          <span className="text-[10px] text-slate-400 font-normal">
            Haz clic en el enlace para abrir el commit en GitHub
          </span>
        </span>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {evaluatedCommits.map(c => {
            const commitUrl = c.url || `https://github.com/${defaultRepo}/commit/${c.hash}`;
            return (
              <div
                key={c.hash}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                  c.is_faulty
                    ? 'bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/30'
                    : 'bg-slate-50 dark:bg-dark-950 border-slate-200 dark:border-slate-800 hover:border-brand-cyan/30'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  {c.is_faulty ? (
                    <span className="p-1.5 rounded-xl bg-rose-500/20 text-rose-500 shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-500 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  )}

                  <div className="truncate">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 dark:text-white truncate">
                        {c.message}
                      </span>
                      {c.task_id && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-700 dark:text-brand-cyan border border-cyan-500/30 font-bold">
                          #{c.task_id}
                        </span>
                      )}
                      {c.is_faulty && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold">
                          Dañino / Falla
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mt-0.5">
                      @{c.author_name} • {new Date(c.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleFaulty(c.hash, c.is_faulty)}
                    className={`text-[10px] font-mono px-2 py-1 rounded-lg border transition-colors ${
                      c.is_faulty
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-600 border-rose-500/30 hover:bg-rose-500/20'
                    }`}
                    title={c.is_faulty ? 'Marcar commit como funcional/estable' : 'Marcar commit como dañino/con error'}
                  >
                    {c.is_faulty ? 'Marcar Estable' : 'Reportar Falla'}
                  </button>

                  <a
                    href={commitUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono font-bold px-2 py-1 rounded-lg bg-slate-200/60 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-brand-cyan transition-colors"
                    title="Ver diff del commit en GitHub"
                  >
                    <span>{c.hash}</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
