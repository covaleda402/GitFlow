import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Github, ShieldCheck, Zap, ArrowRight, UserCheck, Eye, Info, Mail, Lock } from 'lucide-react';

export default function GitHubLogin() {
  const { loginWithGitHub, loginDemo, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState(null);
  const [infoNotice, setInfoNotice] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('logged_out') === 'true') {
      setInfoNotice('Sesión cerrada con éxito. Puedes seleccionar otra cuenta de GitHub o ingresar con tu usuario.');
    }
    if (params.get('notice') === 'github_oauth_unconfigured') {
      setInfoNotice('Para OAuth directo se requiere GITHUB_CLIENT_ID en Vercel/.env. Puedes ingresar directamente con tu usuario de GitHub y correo electrónico abajo.');
    }
    if (params.get('error')) {
      setErrorNotice('Error en la autenticación con GitHub. Por favor intenta nuevamente.');
    }
  }, [location]);

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
    <div className="w-full max-w-md p-6 sm:p-8 glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900/70 shadow-2xl relative overflow-hidden transition-colors">
      {/* Background glow */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-brand-cyan/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-brand-violet/15 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-6 relative z-10">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-brand-cyan/20 to-brand-violet/20 border border-brand-cyan/30 flex items-center justify-center shadow-lg shadow-brand-cyan/10">
          <Github className="w-7 h-7 text-slate-900 dark:text-white" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Acceso a GitFlow</h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
          Telemetría en tiempo real sincronizada con GitHub y gestión ágil de salas colaborativas.
        </p>
      </div>

      <div className="space-y-4 relative z-10">
        
        {/* Info notice if redirected from unconfigured OAuth */}
        {infoNotice && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2 animate-fade-in font-mono">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{infoNotice}</span>
          </div>
        )}

        {/* 1. Main GitHub OAuth Button */}
        <button
          onClick={loginWithGitHub}
          disabled={loading || submitting}
          className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-black dark:bg-slate-100 dark:hover:bg-white text-white dark:text-dark-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5 shadow-lg active:scale-95 disabled:opacity-60"
        >
          <Github className="w-4 h-4 sm:w-5 sm:h-5 text-white dark:text-dark-950" />
          <span>Iniciar sesión con GitHub OAuth</span>
          <ArrowRight className="w-4 h-4 ml-auto opacity-70" />
        </button>

        {/* Divider */}
        <div className="flex items-center my-3">
          <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
          <span className="px-3 text-[10px] font-mono text-slate-500 uppercase tracking-wider">o acceso de desarrollador</span>
          <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
        </div>

        {/* 2. Direct Developer Form */}
        <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-dark-900/90 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3.5">
          
          {/* GitHub Username */}
          <div>
            <label className="block text-[11px] font-mono text-slate-700 dark:text-slate-300 mb-1 font-semibold flex items-center gap-1.5">
              <Github className="w-3.5 h-3.5 text-cyan-600 dark:text-brand-cyan" />
              <span>Usuario de GitHub:</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tu usuario de GitHub"
              className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-brand-cyan font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Sincroniza automáticamente tu foto oficial y tus aportes en GitHub.
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

          {/* Email Address (Required for Anti-fraud) */}
          <div>
            <label className="block text-[11px] font-mono text-slate-700 dark:text-slate-300 mb-1 font-semibold flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-brand-cyan" />
              <span>Correo Electrónico (Seguridad Antifraude):</span>
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
              <span>Recibirás una notificación de seguridad con las normas de uso.</span>
            </p>
          </div>

          {/* Error Notice */}
          {errorNotice && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-600 dark:text-rose-400 font-mono">
              {errorNotice}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-brand-cyan border border-brand-cyan/40 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
          >
            <UserCheck className="w-4 h-4 text-brand-cyan" />
            <span>{submitting ? 'Verificando y autenticando...' : 'Entrar a GitFlow'}</span>
          </button>
        </form>

        {/* 3. Guest Mode Exploration */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-900/60 dark:hover:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs"
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
  );
}
