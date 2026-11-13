import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Folder, 
  FileText, 
  FileCode, 
  Image as ImageIcon, 
  ExternalLink, 
  Plus, 
  Eye, 
  X, 
  Save, 
  FolderPlus,
  BookOpen
} from 'lucide-react';

export default function ProjectDocuments({ projectId = 1 }) {
  const { token, user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState({});
  const [selectedFolder, setSelectedFolder] = useState('ALL');
  const [activeDocModal, setActiveDocModal] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Document form state
  const [newTitle, setNewTitle] = useState('');
  const [newFolder, setNewFolder] = useState('Arquitectura');
  const [newType, setNewType] = useState('md');
  const [newUrl, setNewUrl] = useState('');
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadDocuments = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/documents`);
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
        setFolders(data.folders);
      }
    } catch (err) {
      console.error('Error fetching project documents:', err);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [projectId]);

  const handleCreateDoc = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          folder_name: newFolder,
          title: newTitle,
          file_type: newType,
          file_url: newUrl,
          content_markdown: newContent
        })
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setNewTitle('');
        setNewUrl('');
        setNewContent('');
        loadDocuments();
      }
    } catch (err) {
      console.error('Error creating document:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getFileBadge = (type) => {
    switch (type) {
      case 'md':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30 font-bold">.MD</span>;
      case 'pdf':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-500 border border-rose-500/30 font-bold">.PDF</span>;
      case 'docx':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-500 border border-blue-500/30 font-bold">.DOCX</span>;
      case 'img':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-bold">.IMG</span>;
      default:
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-500/15 text-slate-500 font-bold">FILE</span>;
    }
  };

  const filteredDocs = selectedFolder === 'ALL' 
    ? documents 
    : documents.filter(d => d.folder_name === selectedFolder);

  const folderNames = Object.keys(folders);

  return (
    <div className="w-full space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-violet/15 text-brand-violet border border-brand-violet/25">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Contexto & Repositorio de Documentos
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-violet/10 text-brand-violet border border-brand-violet/30">
                {documents.length} archivos
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Especificaciones de arquitectura, requerimientos y notas organizadas por carpetas (.md, .pdf, .docx, imágenes).
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-cyan text-dark-950 hover:bg-cyan-300 transition-all shadow-md shadow-brand-cyan/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nuevo Documento
        </button>
      </div>

      {/* Folders Tab Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedFolder('ALL')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            selectedFolder === 'ALL'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-dark-950 shadow-sm'
              : 'bg-slate-100 dark:bg-dark-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Folder className="w-4 h-4" />
          <span>Todas las Carpetas</span>
          <span className="text-[10px] font-mono opacity-80">({documents.length})</span>
        </button>

        {folderNames.map(name => (
          <button
            key={name}
            onClick={() => setSelectedFolder(name)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedFolder === name
                ? 'bg-brand-cyan text-dark-950 font-bold shadow-md shadow-brand-cyan/20'
                : 'bg-slate-100 dark:bg-dark-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>{name}</span>
            <span className="text-[10px] font-mono opacity-80">({folders[name].length})</span>
          </button>
        ))}
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="p-4 rounded-2xl glass-card border border-slate-200 dark:border-slate-800 hover:border-brand-cyan/40 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <Folder className="w-3 h-3 text-brand-violet" />
                  {doc.folder_name}
                </span>
                {getFileBadge(doc.file_type)}
              </div>

              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-cyan transition-colors mb-1.5">
                {doc.title}
              </h4>

              {doc.content_markdown && (
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed font-mono text-[11px] bg-slate-50 dark:bg-dark-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 mb-3">
                  {doc.content_markdown}
                </p>
              )}

              {doc.file_type === 'img' && doc.file_url && (
                <div className="mb-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 h-32 bg-slate-100 dark:bg-dark-950">
                  <img src={doc.file_url} alt={doc.title} className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Document Bottom Action */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-[10px] text-slate-400 font-mono">
                @{doc.author_username || 'dev'}
              </span>

              {doc.file_type === 'md' ? (
                <button
                  onClick={() => setActiveDocModal(doc)}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-cyan hover:underline"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver Markdown</span>
                </button>
              ) : doc.file_url ? (
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold text-brand-cyan hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir Archivo</span>
                </a>
              ) : null}
            </div>
          </div>
        ))}

        {filteredDocs.length === 0 && (
          <div className="col-span-full p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-400 font-mono">
            No hay documentos en esta carpeta. Haz clic en "Nuevo Documento" para agregar especificaciones o archivos.
          </div>
        )}
      </div>

      {/* View Markdown Modal */}
      {activeDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-2xl max-h-[80vh] flex flex-col p-6 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl bg-white dark:bg-dark-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-cyan" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {activeDocModal.title}
                </h3>
              </div>
              <button onClick={() => setActiveDocModal(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 font-mono text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {activeDocModal.content_markdown || 'Sin contenido de texto.'}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveDocModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl bg-white dark:bg-dark-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-cyan" />
                Registrar Documento / Contexto
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDoc} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1">Título del Documento:</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                  placeholder="ej. Requerimientos de Base de Datos"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1">Carpeta:</label>
                  <select
                    value={newFolder}
                    onChange={(e) => setNewFolder(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                  >
                    <option value="Arquitectura">Arquitectura</option>
                    <option value="Diseño & UX">Diseño & UX</option>
                    <option value="Reuniones & Notas">Reuniones & Notas</option>
                    <option value="Documentación General">Documentación General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1">Tipo de Archivo:</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                  >
                    <option value="md">Markdown (.md)</option>
                    <option value="pdf">Documento PDF (.pdf)</option>
                    <option value="docx">Documento Word (.docx)</option>
                    <option value="img">Imagen / Mockup (.png, .jpg)</option>
                  </select>
                </div>
              </div>

              {newType === 'md' ? (
                <div>
                  <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1">Contenido Markdown:</label>
                  <textarea
                    rows="4"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono resize-none"
                    placeholder="# Título del contexto..."
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1">URL del Archivo / Enlace:</label>
                  <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                    placeholder="https://..."
                    required
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-cyan hover:bg-cyan-400 text-dark-950 shadow-md shadow-brand-cyan/20 disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Guardar Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
