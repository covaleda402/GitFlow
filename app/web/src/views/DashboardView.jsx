import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import MobileBottomNav from '../components/MobileBottomNav';
import MobileTopBar from '../components/MobileTopBar';
import ContributionDashboard from '../components/ContributionDashboard';
import ActivityFeed from '../components/ActivityFeed';
import CreateRoomModal from '../components/CreateRoomModal';
import JoinRoomModal from '../components/JoinRoomModal';
import { 
  GitBranch, 
  ExternalLink, 
  Layers, 
  FileText, 
  Radio, 
  ChevronRight, 
  Sparkles,
  Github,
  Users,
  ShieldCheck
} from 'lucide-react';

export default function DashboardView() {
  const [project, setProject] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  useEffect(() => {
    async function loadProject() {
      try {
        const res = await fetch('/api/projects/1');
        const data = await res.json();
        if (data.success) {
          setProject(data.project);
        }
      } catch (err) {
        console.error('Error loading project summary:', err);
      }
    }
    loadProject();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-950 flex flex-col md:flex-row transition-colors">
      
      {/* 1. Desktop Left Sidebar */}
      <Sidebar 
        projectId={1}
        onOpenCreateRoom={() => setIsCreateOpen(true)}
        onOpenJoinRoom={() => setIsJoinOpen(true)}
        onSimulatePush={() => {}}
      />

      {/* 2. Mobile Top Bar */}
      <MobileTopBar 
        projectName={project ? project.name : 'GitFlow'}
        onOpenRoomsModal={() => setIsCreateOpen(true)}
        onOpenJoinModal={() => setIsJoinOpen(true)}
        onOpenCreateModal={() => setIsCreateOpen(true)}
      />

      {/* 3. Main Dashboard Overview */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-8 overflow-y-auto">
        
        {/* Project Header Banner */}
        <div className="p-6 lg:p-8 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900/60 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-500/10 via-brand-violet/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-brand-cyan font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  Ecosistema Conectado
                </span>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-bold">
                  Sala Principal: #{project?.id || 1}
                </span>
              </div>
              
              <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {project ? project.name : 'GitFlow Ecosystem'}
              </h1>
              
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {project ? project.description : 'Plataforma de gestión ágil, telemetría de código en tiempo real y salas con códigos dinámicos.'}
              </p>

              {/* GitHub Repo Link & Status */}
              <div className="pt-2 flex items-center gap-3 flex-wrap">
                <a
                  href={`https://github.com/${project ? project.github_repo : 'edwin-esquivel-ADSO/GitFlow'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-dark-950 border border-slate-200 dark:border-slate-700/80 text-xs font-mono text-slate-800 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-brand-cyan transition-all"
                >
                  <Github className="w-4 h-4 text-slate-900 dark:text-white" />
                  <span>{project ? project.github_repo : 'edwin-esquivel-ADSO/GitFlow'}</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>

                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Webhooks & Sockets Activos
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap lg:flex-col gap-3 shrink-0">
              <Link
                to="/projects/1?tab=kanban"
                className="flex items-center justify-between gap-3 px-5 py-3 rounded-2xl bg-brand-cyan text-dark-950 font-bold text-xs hover:bg-cyan-300 transition-all shadow-md shadow-brand-cyan/20"
              >
                <span>Ir al Tablero Ágil</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Real-time KPI & Contributions Dashboard */}
        <section className="space-y-4">
          <ContributionDashboard projectId={1} />
        </section>

        {/* Bottom Section: Activity Feed & Context Teaser */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ActivityFeed projectId={1} />
          </div>

          {/* Quick Context Card */}
          <div className="p-6 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900/60 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-purple-600 dark:text-brand-violet mb-3">
                <FileText className="w-5 h-5" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Contexto de la Sala</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                El equipo cuenta con un documento de arquitectura y requerimientos editable en vivo sincronizado mediante WebSockets.
              </p>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-950/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-mono line-clamp-4">
                {project ? project.context_markdown : 'Cargando contexto...'}
              </div>
            </div>

            <Link
              to="/projects/1?tab=documents"
              className="mt-6 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-purple-700 dark:text-brand-violet text-xs font-bold border border-purple-300 dark:border-brand-violet/30 transition-all"
            >
              <span>Ver Archivos & Editor en Vivo</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </main>

      {/* 4. Mobile Bottom Navigation */}
      <MobileBottomNav projectId={1} onSimulatePush={() => {}} />

      {/* Modals */}
      <CreateRoomModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={() => {}} />
      <JoinRoomModal isOpen={isJoinOpen} onClose={() => setIsJoinOpen(false)} onJoined={() => {}} />

    </div>
  );
}
