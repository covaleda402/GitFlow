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

  // Initial load of recent commits
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

  // WebSocket Telemetry: listen for new_commit
  useEffect(() => {
    if (!socket) return;

    const handleNewCommit = (payload) => {
      console.log('[ActivityFeed] New real-time commit telemetry received:', payload);
      
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
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="w-full rounded-2xl glass-panel border border-slate-800 overflow-hidden">
      {/* Feed Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-dark-900/40">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Telemetría de Commits
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Live Feed
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Sincronización instantánea de eventos push desde GitHub.
            </p>
          </div>
        </div>

        <span className="text-xs font-mono text-slate-400">
          {commits.length} commits
        </span>
      </div>

      {/* Commit Items Stream */}
      <div className="divide-y divide-slate-800/80 max-h-[550px] overflow-y-auto">
        {commits.map((commit) => {
          const isFresh = latestIncoming === commit.hash;

          return (
            <div
              key={commit.id || commit.hash}
              className={`p-4 transition-all hover:bg-slate-800/30 ${
                isFresh ? 'bg-brand-cyan/10 border-l-4 border-l-brand-cyan animate-fade-in' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {/* Author Avatar or placeholder */}
                  <img
                    src={`https://github.com/${commit.author_name}.png`}
                    onError={(e) => {
                      e.target.src = 'https://avatars.githubusercontent.com/u/10101?v=4';
                    }}
                    alt={commit.author_name}
                    className="w-7 h-7 rounded-full border border-slate-700 mt-0.5 shrink-0"
                  />

                  <div>
                    {/* Commit Message & Task tag */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-200">
                        {commit.message}
                      </span>
                      {commit.task_id && (
                        <span className="text-[10px] font-mono font-bold text-brand-cyan px-2 py-0.5 rounded bg-brand-cyan/15 border border-brand-cyan/30">
                          #{commit.task_id}
                        </span>
                      )}
                    </div>

                    {/* Metadata line */}
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono text-slate-400">
                      <span className="text-slate-300">@{commit.author_name}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(commit.timestamp)}
                      </span>
                      {commit.task_title && (
                        <>
                          <span>•</span>
                          <span className="text-slate-400 truncate max-w-[150px]">
                            {commit.task_title}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hash pill & External Link */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-dark-900 border border-slate-700 text-slate-300">
                    {commit.hash}
                  </span>
                  {commit.url && (
                    <a
                      href={commit.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded text-slate-500 hover:text-white transition-colors"
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
          <div className="p-8 text-center text-xs text-slate-500 font-mono">
            No se han registrado commits todavía. Haz un push o pulsa "Simular Push".
          </div>
        )}
      </div>
    </div>
  );
}
