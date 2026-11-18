import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
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
  AlertTriangle
} from 'lucide-react';

export default function ProjectView() {
  const { id } = useParams();
  const projectId = parseInt(id, 10) || 1;
  const { joinProject, onlineUsers } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'kanban';
  const [project, setProject] = useState(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  // Sub-tab in Documents: 'repository' (folders) | 'live-editor' (markdown writer)
  const [docSubTab, setDocSubTab] = useState('repository');

  useEffect(() => {
    joinProject(projectId);
  }, [projectId]);

  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        const data = await res.json();
        if (data.success) {
          setProject(data.project);
        }
      } catch (err) {
        console.error('Error fetching project:', err);
      }
    }
    fetchProject();
  }, [projectId]);

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  const handleSimulatePush = async () => {
    try {
      await fetch('/api/webhook/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'feat: integracion de chatbot y carpetas #3',
          author: 'edwin-esquivel',
          taskId: 3
        })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSuspend = async () => {
    const isCurrentlySuspended = project?.status === 'SUSPENDED';
    const newStatus = isCurrentlySuspended ? 'ACTIVE' : 'SUSPENDED';
    const confirmMsg = isCurrentlySuspended
      ? '¿Deseas reanudar las operaciones normales de esta sala?'
      : '¿Deseas suspender temporalmente esta sala? Los miembros no podrán agregar nuevas tareas mientras esté suspendida.';
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProject(prev => ({ ...prev, status: newStatus }));
      } else {
        alert(data.error || 'Error al actualizar estado de la sala.');
      }
    } catch (e) {
      alert('Error de conexión.');
    }
  };

  const handleDeleteRoom = async () => {
    const confirmDelete = window.confirm(
      '¿Estás seguro de eliminar definitivamente esta sala? El historial de tareas completadas se conservará intacto en los perfiles de los usuarios y aparecerá identificado como "Sala eliminada".'
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProject(prev => ({ ...prev, status: 'DELETED' }));
        alert('Sala eliminada definitivamente. Todo el historial se conserva intacto en los perfiles.');
      } else {
        alert(data.error || 'Error al eliminar la sala.');
      }
    } catch (e) {
      alert('Error de conexión al eliminar sala.');
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-950 flex flex-col md:flex-row transition-colors">
      
      {/* 1. Desktop Left Sidebar */}
      <Sidebar 
        projectId={projectId}
        onOpenCreateRoom={() => setIsCreateOpen(true)}
        onOpenJoinRoom={() => setIsJoinOpen(true)}
        onSimulatePush={handleSimulatePush}
      />

      {/* 2. Mobile Top Bar */}
      <MobileTopBar 
        projectName={project ? project.name : 'GitFlow'}
        onOpenRoomsModal={() => setIsCreateOpen(true)}
        onOpenJoinModal={() => setIsJoinOpen(true)}
        onOpenCreateModal={() => setIsCreateOpen(true)}
      />

      {/* 3. Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-8 overflow-y-auto">
        
        {/* Project Header Banner: Clean same-line alignment */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 mb-1 flex-wrap">
              <span>Salas</span>
              <span>/</span>
              <span className="text-cyan-600 dark:text-brand-cyan font-bold">{project ? project.name : 'GitFlow Ecosystem'}</span>
              <span>•</span>
              <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">
                {project?.members?.length || 3} Miembros
              </span>
            </div>
            
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

              <a
                href={`https://github.com/${project ? project.github_repo : 'edwin-esquivel-ADSO/GitFlow'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-normal text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-dark-900 border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <GitBranch className="w-3.5 h-3.5 text-cyan-600 dark:text-brand-cyan" />
                <span className="font-mono">{project ? project.github_repo : 'edwin-esquivel-ADSO/GitFlow'}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </h1>
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
            <div className="space-y-6">
              {/* Sub-tab switcher: Repository vs Live Notion Editor */}
              <div className="flex items-center gap-2 p-1 bg-slate-200/80 dark:bg-dark-900 rounded-xl w-fit text-xs font-mono">
                <button
                  onClick={() => setDocSubTab('repository')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    docSubTab === 'repository' 
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs' 
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  📁 Repositorio de Archivos & Carpetas
                </button>
                <button
                  onClick={() => setDocSubTab('live-editor')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    docSubTab === 'live-editor' 
                      ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-brand-cyan font-bold shadow-xs' 
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  ⚡ Editor Colaborativo en Vivo
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
              <CommitRollbackManager projectId={projectId} />
              <ActivityFeed projectId={projectId} />
            </div>
          )}

          {activeTab === 'analytics' && (
            <ContributionDashboard projectId={projectId} />
          )}
        </div>

      </main>

      {/* 4. Mobile Bottom Navigation (TikTok style) */}
      <MobileBottomNav 
        projectId={projectId} 
        onSimulatePush={handleSimulatePush} 
      />

      {/* 5. Independent Room AI Chatbot */}
      <RoomChatbot 
        projectId={projectId} 
        projectName={project ? project.name : 'GitFlow'} 
      />

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
