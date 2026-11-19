import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUIFeedback } from '../context/UIFeedbackContext';
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
  BookOpen,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Calendar,
  User,
  Search,
  UploadCloud
} from 'lucide-react';

const INITIAL_DOCS = [
  {
    id: 1,
    folder_name: 'Arquitectura',
    title: 'Diagrama de Flujo y Microservicios',
    file_type: 'md',
    file_url: '',
    content_markdown: '# Arquitectura del Ecosistema GitFlow\n\n## Servicios Principales:\n1. Ingestión de Webhooks con Regex Parser.\n2. Conexiones Socket.io con salas por proyecto.\n3. Base de Datos Neon PostgreSQL con Prepared Statements.\n4. Rotación criptográfica de códigos de 5 minutos.',
    author_username: 'edwin-esquivel',
    created_at: '2026-11-01T10:00:00Z'
  },
  {
    id: 2,
    folder_name: 'Arquitectura',
    title: 'Guía de Despliegue en Vercel Monorepo',
    file_type: 'pdf',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    content_markdown: '',
    author_username: 'edwin-esquivel',
    created_at: '2026-11-02T10:00:00Z'
  },
  {
    id: 3,
    folder_name: 'Diseño & UX',
    title: 'Mockup de Navegación Móvil TikTok Style',
    file_type: 'img',
    file_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    content_markdown: '',
    author_username: 'alex-coder',
    created_at: '2026-11-03T10:00:00Z'
  },
  {
    id: 4,
    folder_name: 'Diseño & UX',
    title: 'Especificaciones de Paleta de Colores y Contrastes',
    file_type: 'docx',
    file_url: 'https://calibre-ebook.com/downloads/demos/demo.docx',
    content_markdown: '',
    author_username: 'alex-coder',
    created_at: '2026-11-03T11:00:00Z'
  },
  {
    id: 5,
    folder_name: 'Reuniones & Notas',
    title: 'Minuta de Kickoff y Roles OMNICODE',
    file_type: 'md',
    file_url: '',
    content_markdown: '# Minuta de Kickoff OMNICODE\n\n- **A00**: Orquestador General.\n- **A03/A05**: Product Owner y UX.\n- **A06/A10**: Arquitecto y DBA.\n- **Desarrollador Principal**: Edwin Esquivel.',
    author_username: 'maria-dev',
    created_at: '2026-11-04T10:00:00Z'
  },
  {
    id: 6,
    folder_name: 'Documentación General',
    title: 'Manual de Vinculación de GitHub OAuth y Webhooks',
    file_type: 'md',
    file_url: '',
    content_markdown: '# Guía de Vinculación GitHub\n\nConfiguración paso a paso de Client ID, Secret y endpoint receptor de commits.',
    author_username: 'edwin-esquivel',
    created_at: '2026-11-05T09:00:00Z'
  },
  {
    id: 7,
    folder_name: 'Diseño & UX',
    title: 'Wireframes de Tablero Ágil y Chatbot',
    file_type: 'img',
    file_url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=1200&q=80',
    content_markdown: '',
    author_username: 'maria-dev',
    created_at: '2026-11-05T14:00:00Z'
  }
];

