import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { GitBranch, Sun, Moon, KeyRound, Users } from 'lucide-react';

export default function MobileTopBar({ projectName = 'GitFlow', onOpenRoomsModal, onOpenJoinModal }) {
  const { toggleTheme, isDark } = useTheme();

  return (
    <header className="md:hidden sticky top-0 z-40 bg-white/90 dark:bg-dark-950/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
      
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-cyan to-brand-violet flex items-center justify-center">
          <GitBranch className="w-4 h-4 text-dark-950" />
        </div>
        <button
          onClick={onOpenRoomsModal}
          className="text-left"
        >
          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
            {projectName}
          </span>
          <span className="text-[10px] text-brand-cyan block font-mono">Cambiar Sala ▾</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenJoinModal}
          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-brand-cyan border border-brand-cyan/30 text-[11px] font-mono flex items-center gap-1"
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Código</span>
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
        </button>
      </div>

    </header>
  );
}
