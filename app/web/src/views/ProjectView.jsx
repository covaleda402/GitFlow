import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import Navbar from '../components/Navbar';
import KanbanBoard from '../components/KanbanBoard';
import LiveContextEditor from '../components/LiveContextEditor';
import ActivityFeed from '../components/ActivityFeed';
import ContributionDashboard from '../components/ContributionDashboard';
import { 
  Layers, 
  FileText, 
  Radio, 
  BarChart3, 
  GitBranch, 
  ExternalLink,
  Users
} from 'lucide-react';

export default function ProjectView() {
  const { id } = useParams();
  const projectId = parseInt(id, 10) || 1;
  const { joinProject, onlineUsers } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'kanban');
  const [project, setProject] = useState(null);

  // Join the project room on mount
  useEffect(() => {
    joinProject(projectId);
  }, [projectId]);

  // Fetch project details
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

  // Sync tab with search parameters
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const tabs = [
    { id: 'kanban', label: 'Tablero Ágil', icon: Layers, count: null },
    { id: 'context', label: 'Contexto en Vivo', icon: FileText, count: 'Live' },
    { id: 'activity', label: 'Telemetría de Commits', icon: Radio, count: null },
    { id: 'metrics', label: 'Métricas de Aportes', icon: BarChart3, count: null }
  ];

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        
        {/* Project Breadcrumb & Subheader */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
              <span>Proyectos</span>
              <span>/</span>
              <span className="text-brand-cyan">{project ? project.name : 'GitFlow Ecosystem'}</span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              {project ? project.name : 'GitFlow Ecosystem'}
              <a
                href={`https://github.com/${project ? project.github_repo : 'edwin-esquivel-ADSO/GitFlow'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-normal text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg bg-dark-900 border border-slate-700"
              >
                <GitBranch className="w-3.5 h-3.5 text-brand-cyan" />
                <span>{project ? project.github_repo : 'edwin-esquivel-ADSO/GitFlow'}</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
            </h1>
          </div>

          {/* Active Collaborators Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-card text-xs font-mono text-slate-300">
            <Users className="w-4 h-4 text-brand-cyan" />
            <span>Colaboradores en sala:</span>
            <span className="font-bold text-brand-cyan">{onlineUsers.length || 1}</span>
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-800 text-brand-cyan border border-brand-cyan/40 shadow-lg shadow-brand-cyan/5'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-brand-cyan/20 text-brand-cyan">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Rendering */}
        <div className="mt-4">
          {activeTab === 'kanban' && <KanbanBoard projectId={projectId} />}
          {activeTab === 'context' && <LiveContextEditor projectId={projectId} />}
          {activeTab === 'activity' && <ActivityFeed projectId={projectId} />}
          {activeTab === 'metrics' && <ContributionDashboard projectId={projectId} />}
        </div>

      </main>
    </div>
  );
}
