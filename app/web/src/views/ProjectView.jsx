import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useUIFeedback } from '../context/UIFeedbackContext';
import Sidebar from '../components/Sidebar';
import MobileBottomNav from '../components/MobileBottomNav';
import MobileTopBar from '../components/MobileTopBar';
import KanbanBoard from '../components/KanbanBoard';
import ProjectDocuments from '../components/ProjectDocuments';
import LiveContextEditor from '../components/LiveContextEditor';
import TaskHistory from '../components/TaskHistory';
import PreReviewSection from '../components/PreReviewSection';
import ActivityFeed from '../components/ActivityFeed';
import CommitRollbackManager from '../components/CommitRollbackManager';
import ContributionDashboard from '../components/ContributionDashboard';
import RoomChatbot from '../components/RoomChatbot';
import CreateRoomModal from '../components/CreateRoomModal';
import JoinRoomModal from '../components/JoinRoomModal';
import { 
  Layers, 
  FileText, 
  Radio, 
  Archive, 
  BarChart3, 
  GitBranch, 
  ExternalLink,
  Users,
  Bot,
  Sparkles,
  ShieldCheck,
  PauseCircle,
  PlayCircle,
  Trash2,
  AlertTriangle,
  Plus,
  Github,
  X,
  KeyRound
} from 'lucide-react';

