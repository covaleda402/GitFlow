import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layers, FileText, Radio, Archive, User, ShieldCheck } from 'lucide-react';

export default function MobileBottomNav({ projectId = 1, onSimulatePush }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'kanban';

  const isProfileActive = location.pathname.startsWith('/profile');

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-dark-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800/90 px-1.5 sm:px-3 py-1.5 sm:py-2 flex items-center justify-around shadow-2xl safe-area-pb">
      
      {/* 1. Tablero */}
      <Link
        to={`/projects/${projectId}?tab=kanban`}
        className={`flex flex-col items-center gap-0.5 sm:gap-1 py-1 px-1.5 sm:px-2 rounded-xl transition-all min-w-0 ${
          !isProfileActive && currentTab === 'kanban'
            ? 'text-cyan-600 dark:text-brand-cyan font-bold scale-105'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <Layers className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
        <span className="text-[9px] sm:text-[10px] font-semibold tracking-tight truncate">Tablero</span>
      </Link>

      {/* 2. Revisión Previa (QA) */}
      <Link
        to={`/projects/${projectId}?tab=review`}
        className={`flex flex-col items-center gap-0.5 sm:gap-1 py-1 px-1.5 sm:px-2 rounded-xl transition-all min-w-0 ${
          !isProfileActive && currentTab === 'review'
            ? 'text-amber-600 dark:text-amber-400 font-bold scale-105'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
        <span className="text-[9px] sm:text-[10px] font-semibold tracking-tight truncate">QA / Rev</span>
      </Link>

      {/* 3. Center Glowing Action: Simular Push */}
      <button
        onClick={onSimulatePush}
        className="flex flex-col items-center -mt-4 sm:-mt-5 group shrink-0 px-1"
        title="Simular Push de Git"
      >
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-brand-cyan to-brand-violet p-0.5 shadow-lg shadow-brand-cyan/30 group-active:scale-95 transition-transform flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center">
            <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-brand-cyan animate-pulse" />
          </div>
        </div>
        <span className="text-[8px] sm:text-[9px] font-mono text-cyan-600 dark:text-brand-cyan mt-0.5 font-bold">Push</span>
      </button>

      {/* 4. Historial */}
      <Link
        to={`/projects/${projectId}?tab=history`}
        className={`flex flex-col items-center gap-0.5 sm:gap-1 py-1 px-1.5 sm:px-2 rounded-xl transition-all min-w-0 ${
          !isProfileActive && currentTab === 'history'
            ? 'text-cyan-600 dark:text-brand-cyan font-bold scale-105'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <Archive className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
        <span className="text-[9px] sm:text-[10px] font-semibold tracking-tight truncate">Historial</span>
      </Link>

      {/* 5. Documentos / Contexto */}
      <Link
        to={`/projects/${projectId}?tab=documents`}
        className={`flex flex-col items-center gap-0.5 sm:gap-1 py-1 px-1.5 sm:px-2 rounded-xl transition-all min-w-0 ${
          !isProfileActive && currentTab === 'documents'
            ? 'text-cyan-600 dark:text-brand-cyan font-bold scale-105'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <FileText className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
        <span className="text-[9px] sm:text-[10px] font-semibold tracking-tight truncate">Contexto</span>
      </Link>

      {/* 6. Perfil */}
      <Link
        to="/profile"
        className={`flex flex-col items-center gap-0.5 sm:gap-1 py-1 px-1.5 sm:px-2 rounded-xl transition-all min-w-0 ${
          isProfileActive
            ? 'text-cyan-600 dark:text-brand-cyan font-bold scale-105'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <User className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
        <span className="text-[9px] sm:text-[10px] font-semibold tracking-tight truncate">Perfil</span>
      </Link>

    </nav>
  );
}
