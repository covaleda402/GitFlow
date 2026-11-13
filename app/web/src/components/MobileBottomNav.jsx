import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layers, FileText, Radio, Archive, User, PlusCircle } from 'lucide-react';

export default function MobileBottomNav({ projectId = 1, onSimulatePush }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'kanban';

  const isProfileActive = location.pathname.startsWith('/profile');

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-dark-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800/90 px-3 py-2 flex items-center justify-around shadow-2xl safe-area-pb">
      
      {/* 1. Tablero */}
      <Link
        to={`/projects/${projectId}?tab=kanban`}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
          !isProfileActive && currentTab === 'kanban'
            ? 'text-brand-cyan scale-105'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <Layers className="w-5 h-5" />
        <span className="text-[10px] font-semibold tracking-tight">Tablero</span>
      </Link>

      {/* 2. Documentos */}
      <Link
        to={`/projects/${projectId}?tab=documents`}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
          !isProfileActive && currentTab === 'documents'
            ? 'text-brand-cyan scale-105'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <FileText className="w-5 h-5" />
        <span className="text-[10px] font-semibold tracking-tight">Contexto</span>
      </Link>

      {/* 3. Center Glowing Action: Simular Push */}
      <button
        onClick={onSimulatePush}
        className="flex flex-col items-center -mt-5 group"
        title="Simular Push de Git"
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-cyan to-brand-violet p-0.5 shadow-lg shadow-brand-cyan/30 group-active:scale-95 transition-transform flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center">
            <Radio className="w-5 h-5 text-brand-cyan animate-pulse" />
          </div>
        </div>
        <span className="text-[9px] font-mono text-brand-cyan mt-1 font-bold">Push</span>
      </button>

      {/* 4. Historial */}
      <Link
        to={`/projects/${projectId}?tab=history`}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
          !isProfileActive && currentTab === 'history'
            ? 'text-brand-cyan scale-105'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <Archive className="w-5 h-5" />
        <span className="text-[10px] font-semibold tracking-tight">Historial</span>
      </Link>

      {/* 5. Perfil */}
      <Link
        to="/profile"
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
          isProfileActive
            ? 'text-brand-cyan scale-105'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <User className="w-5 h-5" />
        <span className="text-[10px] font-semibold tracking-tight">Perfil</span>
      </Link>

    </nav>
  );
}
