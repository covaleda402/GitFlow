import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ContributionDashboard from '../components/ContributionDashboard';
import ActivityFeed from '../components/ActivityFeed';
import { 
  GitBranch, 
  ExternalLink, 
  Layers, 
  FileText, 
  Radio, 
  ChevronRight, 
  Sparkles,
  Github
} from 'lucide-react';

export default function DashboardView() {
  const [project, setProject] = useState(null);

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
    <div className="min-h-screen bg-dark-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 space-y-8">
        
        {/* Project Header Banner */}
        <div className="p-6 lg:p-8 rounded-3xl glass-panel border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-brand-cyan/15 via-brand-violet/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  Ecosistema Conectado
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  ID: #1
                </span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                {project ? project.name : 'GitFlow Ecosystem'}
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                {project ? project.description : 'Plataforma de gestión ágil y telemetría de código en tiempo real.'}
              </p>

              {/* GitHub Repo Pill */}
              <div className="pt-2 flex items-center gap-3">
                <a
                  href={`https://github.com/${project ? project.github_repo : 'edwin-esquivel-ADSO/GitFlow'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-dark-900 border border-slate-700/80 text-xs font-mono text-slate-300 hover:text-brand-cyan hover:border-brand-cyan/40 transition-all"
                >
                  <Github className="w-4 h-4 text-white" />
                  <span>{project ? project.github_repo : 'edwin-esquivel-ADSO/GitFlow'}</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>

                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Webhooks Activos
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap lg:flex-col gap-3 shrink-0">
              <Link
                to="/projects/1"
                className="flex items-center justify-between gap-3 px-5 py-3 rounded-2xl bg-brand-cyan text-dark-950 font-bold text-xs hover:bg-cyan-300 transition-all shadow-lg shadow-brand-cyan/20"
              >
                <span>Abrir Espacio de Trabajo</span>
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
          <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-brand-violet mb-3">
                <FileText className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">Contexto del Proyecto</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                El equipo cuenta con un documento de arquitectura y requerimientos editable en vivo sincronizado mediante WebSockets.
              </p>
              <div className="p-3 rounded-xl bg-dark-900/60 border border-slate-800 text-xs text-slate-300 font-mono line-clamp-4">
                {project ? project.context_markdown : 'Cargando contexto...'}
              </div>
            </div>

            <Link
              to="/projects/1?tab=context"
              className="mt-6 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-violet text-xs font-semibold border border-brand-violet/30 transition-all"
            >
              <span>Editar Contexto en Vivo</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}
