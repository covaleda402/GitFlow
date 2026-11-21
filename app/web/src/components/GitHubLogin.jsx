import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Github, ShieldCheck, Zap, ArrowRight, UserCheck, Eye, Info, Mail, Lock, X, ShieldAlert } from 'lucide-react';

export default function GitHubLogin() {
  const { loginWithGitHub, loginDemo, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeTab, setActiveTab] = useState('verification'); // 'verification' | 'oauth'
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState(null);
  const [infoNotice, setInfoNotice] = useState(null);

  // Read URL query params on mount/update
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('logged_out') === 'true') {
      setInfoNotice('Sesión cerrada con éxito. Puedes verificar un nuevo usuario o ingresar con otra cuenta de GitHub.');
    }
    if (params.get('notice') === 'github_oauth_unconfigured') {
      setInfoNotice('Para OAuth directo se requiere GITHUB_CLIENT_ID en Vercel/.env. Puedes verificar tu usuario directamente abajo.');
    }
    if (params.get('error')) {
      setErrorNotice('Error en la autenticación con GitHub. Por favor verifica las credenciales e intenta nuevamente.');
    }
  }, [location]);

  // Auto-dismiss floating alerts after 6 seconds
  useEffect(() => {
    if (errorNotice) {
      const timer = setTimeout(() => setErrorNotice(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [errorNotice]);

  useEffect(() => {
    if (infoNotice) {
      const timer = setTimeout(() => setInfoNotice(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [infoNotice]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorNotice(null);

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!cleanUsername) {
      setErrorNotice('Por favor ingresa tu nombre de usuario de GitHub.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorNotice('Por favor ingresa un correo electrónico válido para seguridad y antifraude.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await loginDemo(cleanUsername, fullName.trim() || null, cleanEmail);

      if (result && result.success) {
        navigate('/dashboard');
      } else {
        setErrorNotice(result?.error || 'Error al iniciar sesión.');
      }
    } catch (err) {
      setErrorNotice(err.message || 'Error de conexión con el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Toast Notification Banner (Never expands or distorts the login card) */}
      {(errorNotice || infoNotice) && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-none transition-all">
          {errorNotice && (
            <div className="pointer-events-auto p-4 rounded-2xl bg-rose-950/95 text-rose-200 border border-rose-500/50 backdrop-blur-xl shadow-2xl flex items-start gap-3 mb-2 animate-fade-in">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs leading-relaxed">
                <p className="font-bold text-rose-300">Aviso de Validación</p>
                <p className="mt-0.5 text-rose-100">{errorNotice}</p>
              </div>
              <button 
                onClick={() => setErrorNotice(null)}
                className="text-rose-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                title="Cerrar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {infoNotice && (
            <div className="pointer-events-auto p-4 rounded-2xl bg-dark-900/95 text-cyan-200 border border-cyan-500/50 backdrop-blur-xl shadow-2xl flex items-start gap-3 animate-fade-in">
              <Info className="w-5 h-5 text-brand-cyan shrink-0 mt-0.5" />
              <div className="flex-1 text-xs leading-relaxed">
                <p className="font-bold text-brand-cyan">Información de Sesión</p>
                <p className="mt-0.5 text-slate-200">{infoNotice}</p>
              </div>
              <button 
                onClick={() => setInfoNotice(null)}
                className="text-cyan-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                title="Cerrar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Login Card */}
      <div className="w-full max-w-md p-6 sm:p-8 glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900/70 shadow-2xl relative overflow-hidden transition-colors">
        {/* Background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-brand-cyan/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-brand-violet/15 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center mb-5 relative z-10">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-brand-cyan/20 to-brand-violet/20 border border-brand-cyan/30 flex items-center justify-center shadow-lg shadow-brand-cyan/10">
            <Github className="w-7 h-7 text-slate-900 dark:text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Acceso a GitFlow</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            Telemetría en tiempo real sincronizada con GitHub y gestión ágil de salas.
          </p>
        </div>

        {/* Auth Method Selector Tabs */}
        <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-dark-950/80 border border-slate-200 dark:border-slate-800/80 mb-5 relative z-10">
          <button
            type="button"
            onClick={() => setActiveTab('verification')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'verification'
                ? 'bg-white dark:bg-dark-800 text-cyan-600 dark:text-brand-cyan shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Verificación Usuario</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('oauth')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'oauth'
                ? 'bg-white dark:bg-dark-800 text-cyan-600 dark:text-brand-cyan shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub OAuth</span>
          </button>
        </div>

        <div className="space-y-4 relative z-10">
          
          {/* TAB 1: Direct GitHub Developer Verification */}
          {activeTab === 'verification' && (
            <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-dark-900/90 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3.5 animate-fade-in">
              
              {/* GitHub Username */}
              <div>
                <label className="block text-[11px] font-mono text-slate-700 dark:text-slate-300 mb-1 font-semibold flex items-center gap-1.5">
                  <Github className="w-3.5 h-3.5 text-cyan-600 dark:text-brand-cyan" />
                  <span>Usuario de GitHub (Verificado en API):</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej: covaleda402 o tu usuario"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-brand-cyan font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Verifica en tiempo real que tu cuenta exista en GitHub antes de conceder acceso.
                </p>
              </div>

              {/* Full Name (Optional) */}
              <div>
                <label className="block text-[11px] font-mono text-slate-700 dark:text-slate-300 mb-1 font-semibold">
                  Nombre Completo (Opcional):
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-brand-cyan font-sans"
                />
              </div>

              {/* Email Address (Required for Anti-fraud & Notifications) */}
              <div>
                <label className="block text-[11px] font-mono text-slate-700 dark:text-slate-300 mb-1 font-semibold flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-brand-cyan" />
                  <span>Correo Electrónico (Notificaciones & Antifraude):</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu-correo@ejemplo.com"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-brand-cyan font-sans"
                />
                <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span>Recibirás correo de bienvenida, confirmación de salas y alertas de seguridad.</span>
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-brand-cyan border border-brand-cyan/40 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-brand-cyan" />
                <span>{submitting ? 'Verificando con GitHub API...' : 'Entrar y Verificar Usuario'}</span>
              </button>
            </form>
          )}

          {/* TAB 2: Official GitHub OAuth Button */}
          {activeTab === 'oauth' && (
            <div className="bg-slate-50 dark:bg-dark-900/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-4 animate-fade-in text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-900 dark:bg-dark-950 border border-slate-700 flex items-center justify-center">
                <Github className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Autenticación Directa GitHub App</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Conéctate directamente con tu sesión activa de GitHub mediante el protocolo OAuth 2.0 seguro.
                </p>
              </div>

              <button
                onClick={loginWithGitHub}
                disabled={loading || submitting}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-black dark:bg-slate-100 dark:hover:bg-white text-white dark:text-dark-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5 shadow-lg active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                <Github className="w-4 h-4 sm:w-5 sm:h-5 text-white dark:text-dark-950" />
                <span>Iniciar sesión con GitHub OAuth</span>
                <ArrowRight className="w-4 h-4 ml-auto opacity-70" />
              </button>
            </div>
          )}

          {/* Guest Mode Exploration */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-900/60 dark:hover:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Explorar salas sin iniciar sesión (Modo Invitado)</span>
            </button>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-2 gap-3 text-left relative z-10">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-300">Auth Segura</p>
              <p className="text-[10px] text-slate-500">JWT & Prepared SQL</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-brand-cyan shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-300">Live Sockets</p>
              <p className="text-[10px] text-slate-500">Telemetría en tiempo real</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
