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

    // Listen for live typing notification
    const handleUserTyping = (data) => {
      if (data.username !== (user ? user.username : '')) {
        setTypingAlert(`${data.username} está editando ${data.section || 'el documento'}...`);

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setTypingAlert(null);
        }, 3000);
      }
    };

    // Listen for live collaborative draft text stream
    const handleLiveStream = (data) => {
      if (data.lastEditor !== (user ? user.username : '')) {
        setMarkdown(data.markdown);
        setSaveStatus('synced');
      }
    };

    // Listen for persisted document save event
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

  // Handle local text changes with Socket broadcasting
  const handleTextChange = (e) => {
    const val = e.target.value;
    setMarkdown(val);
    setSaveStatus('dirty');

    // Emit typing indicator
    if (socket) {
      socket.emit('typing_context', {
        projectId,
        username: user ? user.username : 'Desarrollador',
        section: 'Especificaciones',
        isTyping: true
      });

      // Stream text draft live to collaborators
      socket.emit('context_draft_change', {
        projectId,
        markdown: val,
        username: user ? user.username : 'Desarrollador'
      });
    }
  };

  // Save changes to database
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

  // Simple Markdown Renderer for Preview
  const renderSimpleMarkdown = (text) => {
    return text
      .split('\n')
      .map((line, idx) => {
        if (line.startsWith('# ')) {
          return <h1 key={idx} className="text-2xl font-bold text-white mt-4 mb-2 pb-1 border-b border-slate-800">{line.replace('# ', '')}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={idx} className="text-xl font-bold text-brand-cyan mt-4 mb-2">{line.replace('## ', '')}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={idx} className="text-base font-semibold text-slate-200 mt-3 mb-1">{line.replace('### ', '')}</h3>;
        }
        if (line.startsWith('- ')) {
          return (
            <li key={idx} className="ml-5 list-disc text-sm text-slate-300 leading-relaxed">
              {line.replace('- ', '')}
            </li>
          );
        }
        if (/^\d+\.\s/.test(line)) {
          return (
            <li key={idx} className="ml-5 list-decimal text-sm text-slate-300 leading-relaxed">
              {line.replace(/^\d+\.\s/, '')}
            </li>
          );
        }
        if (line.trim() === '') {
          return <div key={idx} className="h-2" />;
        }
        return <p key={idx} className="text-sm text-slate-300 leading-relaxed mb-1">{line}</p>;
      });
  };

  return (
    <div className="w-full space-y-4">
      {/* Editor Control Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 glass-panel rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-brand-violet/10 border border-brand-violet/30 text-brand-violet">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Contexto & Telemetría en Vivo
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/30">
                WebSockets Sync
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Documentación técnica compartida con sincronización y presencia en vivo.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex items-center bg-dark-900 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setViewMode('edit')}
              className={`px-2.5 py-1 rounded-md transition-colors ${viewMode === 'edit' ? 'bg-slate-800 text-brand-cyan font-semibold' : 'text-slate-400'}`}
              title="Solo Editor"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded-md transition-colors ${viewMode === 'split' ? 'bg-slate-800 text-brand-cyan font-semibold' : 'text-slate-400'}`}
              title="Vista Dividida"
            >
              Dividido
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-2.5 py-1 rounded-md transition-colors ${viewMode === 'preview' ? 'bg-slate-800 text-brand-cyan font-semibold' : 'text-slate-400'}`}
              title="Solo Vista Previa"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving' || saveStatus === 'synced'}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              saveStatus === 'dirty'
                ? 'bg-brand-cyan text-dark-950 hover:bg-cyan-300 shadow-md shadow-brand-cyan/20 animate-pulse'
                : 'bg-slate-800 text-slate-400 border border-slate-700/60'
            }`}
          >
            {saveStatus === 'saving' ? (
              <>Guardando...</>
            ) : saveStatus === 'synced' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Sincronizado
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Guardar Cambios
              </>
            )}
          </button>
        </div>
      </div>

      {/* Real-time Collaboration Notification Bar */}
      {typingAlert && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-violet/10 border border-brand-violet/30 text-xs font-mono text-brand-violet animate-pulse">
          <Radio className="w-4 h-4 animate-spin" />
          <span>{typingAlert}</span>
        </div>
      )}

      {/* Editor & Preview Area */}
      <div className={`grid gap-4 ${viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        
        {/* Editor Panel */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className="flex flex-col rounded-2xl glass-panel border border-slate-800 overflow-hidden min-h-[500px]">
            <div className="flex items-center justify-between px-4 py-2.5 bg-dark-900/80 border-b border-slate-800 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-2">
                <Edit3 className="w-3.5 h-3.5 text-brand-cyan" />
                Markdown Editor
              </span>
              <span>{markdown.length} caracteres</span>
            </div>
            <textarea
              value={markdown}
              onChange={handleTextChange}
              placeholder="Escribe el contexto del proyecto en formato Markdown..."
              className="flex-1 w-full p-4 bg-transparent text-slate-200 font-mono text-xs sm:text-sm leading-relaxed resize-none focus:outline-none focus:ring-0 selection:bg-brand-cyan/20"
              spellCheck="false"
            />
          </div>
        )}

        {/* Live Markdown Preview */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="flex flex-col rounded-2xl glass-panel border border-slate-800 overflow-hidden min-h-[500px]">
            <div className="flex items-center justify-between px-4 py-2.5 bg-dark-900/80 border-b border-slate-800 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                Vista Previa Renderizada
              </span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                En tiempo real
              </span>
            </div>
            <div className="flex-1 p-6 overflow-y-auto max-h-[600px] prose prose-invert">
              {renderSimpleMarkdown(markdown)}
            </div>
          </div>
        )}

      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 px-2">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Última actualización: {lastSavedTime ? lastSavedTime.toLocaleTimeString() : 'Reciente'}
        </span>
        <span>Colaboradores conectados: {onlineUsers.length || 1}</span>
      </div>

    </div>
  );
}
