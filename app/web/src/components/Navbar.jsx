import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { 
  GitBranch, 
  Activity, 
  Layers, 
  LogOut, 
  Radio, 
  Send,
  User,
  Sun,
  Moon
} from 'lucide-react';

export default function Navbar({ onSimulateCommit }) {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const { theme, toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simMessage, setSimMessage] = useState('feat: vincular commits con telemetria en vivo #3');
  const [simAuthor, setSimAuthor] = useState(user ? user.username : 'edwin-esquivel');
  const [simTaskId, setSimTaskId] = useState(3);
  const [isSending, setIsSending] = useState(false);

  const handleSimulate = async (e) => {
    e.preventDefault();
    setIsSending(true);
    try {
      const res = await fetch('/api/webhook/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: simMessage,
          author: simAuthor,
          taskId: simTaskId
        })
      });
      if (res.ok) {
        setShowSimulateModal(false);
      }
    } catch (err) {
      console.error('Error simulating commit:', err);
    } finally {
      setIsSending(false);
    }
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: Activity },
    { name: 'Ecosistema', path: '/projects/1', icon: Layers },
    { name: 'Mi Perfil', path: '/profile', icon: User }
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-dark-950/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/80 px-4 lg:px-8 py-3 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-cyan to-brand-violet flex items-center justify-center shadow-lg shadow-brand-cyan/20 group-hover:shadow-brand-cyan/40 transition-all">
                <GitBranch className="w-5 h-5 text-dark-950 font-bold" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  GitFlow <span className="text-xs font-mono font-normal text-cyan-600 dark:text-brand-cyan px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">v2.0</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-wider uppercase">Live Telemetry</span>
              </div>
            </Link>

            {/* Nav items */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive 
                        ? 'bg-cyan-500/15 text-cyan-700 dark:text-brand-cyan border border-cyan-500/30 shadow-xs' 
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            
            {/* Live Socket Status Pill */}
            <div 
              title={isConnected ? 'Conectado al servidor WebSocket en tiempo real' : 'Reconectando con el servidor...'}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-mono border ${
                isConnected 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="hidden sm:inline font-bold">{isConnected ? 'LIVE TELEMETRY' : 'OFFLINE'}</span>
            </div>

            {/* Quick Simulate Commit button */}
            <button
              onClick={() => setShowSimulateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-brand-cyan border border-cyan-500/30 transition-all shadow-xs"
              title="Simular un commit entrante de GitHub para probar la telemetría"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span className="hidden sm:inline">Simular Push</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-brand-cyan transition-all border border-slate-200 dark:border-slate-700 shadow-xs"
              title={`Cambiar a modo ${isDark ? 'Claro' : 'Oscuro'}`}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>

            {/* User Profile or Login */}
            {user ? (
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
                <Link to="/profile" className="flex items-center gap-2 hover:opacity-85 transition-opacity">
                  <img
                    src={user.custom_avatar || user.avatar_url || 'https://avatars.githubusercontent.com/u/10101?v=4'}
                    alt={user.username}
                    className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700 object-cover"
                  />
                  <div className="hidden lg:flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{user.name || user.username}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">@{user.username}</span>
                  </div>
                </Link>
                <button
                  onClick={logout}
                  title="Cerrar Sesión"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-dark-950 transition-colors shadow-xs"
              >
                Conectar GitHub
              </Link>
            )}

          </div>

        </div>
      </header>

      {/* Commit Simulation Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl bg-white dark:bg-dark-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-cyan-600 dark:text-brand-cyan" />
                Simular Webhook de GitHub
              </h3>
              <button 
                onClick={() => setShowSimulateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              Dispara un evento push idéntico al webhook oficial de GitHub. El backend parseará el mensaje con RegEx para asociarlo a una tarea y emitirá la telemetría por WebSockets.
            </p>

            <form onSubmit={handleSimulate} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-1">Mensaje de Commit (usa #ID para vincular):</label>
                <input
                  type="text"
                  value={simMessage}
                  onChange={(e) => setSimMessage(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                  placeholder="feat: mi cambio #3 o fixes #2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-1">Autor GitHub:</label>
                  <input
                    type="text"
                    value={simAuthor}
                    onChange={(e) => setSimAuthor(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-1">ID Tarea Destino:</label>
                  <input
                    type="number"
                    value={simTaskId}
                    onChange={(e) => setSimTaskId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-brand-cyan hover:bg-cyan-300 text-dark-950 shadow-md shadow-brand-cyan/20 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSending ? 'Transmitiendo...' : 'Disparar Push'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
