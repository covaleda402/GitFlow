import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import DynamicSecurityCode from './DynamicSecurityCode';
import { 
  GitBranch, 
  Layers, 
  FileText, 
  Radio, 
  Archive, 
  User, 
  Sun, 
  Moon, 
  LogOut, 
  Plus, 
  Users, 
  BarChart3, 
  KeyRound, 
  ChevronDown 
} from 'lucide-react';

export default function Sidebar({ projectId = 1, onOpenCreateRoom, onOpenJoinRoom, onSimulatePush }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch('/api/projects');
        const data = await res.json();
        if (data.success) {
          setProjects(data.projects);
        }
      } catch (err) {
        console.error('Error fetching rooms in sidebar:', err);
      }
    }
    loadProjects();
  }, [projectId]);

  const currentProject = projects.find(p => p.id === Number(projectId)) || { name: 'GitFlow Ecosystem' };

  const currentTab = new URLSearchParams(location.search).get('tab') || 'kanban';

  const navItems = [
    { label: 'Tablero Ágil', tab: 'kanban', path: `/projects/${projectId}?tab=kanban`, icon: Layers },
    { label: 'Documentos & Contexto', tab: 'documents', path: `/projects/${projectId}?tab=documents`, icon: FileText },
    { label: 'Historial Terminado', tab: 'history', path: `/projects/${projectId}?tab=history`, icon: Archive },
    { label: 'Telemetría de Commits', tab: 'telemetry', path: `/projects/${projectId}?tab=telemetry`, icon: Radio },
    { label: 'Analítica de Sala', tab: 'analytics', path: `/projects/${projectId}?tab=analytics`, icon: BarChart3 },
    { label: 'Mi Perfil', tab: 'profile', path: '/profile', icon: User }
  ];

  return (
    <aside className="hidden md:flex flex-col w-72 h-screen sticky top-0 bg-white/80 dark:bg-dark-950/90 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800/80 p-4 shrink-0 overflow-y-auto">
      
      {/* Brand Header & Theme Switcher */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-cyan to-brand-violet flex items-center justify-center shadow-lg shadow-brand-cyan/20 group-hover:scale-105 transition-all">
            <GitBranch className="w-5 h-5 text-dark-950" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              GitFlow <span className="text-[10px] font-mono text-brand-cyan bg-brand-cyan/10 px-1.5 py-0.5 rounded border border-brand-cyan/30">v2.0</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-mono">Agile & Live Telemetry</p>
          </div>
        </Link>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-brand-cyan transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
          title={`Cambiar a modo ${isDark ? 'Claro' : 'Oscuro'}`}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
        </button>
      </div>

      {/* Room / Sala Selector Dropdown */}
      <div className="my-4 relative">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5 px-1">
          <span>SALA ACTIVA</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={onOpenJoinRoom}
              className="text-[10px] text-brand-cyan hover:underline"
              title="Unirse a otra sala mediante código"
            >
              Unirse
            </button>
            <span>•</span>
            <button 
              onClick={onOpenCreateRoom}
              className="text-[10px] text-emerald-500 hover:underline"
              title="Crear nueva sala"
            >
              + Nueva
            </button>
          </div>
        </div>

        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white text-xs font-semibold text-left hover:border-brand-cyan/40 transition-all shadow-sm"
        >
          <span className="truncate pr-2">{currentProject.name}</span>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </button>

        {/* Dropdown Options */}
        {dropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 z-30 p-1.5 rounded-xl glass-panel border border-slate-300 dark:border-slate-700 shadow-xl space-y-1">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  setDropdownOpen(false);
                  navigate(`/projects/${p.id}`);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-xs text-left transition-colors ${
                  p.id === Number(projectId)
                    ? 'bg-brand-cyan/15 text-brand-cyan font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="truncate">{p.name}</span>
                <span className="text-[10px] font-mono text-slate-400">#{p.id}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dynamic 5-minute security code widget */}
      <div className="mb-4">
        <DynamicSecurityCode projectId={projectId} />
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1">
        <div className="px-1 mb-2 text-[10px] font-mono uppercase tracking-wider text-slate-400">
          Apartados del Proyecto
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith('/profile') 
            ? item.tab === 'profile'
            : currentTab === item.tab && item.tab !== 'profile';

          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-brand-cyan/15 to-transparent text-brand-cyan border-l-4 border-l-brand-cyan font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Quick Simulate Push Button */}
      <div className="my-3">
        <button
          onClick={onSimulatePush}
          className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-dark-900 hover:bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>Simular Push de Git</span>
        </button>
      </div>

      {/* User Footer Profile & Logout */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <Link to="/profile" className="flex items-center gap-2.5 group overflow-hidden">
          <img
            src={user?.custom_avatar || user?.avatar_url || 'https://avatars.githubusercontent.com/u/10101?v=4'}
            alt={user?.username || 'user'}
            className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700 object-cover shrink-0"
          />
          <div className="truncate">
            <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-brand-cyan">
              {user?.name || user?.username || 'Edwin Esquivel'}
            </span>
            <span className="block text-[10px] text-slate-400 font-mono truncate">
              @{user?.username || 'edwin-esquivel'}
            </span>
          </div>
        </Link>

        <button
          onClick={logout}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
          title="Cerrar Sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

    </aside>
  );
}