export default function ProjectView() {
  const { id } = useParams();
  const projectId = parseInt(id, 10) || 1;
  const { joinProject, onlineUsers } = useSocket();
  const { user, token } = useAuth();
  const { showToast, confirm } = useUIFeedback();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'kanban';
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [userRooms, setUserRooms] = useState([]);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isMobileRoomsOpen, setIsMobileRoomsOpen] = useState(false);
  const [isAddRepoOpen, setIsAddRepoOpen] = useState(false);
  const [newRepoInput, setNewRepoInput] = useState('');
  const [addingRepo, setAddingRepo] = useState(false);

  // Sub-tab in Documents: 'repository' (folders) | 'live-editor' (markdown writer)
  const [docSubTab, setDocSubTab] = useState('repository');

  useEffect(() => {
    joinProject(projectId);
  }, [projectId]);

  useEffect(() => {
    async function fetchProject() {
      try {
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`/api/projects/${projectId}`, { headers });
        const data = await res.json();
        if (data.success) {
          setProject(data.project);
        }
      } catch (err) {
        console.error('Error fetching project:', err);
      }
    }
    fetchProject();
  }, [projectId, token]);

  // Load user rooms for mobile switcher
  useEffect(() => {
    async function loadUserRooms() {
      try {
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/projects', { headers });
        const data = await res.json();
        if (data.success && Array.isArray(data.projects)) {
          setUserRooms(data.projects);
        }
      } catch (e) {
        console.error('Error fetching user rooms:', e);
      }
    }
    loadUserRooms();
  }, [projectId, token]);

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  const handleSimulatePush = async () => {
    try {
      const defaultRepo = project?.github_repos?.[0] || project?.github_repo || 'edwin-esquivel-ADSO/GitFlow';
      await fetch('/api/webhook/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'feat: integracion de telemetria en tiempo real #3',
          author: user ? user.username : 'edwin-esquivel',
          repo: defaultRepo,
          taskId: 3
        })
      });
      showToast('Push de Git simulado exitosamente.', 'info');
    } catch (e) {
      console.error(e);
      showToast('Error al simular push.', 'error');
    }
  };

  const handleToggleSuspend = async () => {
    const isCurrentlySuspended = project?.status === 'SUSPENDED';
    const newStatus = isCurrentlySuspended ? 'ACTIVE' : 'SUSPENDED';
    const confirmMsg = isCurrentlySuspended
      ? '¿Deseas reanudar las operaciones normales de esta sala? Los miembros podrán volver a crear y mover tareas.'
      : '¿Deseas suspender temporalmente esta sala? Los miembros no podrán agregar nuevas tareas mientras esté suspendida.';

    const ok = await confirm({
      title: isCurrentlySuspended ? 'Reanudar Operaciones' : 'Suspender Sala Temporalmente',
      message: confirmMsg,
      confirmText: isCurrentlySuspended ? 'Reanudar Sala' : 'Suspender Sala',
      cancelText: 'Cancelar',
      type: isCurrentlySuspended ? 'info' : 'warning'
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProject(prev => ({ ...prev, status: newStatus }));
        showToast(
          isCurrentlySuspended ? 'Sala reanudada exitosamente.' : 'Sala suspendida temporalmente.', 
          isCurrentlySuspended ? 'success' : 'warning'
        );
      } else {
        showToast(data.error || 'Error al actualizar estado de la sala.', 'error');
      }
    } catch (e) {
      showToast('Error de conexión al actualizar sala.', 'error');
    }
  };

  const handleDeleteRoom = async () => {
    const ok = await confirm({
      title: 'Eliminar Sala Definitivamente',
      message: '¿Estás seguro de eliminar definitivamente esta sala? El historial de tareas completadas se conservará intacto en los perfiles de los usuarios y aparecerá identificado como "Sala eliminada".',
      confirmText: 'Eliminar Definitivamente',
      cancelText: 'Cancelar',
      type: 'danger'
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProject(prev => ({ ...prev, status: 'DELETED' }));
        showToast('Sala eliminada definitivamente. El historial se conserva intacto en los perfiles.', 'success');
      } else {
        showToast(data.error || 'Error al eliminar la sala.', 'error');
      }
    } catch (e) {
      showToast('Error de conexión al eliminar sala.', 'error');
    }
  };

  // Add connected repository autonomously
  const handleAddRepository = async (e) => {
    e.preventDefault();
    if (!newRepoInput.trim()) return;

    setAddingRepo(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/projects/${projectId}/repos`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ repo: newRepoInput.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message, 'success');
        setProject(prev => ({
          ...prev,
          github_repo: data.github_repo,
          github_repos: data.github_repos
        }));
        setIsAddRepoOpen(false);
        setNewRepoInput('');
      } else {
        showToast(data.error || 'Error al vincular repositorio.', 'error');
      }
    } catch (err) {
      showToast('Error de conexión al vincular repositorio.', 'error');
    } finally {
      setAddingRepo(false);
    }
  };

  const tabs = [
    { id: 'kanban', label: 'Tablero Ágil', icon: Layers },
    { id: 'review', label: 'Revisión Previa (QA)', icon: ShieldCheck },
    { id: 'documents', label: 'Documentos & Contexto', icon: FileText },
    { id: 'history', label: 'Historial Terminado', icon: Archive },
    { id: 'telemetry', label: 'Telemetría Commits', icon: Radio },
    { id: 'analytics', label: 'Analítica de Sala', icon: BarChart3 }
  ];

  const connectedRepos = project?.github_repos || (project?.github_repo ? project.github_repo.split(',').map(r => r.trim()).filter(Boolean) : ['edwin-esquivel-ADSO/GitFlow']);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-950 flex flex-col md:flex-row transition-colors">
      
      {/* 1. Desktop Left Sidebar */}
      <Sidebar 
        projectId={projectId} 
        onOpenCreateRoom={() => setIsCreateOpen(true)}
        onOpenJoinRoom={() => setIsJoinOpen(true)}
        onSimulatePush={handleSimulatePush}
      />

      {/* 2. Mobile Top Bar with Room Selector Modal Trigger */}
      <MobileTopBar 
        projectName={project ? project.name : 'GitFlow'}
        onOpenRoomsModal={() => setIsMobileRoomsOpen(true)}
        onOpenCreateModal={() => setIsCreateOpen(true)}
        onOpenJoinModal={() => setIsJoinOpen(true)}
      />

      {/* 3. Main Project Working View Area */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full pb-24 md:pb-8">
        
        {/* Project Header Banner & Connected Repos */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-1">
              <span>Salas</span>
              <span>/</span>
              <span className="text-cyan-700 dark:text-brand-cyan font-bold">{project ? project.name : 'GitFlow Ecosystem'}</span>
              <span>•</span>
              <span>{project?.members?.length || 1} Miembros</span>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3 flex-wrap">
                <span>{project ? project.name : 'GitFlow Ecosystem'}</span>

                {project?.status === 'SUSPENDED' && (
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Sala Suspendida
                  </span>
                )}
                {project?.status === 'DELETED' && (
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" />
                    Sala Eliminada
                  </span>
                )}
              </h1>

              {/* Connected Repositories Badges with Autonomous Add Support */}
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  <Github className="w-3 h-3" />
                  <span>{connectedRepos.length > 1 ? 'Repositorios Conectados:' : 'Repositorio:'}</span>
                </span>

                {connectedRepos.map((repoName, idx) => (
                  <a
                    key={idx}
                    href={`https://github.com/${repoName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-normal text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-brand-cyan flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-dark-900 border border-slate-200 dark:border-slate-700 transition-colors group"
                    title={`Abrir repositorio ${repoName} en GitHub`}
                  >
                    <GitBranch className="w-3 h-3 text-cyan-600 dark:text-brand-cyan" />
                    <span className="font-mono">{repoName}</span>
                    <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-brand-cyan" />
                  </a>
                ))}

                <button
                  type="button"
                  onClick={() => setIsAddRepoOpen(true)}
                  className="text-[11px] font-mono text-cyan-700 dark:text-brand-cyan hover:underline flex items-center gap-1 px-2 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 font-bold transition-colors"
                  title="Conectar otro repositorio a esta sala"
                >
                  <Plus className="w-3 h-3" />
                  <span>Conectar Otro Repo</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Header Actions: Online Badge + Suspend / Delete Room Controls */}
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {/* Collaborators online badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-card text-xs font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
              <Users className="w-4 h-4 text-cyan-600 dark:text-brand-cyan" />
              <span>En sala:</span>
              <span className="font-bold text-cyan-600 dark:text-brand-cyan">{onlineUsers.length || 1}</span>
            </div>

            {/* Room Management Controls */}
            {project?.status !== 'DELETED' && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleToggleSuspend}
                  title={project?.status === 'SUSPENDED' ? 'Reanudar Sala' : 'Suspender Sala temporalmente'}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono font-medium border transition-all ${
                    project?.status === 'SUSPENDED'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
                      : 'bg-slate-100 dark:bg-dark-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-amber-500'
                  }`}
                >
                  {project?.status === 'SUSPENDED' ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                  <span>{project?.status === 'SUSPENDED' ? 'Reanudar' : 'Suspender'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteRoom}
                  title="Eliminar sala definitiva manteniendo el historial de perfiles"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Definitiva</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Room Status Alert Banners */}
        {project?.status === 'SUSPENDED' && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between gap-4 font-sans animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>
                <strong>Atención:</strong> Esta sala se encuentra suspendida temporalmente por el administrador. Las tareas y el historial permanecen en modo solo lectura.
              </span>
            </div>
            <button
              onClick={handleToggleSuspend}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-semibold shrink-0 transition-all"
            >
              Reanudar Sala
            </button>
          </div>
        )}

        {project?.status === 'DELETED' && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3 font-sans animate-fade-in">
            <Trash2 className="w-4 h-4 shrink-0 text-rose-500" />
            <span>
              <strong>Sala Eliminada:</strong> Esta sala ha sido eliminada definitivamente del catálogo activo. El historial de tareas completadas se encuentra preservado y protegido en los perfiles de los usuarios con la insignia <em>"Sala eliminada"</em>.
            </span>
          </div>
        )}

        {/* Tab Switcher Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-brand-cyan border border-brand-cyan/40 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-900/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="mt-2">
          {activeTab === 'kanban' && (
            <KanbanBoard 
              projectId={projectId} 
              onSwitchToHistory={() => handleTabChange('history')} 
              onSwitchToReview={() => handleTabChange('review')}
              project={project}
            />
          )}

          {activeTab === 'review' && (
            <PreReviewSection 
              projectId={projectId} 
              onSwitchToKanban={() => handleTabChange('kanban')}
              onSwitchToHistory={() => handleTabChange('history')}
            />
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <button
                  onClick={() => setDocSubTab('repository')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    docSubTab === 'repository'
                      ? 'bg-cyan-500/15 text-cyan-700 dark:text-brand-cyan border border-cyan-500/30'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Repositorio de Documentos
                </button>
                <button
                  onClick={() => setDocSubTab('live-editor')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    docSubTab === 'live-editor'
                      ? 'bg-cyan-500/15 text-cyan-700 dark:text-brand-cyan border border-cyan-500/30'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Editor de Contexto Colaborativo
                </button>
              </div>

              {docSubTab === 'repository' ? (
                <ProjectDocuments projectId={projectId} />
              ) : (
                <LiveContextEditor projectId={projectId} />
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <TaskHistory projectId={projectId} />
          )}

          {activeTab === 'telemetry' && (
            <div className="space-y-6">
              <CommitRollbackManager projectId={projectId} project={project} />
              <ActivityFeed projectId={projectId} project={project} />
            </div>
          )}

          {activeTab === 'analytics' && (
            <ContributionDashboard projectId={projectId} />
          )}
        </div>

      </main>

      {/* 4. Mobile Bottom Navigation */}
      <MobileBottomNav 
        projectId={projectId} 
        onSimulatePush={handleSimulatePush} 
      />

      {/* 5. Independent Room AI Chatbot */}
      <RoomChatbot 
        projectId={projectId} 
        projectName={project ? project.name : 'GitFlow'} 
      />

      {/* Modal: Connect Another Repository Autonomously */}
      {isAddRepoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fade-in font-sans">
          <div className="glass-panel w-full max-w-md p-5 sm:p-6 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl bg-white dark:bg-dark-900 animate-scale-up space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Github className="w-4 h-4 text-brand-cyan" />
                <span>Conectar Nuevo Repositorio a la Sala</span>
              </h3>
              <button onClick={() => setIsAddRepoOpen(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Agrega repositorios adicionales conectados entre sí (ej. un repositorio para el frontend y otro para el backend, como en el proyecto de Jesús Ariel).
            </p>

            <form onSubmit={handleAddRepository} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1">
                  Nombre del Repositorio en GitHub:
                </label>
                <input
                  type="text"
                  value={newRepoInput}
                  onChange={(e) => setNewRepoInput(e.target.value)}
                  placeholder="ej. edwin-esquivel-ADSO/GitFlow-Backend"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddRepoOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addingRepo}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-cyan hover:bg-cyan-300 text-dark-950 transition-all shadow-md shadow-brand-cyan/20 disabled:opacity-50"
                >
                  {addingRepo ? 'Conectando...' : 'Conectar Repositorio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Mobile Rooms Switcher */}
      {isMobileRoomsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md animate-fade-in font-sans">
          <div className="glass-panel w-full max-w-sm p-5 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl bg-white dark:bg-dark-900 max-h-[85vh] overflow-y-auto space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-cyan" />
                <span>Cambiar de Sala ({userRooms.length})</span>
              </h3>
              <button onClick={() => setIsMobileRoomsOpen(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <div className="space-y-1.5">
              {userRooms.map(r => {
                const isCurrent = r.id === Number(projectId);
                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      setIsMobileRoomsOpen(false);
                      navigate(`/projects/${r.id}`);
                    }}
                    className={`w-full p-2.5 rounded-xl text-xs text-left flex items-center justify-between transition-all ${
                      isCurrent
                        ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-800 dark:text-brand-cyan font-bold'
                        : 'bg-slate-50 dark:bg-dark-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="font-bold block truncate">{r.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono block truncate">
                        {r.github_repo ? r.github_repo.split(',')[0] : 'edwin-esquivel-ADSO/GitFlow'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/50 dark:bg-slate-800 text-slate-500">
                      #{r.id}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsMobileRoomsOpen(false);
                  setIsCreateOpen(true);
                }}
                className="flex-1 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold font-mono text-xs flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva Sala</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileRoomsOpen(false);
                  setIsJoinOpen(true);
                }}
                className="flex-1 py-2 rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-brand-cyan border border-cyan-500/30 font-bold font-mono text-xs flex items-center justify-center gap-1"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Unirse con PIN</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals for Room Creation and Joining */}
      <CreateRoomModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        onCreated={(newRoom) => {
          window.location.href = `/projects/${newRoom.id}`;
        }} 
      />

      <JoinRoomModal 
        isOpen={isJoinOpen} 
        onClose={() => setIsJoinOpen(false)} 
        onJoined={(joinedId) => {
          window.location.href = `/projects/${joinedId}`;
        }} 
      />

    </div>
  );
}
