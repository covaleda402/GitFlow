import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, Layers, FileText, Archive, User, ShieldCheck } from 'lucide-react';

export default function MobileBottomNav({ projectId = 1, onSimulatePush }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'kanban';

  const isDashboardActive = location.pathname === '/dashboard';
  const isProfileActive = location.pathname.startsWith('/profile');
  const isProjectActive = location.pathname.startsWith('/projects');

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-dark-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800/90 px-1 sm:px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-pb">
      
      {/* 1. Salas / Panel General (Hub) */}
      <Link
        to="/dashboard"
        className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-all min-w-0 ${
          isDashboardActive
            ? 'text-cyan-600 dark:text-brand-cyan font-bold scale-105'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
        title="Panel General de Salas"
      >
        <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
        <span className="text-[9px] sm:text-[10px] font-semibold tracking-tight truncate">Salas</span>
      </Link>

      {/* 2. Tablero Ágil */}
      <Link
        to={`/projects/${projectId}?tab=kanban`}
        className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-all min-w-0 ${
          isProjectActive && currentTab === 'kanban'
            ? 'text-cyan-600 dark:text-brand-cyan font-bold scale-105'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
        title="Tablero Ágil"
      >
        <Layers className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
        <span className="text-[9px] sm:text-[10px] font-semibold tracking-tight truncate">Tablero</span>
      </Link>

      {/* 3. Revisión Previa (QA) */}
      <Link
        to={`/projects/${projectId}?tab=review`}
        className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-all min-w-0 ${
          isProjectActive && currentTab === 'review'
            ? 'text-amber-600 dark:text-amber-400 font-bold scale-105'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
        title="Revisión Previa QA"
      >
        <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
        <span className="text-[9px] sm:text-[10px] font-semibold tracking-tight truncate">QA / Rev</span>
      </Link>

      {/* 4. Documentos / Contexto */}
      <Link
        to={`/projects/${projectId}?tab=documents`}
        className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-all min-w-0 ${
          isProjectActive && currentTab === 'documents'
            ? 'text-cyan-600 dark:text-brand-cyan font-bold scale-105'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
        title="Documentos y Contexto"
      >
        <FileText className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
        <span className="text-[9px] sm:text-[10px] font-semibold tracking-tight truncate">Contexto</span>
      </Link>

      {/* 5. Historial Terminado */}
      <Link
        to={`/projects/${projectId}?tab=history`}
        className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-all min-w-0 ${
          isProjectActive && currentTab === 'history'
            ? 'text-cyan-600 dark:text-brand-cyan font-bold scale-105'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
        title="Historial de Tareas Terminadas"
      >
        <Archive className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
        <span className="text-[9px] sm:text-[10px] font-semibold tracking-tight truncate">Historial</span>
      </Link>

      {/* 6. Perfil */}
      <Link
        to="/profile"
        className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-all min-w-0 ${
          isProfileActive
            ? 'text-cyan-600 dark:text-brand-cyan font-bold scale-105'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
        title="Mi Perfil"
      >
        <User className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
        <span className="text-[9px] sm:text-[10px] font-semibold tracking-tight truncate">Perfil</span>
      </Link>

    </nav>
  );
}
