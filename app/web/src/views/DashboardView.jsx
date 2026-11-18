import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import CreateRoomModal from '../components/CreateRoomModal';
import JoinRoomModal from '../components/JoinRoomModal';
import { 
  GitBranch, 
  ExternalLink, 
  Layers, 
  Plus, 
  KeyRound, 
  Sparkles,
  Github,
  Users,
  Search,
  Eye,
  LogIn,
  LogOut,
  Sun,
  Moon,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Radio,
  RefreshCw,
  FolderGit2,
  Lock
} from 'lucide-react';

export default function DashboardView() {
  const { user, token, isAuthenticated, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [guestCode, setGuestCode] = useState('');
  const [guestError, setGuestError] = useState(null);
  const [guestJoining, setGuestJoining] = useState(false);

  const loadProjects = async () => {
    // OWASP A01: Unauthenticated visitors do not receive private rooms list
    if (!isAuthenticated || !token) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Error fetching rooms in lobby:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [isAuthenticated, token]);

  const handleGuestJoin = async (e) => {
    e.preventDefault();
    if (!guestCode.trim()) return;
    setGuestJoining(true);
    setGuestError(null);

    try {
      const res = await fetch('/api/projects/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: guestCode.trim().toUpperCase() })
      });
      const data = await res.json();
      if (res.ok && data.projectId) {
        navigate(`/projects/${data.projectId}`);
      } else {
        setGuestError(data.error || 'Código de sala inválido o expirado (rota cada 5 min).');
      }
    } catch (err) {
      setGuestError(err.message);
    } finally {
      setGuestJoining(false);
    }
  };

  const filteredProjects = projects.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term) ||
      p.github_repo?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-950 flex flex-col transition-colors selection:bg-brand-cyan/20 selection:text-brand-cyan">
      
      {/* 1. Standalone External Lobby Navbar */}
      <header className="sticky top-0 z-30 w-full bg-white/85 dark:bg-dark-900/85 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-cyan to-brand-violet flex items-center justify-center shadow-lg shadow-brand-cyan/20 group-hover:scale-105 transition-all">
              <GitBranch className="w-5 h-5 text-dark-950" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                GitFlow <span className="text-[10px] font-mono text-cyan-700 dark:text-brand-cyan bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/30 font-bold">Lobby</span>
              </span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono hidden sm:block">Portal Externo de Salas</p>
            </div>
          </Link>

          {/* Right Controls: Theme + Auth State */}
          <div className="flex items-center gap-3">
            {/* Theme Switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-brand-cyan transition-all border border-slate-200 dark:border-slate-700 shadow-xs"
              title={`Cambiar a modo ${isDark ? 'Claro' : 'Oscuro'}`}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>

            {/* Auth Profile or Login Button */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
                <Link to="/profile" className="flex items-center gap-2 group">
                  <img
                    src={user.custom_avatar || user.avatar_url || 'https://avatars.githubusercontent.com/u/10101?v=4'}
                    alt={user.username}
                    className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700 object-cover"
                  />
                  <div className="hidden sm:block text-left">
                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-brand-cyan leading-none">
                      {user.name || user.username}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      @{user.username}
                    </span>
                  </div>
                </Link>

                <button
                  onClick={logout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="py-1.5 px-3.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-slate-100 dark:hover:bg-white text-white dark:text-dark-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Iniciar Sesión</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 2. Main Lobby Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* UNAUTHENTICATED GUEST VIEW: Zero room exposure (OWASP A01 Privacy) */}
        {!isAuthenticated ? (
          <div className="max-w-2xl mx-auto my-6 p-6 sm:p-8 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900/80 shadow-2xl text-center space-y-6 animate-fade-in">
            
            <div className="w-16 h-16 mx-auto rounded-3xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-brand-cyan shadow-lg shadow-cyan-500/10">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-brand-cyan text-xs font-mono font-bold">
                <Lock className="w-3.5 h-3.5" />
                <span>Privacidad de Repositorios & Salas (OWASP A01)</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Acceso Protegido a Salas de Desarrollo
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                Por políticas de seguridad y privacidad del código, las salas no son públicas. No se muestran salas ni proyectos de otros usuarios sin iniciar sesión.
              </p>
            </div>

            {/* Action Cards: Login vs Join with Code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-left">
              
              {/* Option A: Login */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-dark-950/70 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                    <LogIn className="w-4 h-4 text-brand-cyan" />
                    <span>Acceder con tu Perfil</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                    Inicia sesión para visualizar y gestionar únicamente tus salas asignadas y creadas.
                  </p>
                </div>
                <Link
                  to="/login"
                  className="w-full py-2.5 px-4 rounded-xl bg-brand-cyan hover:bg-cyan-300 text-dark-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <span>Iniciar Sesión Ahora</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Option B: Join via Room Code */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-dark-950/70 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-cyan-600 dark:text-brand-cyan" />
                    <span>¿Tienes un Código de Sala?</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                    Ingresa el PIN temporal de 6 caracteres para unirte directamente a la sala invitada:
                  </p>
                </div>

                <form onSubmit={handleGuestJoin} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={guestCode}
                      onChange={(e) => setGuestCode(e.target.value.toUpperCase())}
                      placeholder="CÓDIGO (6 CAR)"
                      className="flex-1 px-3 py-2 text-xs font-mono font-bold tracking-widest text-center uppercase rounded-xl bg-white dark:bg-dark-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="submit"
                      disabled={guestJoining || !guestCode.trim()}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white dark:text-brand-cyan font-bold text-xs hover:bg-slate-800 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                    >
                      {guestJoining ? '...' : 'Entrar'}
                    </button>
                  </div>
                  {guestError && (
                    <p className="text-[10px] text-rose-500 font-mono text-center">{guestError}</p>
                  )}
                </form>
              </div>

            </div>

          </div>
        ) : (
          /* AUTHENTICATED USER VIEW: Displays only the user's assigned/created rooms */
          <>
            {/* Header Banner */}
            <div className="p-6 sm:p-8 lg:p-10 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900/60 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-500/15 via-brand-violet/15 to-transparent rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-brand-cyan font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Mis Salas Asignadas
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-bold">
                      {projects.length} {projects.length === 1 ? 'Sala Vinculada' : 'Salas Vinculadas'}
                    </span>
                  </div>
                  
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Tus Salas de Desarrollo
                  </h1>
                  
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Accede a tus salas colaborativas para gestionar el tablero Kanban, la revisión QA, los documentos y el motor de rollback en tiempo real.
                  </p>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="py-3 px-5 rounded-2xl bg-brand-cyan hover:bg-cyan-300 text-dark-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-brand-cyan/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear Nueva Sala</span>
                  </button>

                  <button
                    onClick={() => setIsJoinOpen(true)}
                    className="py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <KeyRound className="w-4 h-4 text-cyan-600 dark:text-brand-cyan" />
                    <span>Unirse por Código (5 min)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar en tus salas..."
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 font-sans shadow-xs"
                />
              </div>

              <button
                onClick={loadProjects}
                className="self-end sm:self-auto py-2 px-3.5 rounded-xl bg-white dark:bg-dark-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 transition-all shadow-xs"
                title="Refrescar catálogo"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </button>
            </div>

            {/* Authenticated Rooms Grid */}
            {loading ? (
              <div className="p-16 text-center text-xs font-mono text-slate-500 animate-pulse">
                Cargando tus salas...
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-dark-900/30 space-y-3">
                <FolderGit2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">No tienes salas asignadas</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Crea tu primera sala o pídele al creador de una sala que te comparta su código dinámico de 5 minutos.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="py-2 px-4 rounded-xl bg-brand-cyan hover:bg-cyan-300 text-dark-950 font-bold text-xs"
                  >
                    Crear Sala
                  </button>
                  <button
                    onClick={() => setIsJoinOpen(true)}
                    className="py-2 px-4 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs"
                  >
                    Unirse con Código
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((p) => {
                  const isSuspended = p.status === 'SUSPENDED';
                  return (
                    <div 
                      key={p.id}
                      className="p-6 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900/70 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/5 transition-all flex flex-col justify-between group relative overflow-hidden"
                    >
                      <div className="space-y-4">
                        {/* Top Status & ID Bar */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-dark-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                            Sala #{p.id}
                          </span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                            isSuspended
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400'
                              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                          }`}>
                            {isSuspended ? '⏸ SUSPENDIDA' : '● ACTIVA'}
                          </span>
                        </div>

                        {/* Room Name & Description */}
                        <div>
                          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-brand-cyan transition-colors">
                            {p.name}
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                            {p.description || 'Sala de desarrollo colaborativo y telemetría de código.'}
                          </p>
                        </div>

                        {/* GitHub Repo Tag */}
                        <div>
                          <a
                            href={`https://github.com/${p.github_repo}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-dark-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-800 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-brand-cyan transition-all"
                            title="Ver repositorio en GitHub"
                          >
                            <Github className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
                            <span className="truncate max-w-[210px]">{p.github_repo}</span>
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </a>
                        </div>

                        {/* Stats Metrics */}
                        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-center font-mono">
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-dark-950/60 border border-slate-100 dark:border-slate-800/60">
                            <span className="block text-sm font-bold text-slate-900 dark:text-white">{p.total_tasks || 0}</span>
                            <span className="text-[10px] text-slate-500">Tareas</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-dark-950/60 border border-slate-100 dark:border-slate-800/60">
                            <span className="block text-sm font-bold text-slate-900 dark:text-white">{p.total_commits || 0}</span>
                            <span className="text-[10px] text-slate-500">Commits</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-dark-950/60 border border-slate-100 dark:border-slate-800/60">
                            <span className="block text-sm font-bold text-slate-900 dark:text-white">{p.total_members || 1}</span>
                            <span className="text-[10px] text-slate-500">Miembros</span>
                          </div>
                        </div>
                      </div>

                      {/* Primary CTA Button: Entrar a la Sala */}
                      <div className="mt-5 pt-3">
                        <Link
                          to={`/projects/${p.id}`}
                          className="w-full py-2.5 px-4 rounded-xl bg-brand-cyan hover:bg-cyan-300 text-dark-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm group-hover:shadow-md group-hover:shadow-brand-cyan/20"
                        >
                          <Layers className="w-4 h-4" />
                          <span>Entrar a la Sala</span>
                          <ChevronRight className="w-4 h-4 ml-auto" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

      </main>

      {/* Modals */}
      <CreateRoomModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        onCreated={(newRoom) => {
          loadProjects();
          if (newRoom?.id) navigate(`/projects/${newRoom.id}`);
        }} 
      />
      <JoinRoomModal 
        isOpen={isJoinOpen} 
        onClose={() => setIsJoinOpen(false)} 
        onJoined={(joinedId) => {
          navigate(`/projects/${joinedId}`);
        }} 
      />

    </div>
  );
}
