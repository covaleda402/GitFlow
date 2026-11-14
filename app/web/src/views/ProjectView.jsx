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
  ShieldCheck
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

          {/* Collaborators online badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-card text-xs font-mono text-slate-700 dark:text-slate-300 self-start sm:self-auto border border-slate-200 dark:border-slate-800">
            <Users className="w-4 h-4 text-cyan-600 dark:text-brand-cyan" />
            <span>Colaboradores en sala:</span>
            <span className="font-bold text-cyan-600 dark:text-brand-cyan">{onlineUsers.length || 1}</span>
          </div>
        </div>

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
