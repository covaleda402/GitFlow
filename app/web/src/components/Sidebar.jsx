import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
  Bot,
  ShieldCheck
} from 'lucide-react';

export default function Sidebar({ projectId = 1, onOpenCreateRoom, onOpenJoinRoom, onSimulatePush, onOpenChatbot }) {
  const { user, token, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    async function loadProjects() {
      try {
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/projects', { headers });
        const data = await res.json();
        if (data.success && Array.isArray(data.projects)) {
          setProjects(data.projects);
        }
      } catch (err) {
        console.error('Error fetching rooms in sidebar:', err);
      }
    }
    loadProjects();
  }, [projectId, token]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasProjects = projects.length > 0;
  const matchedProject = projects.find(p => p.id === Number(projectId));
  const activeProjectId = matchedProject ? matchedProject.id : (hasProjects ? projects[0].id : null);
  const currentProject = matchedProject || (hasProjects ? projects[0] : { name: 'Sin salas asignadas' });
  const currentTab = new URLSearchParams(location.search).get('tab') || 'kanban';

  const roomPath = (tab) => activeProjectId ? `/projects/${activeProjectId}?tab=${tab}` : '/dashboard';

  const cleanRepoDisplay = (repoStr) => {
    if (!repoStr) return 'edwin-esquivel-ADSO/GitFlow';
    const first = repoStr.split(',')[0].trim();
    return first
      .replace(/^https?:\/\/github\.com\//i, '')
      .replace(/^git@github\.com:/i, '')
      .replace(/\.git$/i, '')
      .replace(/^\/+|\/+$/g, '');
  };

  const navItems = [
    { label: 'Panel General (Hub)', tab: 'dashboard', path: '/dashboard', icon: GitBranch },
    { label: 'Tablero Ágil', tab: 'kanban', path: roomPath('kanban'), icon: Layers },
    { label: 'Revisión Previa (QA)', tab: 'review', path: roomPath('review'), icon: ShieldCheck },
    { label: 'Documentos & Contexto', tab: 'documents', path: roomPath('documents'), icon: FileText },
    { label: 'Historial Terminado', tab: 'history', path: roomPath('history'), icon: Archive },
    { label: 'Telemetría y Respaldo', tab: 'telemetry', path: roomPath('telemetry'), icon: Radio },
    { label: 'Analítica de Sala', tab: 'analytics', path: roomPath('analytics'), icon: BarChart3 },
    { label: 'Mi Perfil', tab: 'profile', path: '/profile', icon: User }
  ];

  return (
    <aside className="hidden md:flex flex-col w-72 h-screen sticky top-0 bg-white/90 dark:bg-dark-950/90 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800/80 p-4 shrink-0 overflow-y-auto shadow-sm">
      
      {/* Brand Header & Theme Switcher */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-cyan to-brand-violet flex items-center justify-center shadow-lg shadow-brand-cyan/20 group-hover:scale-105 transition-all">
            <GitBranch className="w-5 h-5 text-dark-950" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              GitFlow
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Agile & Live Telemetry</p>
          </div>
        </Link>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-brand-cyan transition-all border border-slate-200 dark:border-slate-700 shadow-xs"
          title={`Cambiar a modo ${isDark ? 'Claro' : 'Oscuro'}`}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
        </button>
      </div>

      {/* Room Selector with Prominent "+ Nueva Sala" and "Unirse" buttons */}
      <div ref={dropdownRef} className="my-4 relative space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 px-1">
          <span className="font-bold flex items-center gap-1.5">
            <span>SALA ACTIVA</span>
            {projects.length > 1 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-brand-cyan font-bold">
                {projects.length}
              </span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button 
              onClick={onOpenJoinRoom}
              className="text-[11px] font-bold text-cyan-600 dark:text-brand-cyan hover:underline flex items-center gap-1"
              title="Unirse a otra sala mediante código dinámico"
            >
              <KeyRound className="w-3 h-3" />
              <span>Unirse</span>
            </button>
            <span>•</span>
            <button 
              onClick={onOpenCreateRoom}
              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20"
              title="Crear nueva sala de proyecto"
            >
              <Plus className="w-3 h-3" />
              <span>Nueva</span>
            </button>
          </div>
        </div>

        {/* Selector Dropdown trigger */}
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold text-left transition-all shadow-xs ${
            dropdownOpen
              ? 'bg-cyan-500/10 border-brand-cyan/60 text-cyan-700 dark:text-brand-cyan'
              : 'bg-slate-50 dark:bg-dark-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white hover:border-brand-cyan/40'
          }`}
          title="Haz clic para desplegar y cambiar a otra sala"
        >
          <div className="truncate pr-2">
            <span className="font-bold block truncate">{currentProject.name}</span>
            <span className="text-[10px] text-slate-400 font-mono block truncate">
              {cleanRepoDisplay(currentProject.github_repo)}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${dropdownOpen ? 'rotate-180 text-brand-cyan' : ''}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 z-30 p-2 rounded-2xl glass-panel border border-slate-300 dark:border-slate-700 shadow-2xl space-y-1 bg-white dark:bg-dark-900 max-h-72 overflow-y-auto animate-scale-up">
            <div className="px-2 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1 mb-1">
              <span>Tus Salas Disponibles ({projects.length})</span>
            </div>

            {projects.map(p => {
              const isSelected = p.id === Number(projectId);
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate(`/projects/${p.id}`);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs text-left transition-all ${
                    isSelected
                      ? 'bg-cyan-500/15 text-cyan-800 dark:text-brand-cyan font-bold border border-cyan-500/30 shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="flex items-center gap-1.5">
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan shrink-0" />}
                      <span className="truncate">{p.name}</span>
                    </div>
                    {p.github_repo && (
                      <span className="text-[10px] text-slate-400 font-mono block truncate">
                        {cleanRepoDisplay(p.github_repo)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {projects.length === 0 && (
              <div className="p-3 text-center text-xs text-slate-400 font-mono">
                No hay más salas disponibles.
              </div>
            )}

            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenCreateRoom?.();
                }}
                className="w-full py-1.5 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold font-mono text-center flex items-center justify-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear Otra Sala</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic 5-minute security code widget (only rendered if user has an active room) */}
      {activeProjectId && (
        <div className="mb-4">
          <DynamicSecurityCode projectId={activeProjectId} />
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1">
        <div className="px-1 mb-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
          Apartados del Proyecto
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith('/profile') 
            ? item.tab === 'profile'
            : location.pathname === '/dashboard'
              ? item.tab === 'dashboard'
              : currentTab === item.tab && item.tab !== 'profile' && item.tab !== 'dashboard';

          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-700 dark:text-brand-cyan border-l-4 border-l-brand-cyan font-bold shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Quick Simulate Push Button */}
      <div className="my-3">
        <button
          onClick={onSimulatePush}
          className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-dark-900 hover:bg-cyan-500/15 text-cyan-700 dark:text-brand-cyan border border-cyan-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
        >
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>Simular Push de Git</span>
        </button>
      </div>

      {/* User Footer Profile & Logout */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        {user ? (
          <>
            <Link to="/profile" className="flex items-center gap-2.5 group overflow-hidden">
              <img
                src={user?.custom_avatar || user?.avatar_url || 'https://avatars.githubusercontent.com/u/10101?v=4'}
                alt={user?.username || 'user'}
                className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700 object-cover shrink-0"
              />
              <div className="truncate">
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-cyan-600 dark:group-hover:text-brand-cyan flex items-center gap-1">
                  <span>{user?.name || user?.username}</span>
                  {(currentProject?.owner_id === user?.id || currentProject?.owner_username === user?.username) && (
                    <span title="Líder de la Sala" className="text-amber-500 text-xs">👑</span>
                  )}
                </span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                  @{user?.username}
                </span>
              </div>
            </Link>

            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
              title="Cerrar Sesión y salir"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="w-full py-2 px-3 rounded-xl bg-brand-cyan/15 hover:bg-brand-cyan/25 border border-brand-cyan/30 text-cyan-700 dark:text-brand-cyan text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            <User className="w-4 h-4" />
            <span>Iniciar Sesión</span>
          </Link>
        )}
      </div>

    </aside>
  );
}