export default function ProjectDocuments({ projectId = 1 }) {
  const { token } = useAuth();
  const { showToast } = useUIFeedback();
  const [documents, setDocuments] = useState(INITIAL_DOCS);
  const [selectedFolder, setSelectedFolder] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [activeDocModal, setActiveDocModal] = useState(null);
  const [activeImageModal, setActiveImageModal] = useState(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Document form
  const [newTitle, setNewTitle] = useState('');
  const [newFolder, setNewFolder] = useState('Arquitectura');
  const [newType, setNewType] = useState('md');
  const [newUrl, setNewUrl] = useState('');
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCloudinary, setUploadingCloudinary] = useState(false);

  const handleCloudinaryDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('El archivo no debe superar los 10MB.', 'warning');
      return;
    }

    setUploadingCloudinary(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            file: reader.result,
            folder: 'documents',
            tag: newType
          })
        });

        const data = await res.json();
        if (res.ok && data.url) {
          setNewUrl(data.url);
          showToast('Archivo subido con éxito a Cloudinary.', 'success');
        } else {
          showToast(data.error || 'Error al subir archivo a Cloudinary.', 'error');
        }
      } catch (err) {
        console.error('Error uploading file to Cloudinary:', err);
        showToast('Error de conexión al subir el archivo.', 'error');
      } finally {
        setUploadingCloudinary(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const loadDocuments = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/documents`);
      const data = await res.json();
      if (data.success && data.documents && data.documents.length > 0) {
        setDocuments(data.documents);
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

      const data = await res.json();
      if (res.ok && data.document) {
        setDocuments(prev => [...prev, data.document]);
      } else {
        // Fallback local append
        const localDoc = {
          id: Date.now(),
          folder_name: newFolder,
          title: newTitle,
          file_type: newType,
          file_url: newUrl,
          content_markdown: newContent,
          author_username: 'edwin-esquivel',
          created_at: new Date().toISOString()
        };
        setDocuments(prev => [...prev, localDoc]);
      }

      setIsAddModalOpen(false);
      setNewTitle('');
      setNewUrl('');
      setNewContent('');
    } catch (err) {
      console.error('Error creating document:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Extract unique folders and compute counts
  const folderCategories = [
    { name: 'Arquitectura', icon: '📐' },
    { name: 'Diseño & UX', icon: '🎨' },
    { name: 'Reuniones & Notas', icon: '📝' },
    { name: 'Documentación General', icon: '📚' }
  ];

  const getFolderCount = (fName) => documents.filter(d => d.folder_name === fName).length;

  const filteredDocs = documents.filter(doc => {
    const matchesFolder = selectedFolder === 'ALL' || doc.folder_name === selectedFolder;
    const matchesSearch = !searchTerm || doc.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const getFileBadge = (type) => {
    switch (type) {
      case 'md':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-brand-cyan border border-cyan-500/30 font-bold">.MD</span>;
      case 'pdf':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold">.PDF</span>;
      case 'docx':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-bold">.DOCX</span>;
      case 'img':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">.IMG</span>;
      default:
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-600 dark:text-slate-300 font-bold">DOC</span>;
    }
  };

  return (
    <div className="w-full space-y-6">
      
      {/* 1. Header Bar: Aligned horizontally, buttons on the same line */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-violet/15 text-brand-violet border border-brand-violet/25 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Repositorio de Documentos & Contexto
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-cyan/15 text-cyan-700 dark:text-brand-cyan border border-brand-cyan/30 font-semibold">
                {documents.length} archivos
              </span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Archivos y notas técnicas organizadas en carpetas con soporte para Markdown, PDF, Word e Imágenes.
            </p>
          </div>
        </div>

        {/* Action Button: Aligned in same row */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-cyan text-dark-950 hover:bg-cyan-300 transition-all shadow-md shadow-brand-cyan/20 font-mono"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Documento</span>
          </button>
        </div>
      </div>

      {/* 2. Visual Folder Explorer Cards */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
            Carpetas del Proyecto
          </span>
          {/* Quick search input */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar archivo..."
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none text-xs w-28 sm:w-44"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* All Folders card */}
          <button
            onClick={() => setSelectedFolder('ALL')}
            className={`p-3.5 rounded-2xl text-left transition-all border flex flex-col justify-between ${
              selectedFolder === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-dark-950 border-transparent shadow-md'
                : 'bg-white dark:bg-dark-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-brand-cyan/40'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">📁</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800/80 font-bold">
                {documents.length}
              </span>
            </div>
            <span className="text-xs font-bold truncate">Todas las Carpetas</span>
          </button>

          {/* Individual Category Folders */}
          {folderCategories.map(cat => {
            const count = getFolderCount(cat.name);
            const isSelected = selectedFolder === cat.name;

            return (
              <button
                key={cat.name}
                onClick={() => setSelectedFolder(cat.name)}
                className={`p-3.5 rounded-2xl text-left transition-all border flex flex-col justify-between ${
                  isSelected
                    ? 'bg-brand-cyan text-dark-950 border-brand-cyan font-bold shadow-md shadow-brand-cyan/20'
                    : 'bg-white dark:bg-dark-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-brand-cyan/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg">{cat.icon}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    isSelected ? 'bg-dark-950/20 text-dark-950' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    {count}
                  </span>
                </div>
                <span className="text-xs font-bold truncate">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Files Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="p-4 rounded-2xl glass-card border border-slate-200 dark:border-slate-800 hover:border-brand-cyan/40 transition-all flex flex-col justify-between group shadow-sm"
          >
            <div>
              {/* Card Header: Folder tag & file type badge */}
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <Folder className="w-3.5 h-3.5 text-brand-violet" />
                  {doc.folder_name}
                </span>
                {getFileBadge(doc.file_type)}
              </div>

              {/* Title */}
              <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-brand-cyan transition-colors mb-2 leading-snug">
                {doc.title}
              </h4>

              {/* Text content snippet for Markdown */}
              {doc.content_markdown && (
                <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed bg-slate-50 dark:bg-dark-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 mb-3">
                  {doc.content_markdown}
                </p>
              )}

              {/* Image Preview with Zoom icon */}
              {doc.file_type === 'img' && doc.file_url && (
                <div 
                  onClick={() => {
                    setActiveImageModal(doc);
                    setImageZoom(1);
                  }}
                  className="mb-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 h-36 bg-slate-100 dark:bg-dark-950 relative cursor-pointer group/img"
                  title="Haz clic para hacer zoom"
                >
                  <img src={doc.file_url} alt={doc.title} className="w-full h-full object-cover transition-transform group-hover/img:scale-105" />
                  <div className="absolute inset-0 bg-dark-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-mono text-xs font-semibold backdrop-blur-xs">
                    <Maximize2 className="w-4 h-4 text-brand-cyan" />
                    <span>Ampliar / Zoom</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions & Author */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                @{doc.author_username || 'dev'}
              </span>

              {doc.file_type === 'md' ? (
                <button
                  onClick={() => setActiveDocModal(doc)}
                  className="flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-brand-cyan hover:underline"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Leer / Editar</span>
                </button>
              ) : doc.file_type === 'img' ? (
                <button
                  onClick={() => {
                    setActiveImageModal(doc);
                    setImageZoom(1);
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Ver con Zoom</span>
                </button>
              ) : doc.file_url ? (
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir Archivo</span>
                </a>
              ) : null}
            </div>
          </div>
        ))}

        {filteredDocs.length === 0 && (
          <div className="col-span-full p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-mono">
            No se encontraron documentos en esta carpeta. Usa el botón "Nuevo Documento" para registrar uno.
          </div>
        )}
      </div>

      {/* 4. Image Zoom Modal (Pan & Zoom capability) */}
      {activeImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/85 backdrop-blur-md animate-fade-in">
          <div className="glass-panel w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl bg-white dark:bg-dark-900 overflow-hidden">
            
            {/* Modal Bar */}
            <div className="p-4 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {activeImageModal.title}
                </h3>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  Carpeta: {activeImageModal.folder_name} • Zoom: {Math.round(imageZoom * 100)}%
                </span>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setImageZoom(prev => Math.max(0.5, prev - 0.25))}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-brand-cyan"
                  title="Alejar (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setImageZoom(1)}
                  className="px-2 py-1 text-xs font-mono rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  title="Restablecer Zoom"
                >
                  100%
                </button>
                <button
                  onClick={() => setImageZoom(prev => Math.min(3, prev + 0.25))}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-brand-cyan"
                  title="Acercar (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveImageModal(null)}
                  className="p-1.5 ml-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Image viewport with scrollable zoom container */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100/50 dark:bg-dark-950/70">
              <img
                src={activeImageModal.file_url}
                alt={activeImageModal.title}
                style={{ transform: `scale(${imageZoom})`, transformOrigin: 'center center' }}
                className="max-h-[65vh] rounded-xl object-contain transition-transform duration-200 shadow-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. View/Edit Markdown Modal */}
      {activeDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-2xl max-h-[85vh] flex flex-col p-6 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl bg-white dark:bg-dark-900">
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

      {/* 6. Add Document Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl bg-white dark:bg-dark-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-cyan" />
                Registrar Documento en la Sala
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDoc} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-1">Título del Documento:</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                  placeholder="ej. Requerimientos de Microservicios"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-1">Carpeta Destino:</label>
                  <select
                    value={newFolder}
                    onChange={(e) => setNewFolder(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                  >
                    <option value="Arquitectura">Arquitectura</option>
                    <option value="Diseño & UX">Diseño & UX</option>
                    <option value="Reuniones & Notas">Reuniones & Notas</option>
                    <option value="Documentación General">Documentación General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-1">Tipo de Archivo:</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
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
                  <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-1">Contenido Markdown:</label>
                  <textarea
                    rows="4"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono resize-none"
                    placeholder="# Título del contexto..."
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Cloudinary direct upload option */}
                  <div className="p-3 rounded-xl bg-cyan-500/5 dark:bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <UploadCloud className="w-4 h-4 text-cyan-600 dark:text-brand-cyan" />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Subir a Cloudinary:
                      </span>
                    </div>
                    <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-brand-cyan border border-brand-cyan/40 text-[11px] font-mono hover:bg-slate-800 transition-all">
                      <span>{uploadingCloudinary ? 'Subiendo...' : 'Examinar'}</span>
                      <input
                        type="file"
                        disabled={uploadingCloudinary}
                        onChange={handleCloudinaryDocUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-1">
                      O URL directa del archivo / imagen:
                    </label>
                    <input
                      type="url"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                      placeholder="https://images.unsplash.com/... o enlace de Cloudinary"
                      required
                    />
                  </div>
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
                  {submitting ? 'Guardando...' : 'Guardar Archivo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
