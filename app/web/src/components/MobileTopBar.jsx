import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { GitBranch, Sun, Moon, KeyRound, Plus, LayoutGrid } from 'lucide-react';

export default function MobileTopBar({ projectName = 'GitFlow', onOpenRoomsModal, onOpenJoinModal, onOpenCreateModal }) {
  const { toggleTheme, isDark } = useTheme();

  return (
    <header className="md:hidden sticky top-0 z-40 bg-white/95 dark:bg-dark-950/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-between shadow-xs">
      
      {/* Brand & Room selector */}
      <div className="flex items-center gap-2">
        <Link 
          to="/dashboard"
          className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-cyan to-brand-violet flex items-center justify-center shrink-0 shadow-sm"
          title="Ir al Panel General de Salas"
        >
          <GitBranch className="w-4 h-4 text-dark-950" />
        </Link>
        
        <button
          onClick={onOpenRoomsModal}
          className="text-left max-w-[120px] sm:max-w-[160px]"
          title="Cambiar de sala"
        >
          <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
            {projectName}
          </span>
          <span className="text-[10px] text-cyan-600 dark:text-brand-cyan block font-mono font-bold">
            Cambiar Sala ▾
          </span>
        </button>
      </div>

      {/* Action buttons on the same line */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Link
          to="/dashboard"
          className="p-1.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-bold flex items-center gap-1"
          title="Ver todas las salas"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-cyan-600 dark:text-brand-cyan" />
          <span className="hidden xs:inline">Salas</span>
        </Link>

        <button
          onClick={onOpenCreateModal}
          className="p-1.5 px-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-bold flex items-center gap-1"
          title="Crear nueva sala"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nueva</span>
        </button>

        <button
          onClick={onOpenJoinModal}
          className="p-1.5 px-2 rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-brand-cyan border border-cyan-500/30 text-[11px] font-mono font-bold flex items-center gap-1"
          title="Unirse a sala con código"
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Código</span>
        </button>

        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
          title="Cambiar tema"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
        </button>
      </div>

    </header>
  );
}
