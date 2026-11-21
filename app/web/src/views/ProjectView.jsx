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
  KeyRound,
  Lock
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
  const [accessDenied, setAccessDenied] = useState(null);
  const [userRooms, setUserRooms] = useState([]);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isMobileRoomsOpen, setIsMobileRoomsOpen] = useState(false);
  const [isAddRepoOpen, setIsAddRepoOpen] = useState(false);
  const [newRepoInput, setNewRepoInput] = useState('');
  const [addingRepo, setAddingRepo] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

  // Sub-tab in Documents: 'repository' (folders) | 'live-editor' (markdown writer)
  const [docSubTab, setDocSubTab] = useState('repository');

  useEffect(() => {
    if (!accessDenied) {
      joinProject(projectId);
    }
  }, [projectId, accessDenied]);

  useEffect(() => {
    async function fetchProject() {
      try {
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`/api/projects/${projectId}`, { headers });
        const data = await res.json();

        if (res.status === 403 || data.notMember) {
          setAccessDenied({
            notMember: true,
            projectName: data.projectName || 'Sala Privada',
            error: data.error || 'No perteneces a esta sala de desarrollo.'
          });
          setProject(null);
          return;
        }

        if (data.success) {
          setAccessDenied(null);
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
        projectName={accessDenied ? (accessDenied.projectName || 'Sala Privada') : (project ? project.name : 'GitFlow')}
        onOpenRoomsModal={() => setIsMobileRoomsOpen(true)}
        onOpenCreateModal={() => setIsCreateOpen(true)}
        onOpenJoinModal={() => setIsJoinOpen(true)}
      />

      {/* 3. Main Project Working View Area */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full pb-24 md:pb-8">
        
        {accessDenied ? (
          <div className="max-w-xl mx-auto my-12 p-8 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900/80 shadow-2xl text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-lg shadow-amber-500/10">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-mono font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Sala Privada (OWASP A01)</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {accessDenied.projectName || 'Sala Privada'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                {accessDenied.error || 'No perteneces a esta sala. Para proteger el código y la telemetría, sus tareas y commits están restringidos a miembros autorizados.'}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={() => setIsJoinOpen(true)}
                className="py-2.5 px-5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>Unirse con Código (5 min)</span>
              </button>

              <button
                onClick={() => navigate('/dashboard')}
                className="py-2.5 px-5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Volver al Panel de Salas</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Project Header Banner & Connected Repos */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-1 flex-wrap">
              <span>Salas</span>
              <span>/</span>
              <span className="text-cyan-700 dark:text-brand-cyan font-bold">{project ? project.name : 'GitFlow Ecosystem'}</span>
              <span>•</span>
              <button
                type="button"
                onClick={() => setIsMembersModalOpen(true)}
                className="hover:text-cyan-600 dark:hover:text-brand-cyan underline cursor-pointer flex items-center gap-1 font-semibold transition-colors"
                title="Ver lista de miembros y accesos de la sala"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{project?.members?.length || 1} Miembros</span>
              </button>
              {project?.owner_username && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-bold bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30 text-[11px]">
                    <span>👑</span>
                    <span>Líder: @{project.owner_username}</span>
                  </span>
                </>
              )}
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
            {/* Members List Modal Trigger Button */}
            <button
              type="button"
              onClick={() => setIsMembersModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-mono font-medium transition-all shadow-xs"
              title="Ver lista de miembros y roles de la sala"
            >
              <Users className="w-3.5 h-3.5 text-cyan-600 dark:text-brand-cyan" />
              <span>Miembros ({project?.members?.length || 1})</span>
            </button>

            {/* Collaborators online badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-card text-xs font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
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
          </>
        )}

      </main>

      {/* 4. Mobile Bottom Navigation */}
      <MobileBottomNav 
        projectId={accessDenied ? null : projectId} 
        onSimulatePush={handleSimulatePush} 
      />

      {/* 5. Independent Room AI Chatbot (Only active when inside an authorized room) */}
      {!accessDenied && project && (
        <RoomChatbot 
          projectId={projectId} 
          projectName={project.name || 'GitFlow'} 
        />
      )}

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

      {/* Miembros de la Sala Modal */}
      {isMembersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-dark-950/80 backdrop-blur-sm animate-fade-in font-sans">
          <div className="glass-panel w-full max-w-lg p-5 sm:p-6 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl bg-white dark:bg-dark-900 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-brand-cyan border border-cyan-500/30 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Miembros de la Sala
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Auditoría de acceso y roles en {project?.name || 'GitFlow'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMembersModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Members List */}
            <div className="my-4 space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
              {(project?.members && project.members.length > 0 ? project.members : [
                {
                  id: 1,
                  user_id: project?.owner_id || 1,
                  username: project?.owner_username || 'edwin-esquivel',
                  name: 'Edwin Esquivel',
                  role: 'OWNER',
                  avatar: project?.owner_avatar || 'https://avatars.githubusercontent.com/u/10101?v=4',
                  joined_at: project?.created_at || new Date().toISOString()
                }
              ]).map((member, idx) => {
                const isLeader = member.user_id === project?.owner_id || member.role === 'OWNER' || (project?.owner_username && member.username?.toLowerCase() === project.owner_username.toLowerCase());
                const isOnline = onlineUsers.some(u => 
                  (u.id && member.user_id && Number(u.id) === Number(member.user_id)) ||
                  (u.username && member.username && u.username.toLowerCase() === member.username.toLowerCase())
                );

                return (
                  <div
                    key={member.id || idx}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={member.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${member.username}`}
                          alt={member.username}
                          className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 object-cover"
                        />
                        <span 
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-dark-950 ${
                            isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                          title={isOnline ? 'En línea en este momento' : 'Desconectado'}
                        />
                      </div>

                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {member.name || member.username}
                          </span>
                        </div>
                        <span className="text-[11px] text-cyan-700 dark:text-brand-cyan font-mono block">
                          @{member.username}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          Unido: {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : 'Activo'}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {isLeader ? (
                        <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[11px] font-mono font-bold flex items-center gap-1">
                          <span>👑</span>
                          <span>Líder</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-brand-cyan border border-cyan-500/25 text-[11px] font-mono font-medium flex items-center gap-1">
                          <span>💻</span>
                          <span>Miembro</span>
                        </span>
                      )}
                      
                      <span className={`text-[10px] font-mono font-semibold ${isOnline ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {isOnline ? '● En línea' : '○ Desconectado'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Security Notice Footer */}
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-mono flex items-start gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Seguridad y Privacidad:</strong> La lista de tareas, historial y commits de esta sala están cifrados en tránsito y restringidos estrictamente a los miembros autorizados.
              </span>
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsMembersModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white dark:text-brand-cyan border border-slate-700 transition-colors shadow-xs"
              >
                Cerrar
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
