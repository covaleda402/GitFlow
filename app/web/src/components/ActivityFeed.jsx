import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { 
  GitCommit, 
  ExternalLink, 
  Radio, 
  User, 
  CheckCircle, 
  Clock, 
  Layers 
} from 'lucide-react';

export default function ActivityFeed({ projectId = 1 }) {
  const { socket } = useSocket();
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [latestIncoming, setLatestIncoming] = useState(null);

  useEffect(() => {
    async function fetchCommits() {
      try {
        const res = await fetch(`/api/projects/${projectId}/dashboard`);
        const data = await res.json();
        if (data.success && data.data && data.data.recentCommits) {
          setCommits(data.data.recentCommits);
        }
      } catch (err) {
        console.error('[ActivityFeed] Error loading commits:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCommits();
  }, [projectId]);

  useEffect(() => {
    if (!socket) return;

    const handleNewCommit = (payload) => {
      const newCommitRecord = {
        id: payload.commit.id || Date.now(),
        hash: payload.commit.hash,
        message: payload.commit.message,
        author_name: payload.commit.author_name,
        task_id: payload.task_id,
        task_title: payload.task ? payload.task.title : null,
        url: payload.commit.url,
        timestamp: payload.commit.timestamp || new Date()
      };

      setLatestIncoming(newCommitRecord.hash);
      setTimeout(() => setLatestIncoming(null), 4000);

      setCommits(prev => [newCommitRecord, ...prev.filter(c => c.hash !== newCommitRecord.hash)]);
    };

    socket.on('new_commit', handleNewCommit);

    return () => {
      socket.off('new_commit', handleNewCommit);
    };
  }, [socket]);

  const formatRelativeTime = (timestamp) => {
    const diff = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (diff < 60) return 'hace un momento';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    return new Date(timestamp).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      
      {/* Feed Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-dark-900/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-700 dark:text-brand-cyan shrink-0">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Telemetría de Commits en Vivo
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                Live Feed
              </span>
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Sincronización instantánea de eventos push desde GitHub.
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
          {commits.length} commits
        </span>
      </div>

      {/* Commit Stream List with High Contrast in Both Modes */}
      <div className="divide-y divide-slate-200 dark:divide-slate-800/80 max-h-[550px] overflow-y-auto">
        {commits.map((commit) => {
          const isFresh = latestIncoming === commit.hash;

          return (
            <div
              key={commit.id || commit.hash}
              className={`p-4 transition-all hover:bg-slate-100/70 dark:hover:bg-slate-800/40 ${
                isFresh ? 'bg-cyan-500/10 border-l-4 border-l-brand-cyan animate-fade-in' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <img
                    src={`https://github.com/${commit.author_name}.png`}
                    onError={(e) => {
                      e.target.src = 'https://avatars.githubusercontent.com/u/10101?v=4';
                    }}
                    alt={commit.author_name}
                    className="w-7 h-7 rounded-full border border-slate-300 dark:border-slate-700 mt-0.5 shrink-0 object-cover"
                  />

                  <div>
                    {/* Commit Message: High contrast in light & dark */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {commit.message}
                      </span>
                      {commit.task_id && (
                        <span className="text-[10px] font-mono font-bold text-cyan-700 dark:text-brand-cyan px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 shrink-0">
                          #{commit.task_id}
                        </span>
                      )}
                    </div>

                    {/* Metadata line: High contrast slate text */}
                    <div className="flex items-center gap-2 sm:gap-3 mt-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-400 flex-wrap">
                      <span className="text-slate-800 dark:text-slate-200 font-bold">
                        @{commit.author_name}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <Clock className="w-3 h-3 text-cyan-600 dark:text-brand-cyan" />
                        {formatRelativeTime(commit.timestamp)}
                      </span>
                      {commit.task_title && (
                        <>
                          <span>•</span>
                          <span className="text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                            {commit.task_title}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hash pill & External Link */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                    {commit.hash}
                  </span>
                  {commit.url && (
                    <a
                      href={commit.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                      title="Ver commit en GitHub"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {commits.length === 0 && !loading && (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 font-mono">
            No se han registrado commits todavía. Haz un push o pulsa "Simular Push".
          </div>
        )}
      </div>
    </div>
  );
}
