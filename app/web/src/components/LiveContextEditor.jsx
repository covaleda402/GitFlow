import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, 
  Save, 
  Eye, 
  Edit3, 
  Users, 
  Sparkles, 
  Check, 
  Radio, 
  Clock 
} from 'lucide-react';

export default function LiveContextEditor({ projectId = 1 }) {
  const { socket, onlineUsers } = useSocket();
  const { user, token } = useAuth();
  const [markdown, setMarkdown] = useState('');
  const [originalMarkdown, setOriginalMarkdown] = useState('');
  const [viewMode, setViewMode] = useState('split'); // 'edit', 'preview', 'split'
  const [saveStatus, setSaveStatus] = useState('synced'); // 'synced', 'saving', 'dirty'
  const [typingAlert, setTypingAlert] = useState(null);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const typingTimeoutRef = useRef(null);

  // Fetch initial project markdown context
  useEffect(() => {
    async function fetchContext() {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        const data = await res.json();
        if (data.success && data.project) {
          setMarkdown(data.project.context_markdown || '');
          setOriginalMarkdown(data.project.context_markdown || '');
          setLastSavedTime(new Date(data.project.updated_at));
        }
      } catch (err) {
        console.error('[Editor] Error loading project context:', err);
      }
    }

    fetchContext();
  }, [projectId]);

  // Socket event listeners for collaborative editing
  useEffect(() => {
    if (!socket) return;

    const handleUserTyping = (data) => {
      if (data.username !== (user ? user.username : '')) {
        setTypingAlert(`${data.username} está editando ${data.section || 'el documento'}...`);

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setTypingAlert(null);
        }, 3000);
      }
    };

    const handleLiveStream = (data) => {
      if (data.lastEditor !== (user ? user.username : '')) {
        setMarkdown(data.markdown);
        setSaveStatus('synced');
      }
    };

    const handleContextPersisted = (data) => {
      if (data.projectId === projectId) {
        setMarkdown(data.context_markdown);
        setOriginalMarkdown(data.context_markdown);
        setLastSavedTime(new Date(data.updated_at));
        setSaveStatus('synced');
      }
    };

    socket.on('user_typing_context', handleUserTyping);
    socket.on('live_context_stream', handleLiveStream);
    socket.on('context_updated', handleContextPersisted);

    return () => {
      socket.off('user_typing_context', handleUserTyping);
      socket.off('live_context_stream', handleLiveStream);
      socket.off('context_updated', handleContextPersisted);
    };
  }, [socket, user, projectId]);

  const handleTextChange = (e) => {
    const val = e.target.value;
    setMarkdown(val);
    setSaveStatus('dirty');

    if (socket) {
      socket.emit('typing_context', {
        projectId,
        username: user ? user.username : 'Desarrollador',
        section: 'Especificaciones',
        isTyping: true
      });

      socket.emit('context_draft_change', {
        projectId,
        markdown: val,
        username: user ? user.username : 'Desarrollador'
      });
    }
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/projects/${projectId}/context`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ context_markdown: markdown })
      });

      if (res.ok) {
        const data = await res.json();
        setOriginalMarkdown(markdown);
        setSaveStatus('synced');
        setLastSavedTime(new Date(data.project.updated_at));
      } else {
        setSaveStatus('dirty');
      }
    } catch (err) {
      console.error('[Editor] Error saving context:', err);
      setSaveStatus('dirty');
    }
  };

  // High contrast renderer in both light and dark mode
  const renderSimpleMarkdown = (text) => {
    return text
      .split('\n')
      .map((line, idx) => {
        if (line.startsWith('# ')) {
          return <h1 key={idx} className="text-2xl font-extrabold text-slate-900 dark:text-white mt-4 mb-2 pb-1.5 border-b border-slate-200 dark:border-slate-800">{line.replace('# ', '')}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={idx} className="text-xl font-bold text-cyan-700 dark:text-brand-cyan mt-4 mb-2">{line.replace('## ', '')}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={idx} className="text-base font-bold text-slate-800 dark:text-slate-200 mt-3 mb-1">{line.replace('### ', '')}</h3>;
        }
        if (line.startsWith('- ')) {
          return (
            <li key={idx} className="ml-5 list-disc text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {line.replace('- ', '')}
            </li>
          );
        }
        if (/^\d+\.\s/.test(line)) {
          return (
            <li key={idx} className="ml-5 list-decimal text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {line.replace(/^\d+\.\s/, '')}
            </li>
          );
        }
        if (line.trim() === '') {
          return <div key={idx} className="h-2" />;
        }
        return <p key={idx} className="text-xs sm:text-sm text-slate-800 dark:text-slate-300 leading-relaxed mb-1.5">{line}</p>;
      });
  };

  return (
    <div className="w-full space-y-4">
      
      {/* Editor Control Toolbar: High contrast in light & dark mode */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4.5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900/70 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-700 dark:text-brand-violet border border-purple-500/25 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Editor Colaborativo en Vivo
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-brand-cyan border border-cyan-500/30 font-bold">
                WebSockets Sync
              </span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Documentación técnica compartida con sincronización en tiempo real entre colaboradores.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* View mode toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-dark-950 border border-slate-300 dark:border-slate-800 rounded-xl p-0.5 text-xs">
            <button
              onClick={() => setViewMode('edit')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1.5 ${viewMode === 'edit' ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-brand-cyan font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
              title="Solo Editor"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Editor</span>
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${viewMode === 'split' ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-brand-cyan font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
              title="Vista Dividida"
            >
              Dividido
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1.5 ${viewMode === 'preview' ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-brand-cyan font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
              title="Solo Vista Previa"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Previa</span>
            </button>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving' || saveStatus === 'synced'}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              saveStatus === 'dirty'
                ? 'bg-brand-cyan text-dark-950 hover:bg-cyan-300 shadow-md shadow-brand-cyan/20 animate-pulse font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
            }`}
          >
            {saveStatus === 'saving' ? (
              <>Guardando...</>
            ) : saveStatus === 'synced' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Sincronizado</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Real-time Collaboration Notification Bar */}
      {typingAlert && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-100 dark:bg-brand-violet/15 border border-purple-300 dark:border-brand-violet/30 text-xs font-mono text-purple-800 dark:text-brand-violet animate-pulse shadow-xs">
          <Radio className="w-4 h-4 animate-spin text-purple-600 dark:text-brand-violet" />
          <span className="font-semibold">{typingAlert}</span>
        </div>
      )}

      {/* Editor & Preview Area */}
      <div className={`grid gap-4 ${viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        
        {/* Editor Panel */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className="flex flex-col rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[500px] bg-white dark:bg-dark-950 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-100/80 dark:bg-dark-900/80 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
              <span className="flex items-center gap-2">
                <Edit3 className="w-3.5 h-3.5 text-cyan-600 dark:text-brand-cyan" />
                <span>Editor Markdown</span>
              </span>
              <span>{markdown.length} caracteres</span>
            </div>
            <textarea
              value={markdown}
              onChange={handleTextChange}
              placeholder="Escribe el contexto y requerimientos de la sala en formato Markdown..."
              className="flex-1 w-full p-4 sm:p-5 bg-transparent text-slate-900 dark:text-slate-100 font-mono text-xs sm:text-sm leading-relaxed resize-none focus:outline-none focus:ring-0 selection:bg-cyan-500/20"
              spellCheck="false"
            />
          </div>
        )}

        {/* Live Markdown Preview */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="flex flex-col rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[500px] bg-white dark:bg-dark-950 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-100/80 dark:bg-dark-900/80 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
              <span className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Vista Previa Renderizada</span>
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                En tiempo real
              </span>
            </div>
            <div className="flex-1 p-6 overflow-y-auto max-h-[600px] bg-white dark:bg-transparent">
              {renderSimpleMarkdown(markdown)}
            </div>
          </div>
        )}

      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 px-2 font-medium">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-cyan-600 dark:text-brand-cyan" />
          Última actualización: {lastSavedTime ? lastSavedTime.toLocaleTimeString() : 'Reciente'}
        </span>
        <span>Colaboradores conectados: {onlineUsers.length || 1}</span>
      </div>

    </div>
  );
}
