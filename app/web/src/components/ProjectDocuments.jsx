import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUIFeedback } from '../context/UIFeedbackContext';
import { 
  Folder, 
  FileText, 
  ExternalLink, 
  Plus, 
  Eye, 
  X, 
  BookOpen,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  UploadCloud,
  Edit2,
  Trash2,
  Lock
} from 'lucide-react';

export default function ProjectDocuments({ projectId = 1, isOwner = false }) {
  const { token, user } = useAuth();
  const { showToast, confirm } = useUIFeedback();
  
  // Isolated room documents state (zero mock leakage across rooms)
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [activeDocModal, setActiveDocModal] = useState(null);
  const [activeImageModal, setActiveImageModal] = useState(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Document form state
  const [newTitle, setNewTitle] = useState('');
  const [newFolder, setNewFolder] = useState('Arquitectura');
  const [newType, setNewType] = useState('md');
  const [newUrl, setNewUrl] = useState('');
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCloudinary, setUploadingCloudinary] = useState(false);

  // Edit Document form state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editFolder, setEditFolder] = useState('Arquitectura');
  const [editType, setEditType] = useState('md');
  const [editUrl, setEditUrl] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Load room documents strictly scoped to this projectId
  const loadDocuments = async () => {
    try {
      setLoading(true);
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const res = await fetch(`/api/projects/${projectId}/documents`, { headers });
      const data = await res.json();
      
      if (data.success && Array.isArray(data.documents)) {
        setDocuments(data.documents);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error('Error fetching project documents:', err);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadDocuments();
    }
  }, [projectId, token]);

  // Upload attachment to Cloudinary (for new document)
  const handleCloudinaryDocUpload = async (e, isEdit = false) => {
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
            tag: isEdit ? editType : newType
          })
        });

        const data = await res.json();
        if (res.ok && data.url) {
          if (isEdit) {
            setEditUrl(data.url);
          } else {
            setNewUrl(data.url);
          }
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

  // Create new document (Any room member)
  const handleCreateDoc = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSubmitting(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          folder_name: newFolder,
          title: newTitle.trim(),
          file_type: newType,
          file_url: newUrl.trim(),
          content_markdown: newContent
        })
      });

      const data = await res.json();
      if (res.ok && data.document) {
        setDocuments(prev => [data.document, ...prev]);
        showToast('Documento guardado con éxito.', 'success');
        setIsAddModalOpen(false);
        setNewTitle('');
        setNewUrl('');
        setNewContent('');
      } else {
        showToast(data.error || 'Error al registrar documento.', 'error');
      }
    } catch (err) {
      console.error('Error creating document:', err);
      showToast('Error al conectar con el servidor.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Open edit modal
  const handleOpenEditModal = (doc) => {
    setEditingDocId(doc.id);
    setEditTitle(doc.title || '');
    setEditFolder(doc.folder_name || 'Arquitectura');
    setEditType(doc.file_type || 'md');
    setEditUrl(doc.file_url || '');
    setEditContent(doc.content_markdown || '');
    setIsEditModalOpen(true);
  };

  // Submit edit document (Any room member or leader)
  const handleUpdateDoc = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !editingDocId) return;

    setEditSubmitting(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/projects/${projectId}/documents/${editingDocId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          folder_name: editFolder,
          title: editTitle.trim(),
          file_type: editType,
          file_url: editUrl.trim(),
          content_markdown: editContent
        })
      });

      const data = await res.json();
      if (res.ok && data.document) {
        setDocuments(prev => prev.map(d => d.id === editingDocId ? data.document : d));
        showToast('Documento actualizado correctamente.', 'success');
        setIsEditModalOpen(false);
        if (activeDocModal && activeDocModal.id === editingDocId) {
          setActiveDocModal(data.document);
        }
      } else {
        showToast(data.error || 'Error al actualizar documento.', 'error');
      }
    } catch (err) {
      console.error('Error updating document:', err);
      showToast('Error al conectar con el servidor.', 'error');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Delete document (STRICTLY RESTRICTED TO ROOM LEADER / OWNER)
  const handleDeleteDoc = async (doc) => {
    if (!isOwner) {
      showToast('Permiso denegado: Solo el líder de la sala puede eliminar documentos.', 'error');
      return;
    }

    const confirmed = await confirm({
      title: '¿Eliminar documento de la sala?',
      message: `¿Estás seguro de que deseas eliminar permanentemente el documento "${doc.title}"? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/projects/${projectId}/documents/${doc.id}`, {
        method: 'DELETE',
        headers
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDocuments(prev => prev.filter(d => d.id !== doc.id));
        showToast('Documento eliminado con éxito.', 'success');
        if (activeDocModal && activeDocModal.id === doc.id) {
          setActiveDocModal(null);
        }
        if (activeImageModal && activeImageModal.id === doc.id) {
          setActiveImageModal(null);
        }
      } else {
        showToast(data.error || 'No fue posible eliminar el archivo.', 'error');
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      showToast('Error de conexión al eliminar el archivo.', 'error');
    }
  };

  // Folder categories
  const folderCategories = [
    { name: 'Arquitectura', icon: '📐' },
    { name: 'Diseño & UX', icon: '🎨' },
    { name: 'Reuniones & Notas', icon: '📋' },
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
      
      {/* 1. Header Bar */}
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
              Archivos y notas técnicas de la sala. Edición abierta a integrantes; eliminación exclusiva del líder.
            </p>
          </div>
        </div>

        {/* Action Button */}
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
            Carpetas de la Sala
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
      {loading ? (
        <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-400">
          Cargando documentos de la sala...
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="col-span-full p-10 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-dark-900/50">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
            {documents.length === 0 ? 'Esta sala aún no tiene documentos' : 'No hay documentos en esta carpeta'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
            {documents.length === 0 
              ? 'Sube notas técnicas, especificaciones de arquitectura, diagramas o manuales con el botón "Nuevo Documento". Los archivos quedan aislados exclusivamente para esta sala.'
              : 'Selecciona "Todas las Carpetas" o añade un nuevo documento en esta categoría.'}
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-cyan text-dark-950 hover:bg-cyan-300 transition-all font-mono"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear Primer Documento</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-4 rounded-2xl glass-card border border-slate-200 dark:border-slate-800 hover:border-brand-cyan/40 transition-all flex flex-col justify-between group shadow-sm bg-white dark:bg-dark-900"
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

                {/* Image Preview */}
                {doc.file_type === 'img' && doc.file_url && (
                  <div 
                    onClick={() => {
                      setActiveImageModal(doc);
                      setImageZoom(1);
                    }}
                    className="mb-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 h-36 bg-slate-100 dark:bg-dark-950 relative cursor-pointer group/img"
                  >
                    <img
                      src={doc.file_url}
                      alt={doc.title}
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-dark-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-mono text-xs font-semibold">
                      <Maximize2 className="w-4 h-4 text-brand-cyan" />
                      <span>Ampliar / Zoom</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions & Author */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs gap-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[90px]">
                  @{doc.author_username || 'dev'}
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  {/* View action */}
                  {doc.file_type === 'md' ? (
                    <button
                      onClick={() => setActiveDocModal(doc)}
                      className="flex items-center gap-1 text-[11px] font-bold text-cyan-600 dark:text-brand-cyan hover:underline"
                      title="Leer documento"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Leer</span>
                    </button>
                  ) : doc.file_type === 'img' ? (
                    <button
                      onClick={() => {
                        setActiveImageModal(doc);
                        setImageZoom(1);
                      }}
                      className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                      title="Ver imagen"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>Ver</span>
                    </button>
                  ) : doc.file_url ? (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      title="Abrir enlace"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir</span>
                    </a>
                  ) : null}

                  {/* Edit action (Any room member) */}
                  <button
                    onClick={() => handleOpenEditModal(doc)}
                    className="p-1 rounded-lg text-slate-500 hover:text-cyan-600 dark:hover:text-brand-cyan hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Editar documento (Cualquier miembro)"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete action (ONLY Leader/Owner) */}
                  {isOwner && (
                    <button
                      onClick={() => handleDeleteDoc(doc)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Eliminar documento (Exclusivo Líder)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Image Zoom Modal */}
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

            {/* Image viewport */}
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

      {/* 5. View Markdown Modal */}
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

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => {
                  const docToEdit = activeDocModal;
                  setActiveDocModal(null);
                  handleOpenEditModal(docToEdit);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/10 text-cyan-600 dark:text-brand-cyan hover:bg-cyan-500/20"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Editar Contenido</span>
              </button>

              <button
                onClick={() => setActiveDocModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Edit Document Modal (Open to all members in the room) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-lg p-6 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl bg-white dark:bg-dark-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-brand-cyan" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Editar Documento
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDoc} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-1">Título del Documento:</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                  placeholder="ej. Especificación Técnica"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-1">Carpeta:</label>
                  <select
                    value={editFolder}
                    onChange={(e) => setEditFolder(e.target.value)}
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
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                  >
                    <option value="md">Markdown (.md)</option>
                    <option value="pdf">Documento PDF (.pdf)</option>
                    <option value="docx">Documento Word (.docx)</option>
                    <option value="img">Imagen / Mockup (.png, .jpg)</option>
                  </select>
                </div>
              </div>

              {editType === 'md' ? (
                <div>
                  <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-1">Contenido Markdown:</label>
                  <textarea
                    rows="6"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono resize-none"
                    placeholder="# Notas y especificaciones..."
                  />
                </div>
              ) : (
                <div className="space-y-3">
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
                        onChange={(e) => handleCloudinaryDocUpload(e, true)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-1">
                      URL del archivo:
                    </label>
                    <input
                      type="url"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-cyan hover:bg-cyan-400 text-dark-950 shadow-md shadow-brand-cyan/20 disabled:opacity-50"
                >
                  {editSubmitting ? 'Guardando...' : 'Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. New Document Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-lg p-6 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl bg-white dark:bg-dark-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-cyan" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Nuevo Documento de la Sala
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDoc} className="space-y-4 pt-4">
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
                        onChange={(e) => handleCloudinaryDocUpload(e, false)}
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
