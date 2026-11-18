import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Github, ShieldCheck, Zap, ArrowRight, UserCheck, UserPlus, Users } from 'lucide-react';

export default function GitHubLogin() {
  const { loginWithGitHub, loginDemo, loading } = useAuth();
  
  // Login Mode: 'team' (pre-set team members) or 'custom' (own custom handle/name)
  const [loginMode, setLoginMode] = useState('team');
  const [selectedDemoUser, setSelectedDemoUser] = useState('covaleda402');
  const [customUsername, setCustomUsername] = useState('');
  const [customName, setCustomName] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState(null);

  const handleDemoSubmit = async (e) => {
    e.preventDefault();
    setErrorNotice(null);
    setDemoLoading(true);

    try {
      if (loginMode === 'team') {
        const result = await loginDemo(selectedDemoUser);
        if (!result.success) setErrorNotice(result.error || 'Error al iniciar sesión.');
      } else {
        const cleanHandle = customUsername.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
        if (!cleanHandle) {
          setErrorNotice('Por favor ingresa un nombre de usuario válido.');
          setDemoLoading(false);
          return;
        }
        const result = await loginDemo(cleanHandle, customName.trim() || null);
        if (!result.success) setErrorNotice(result.error || 'Error al iniciar sesión.');
      }
    } catch (err) {
      setErrorNotice(err.message);
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-6 sm:p-8 glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900/70 shadow-2xl relative overflow-hidden transition-colors">
      {/* Background glow */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-brand-cyan/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-brand-violet/15 rounded-full blur-3xl pointer-events-none" />

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
        {/* Main GitHub OAuth Button */}
        <button
          onClick={loginWithGitHub}
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-black dark:bg-slate-100 dark:hover:bg-white text-white dark:text-dark-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5 shadow-lg active:scale-95 disabled:opacity-60"
        >
          <Github className="w-4 h-4 sm:w-5 sm:h-5 text-white dark:text-dark-950" />
          <span>Iniciar sesión con GitHub OAuth</span>
          <ArrowRight className="w-4 h-4 ml-auto opacity-70" />
        </button>

        <div className="flex items-center my-3">
          <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
          <span className="px-3 text-[10px] font-mono text-slate-500 uppercase tracking-wider">o ingresar como desarrollador</span>
          <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
        </div>

        {/* Demo Fast Login Container */}
        <div className="bg-slate-50 dark:bg-dark-900/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3">
          
          {/* Tabs: Team vs Custom Account */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/60 dark:bg-dark-950 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setLoginMode('team')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
                loginMode === 'team'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-brand-cyan" />
              <span>Equipo GitFlow</span>
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('custom')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
                loginMode === 'custom'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-brand-cyan" />
              <span>Tu Cuenta Propia</span>
            </button>
          </div>

          <form onSubmit={handleDemoSubmit} className="space-y-3">
            {loginMode === 'team' ? (
              <div>
                <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-300 mb-1.5">
                  Selecciona tu perfil de equipo:
                </label>
                <select
                  value={selectedDemoUser}
                  onChange={(e) => setSelectedDemoUser(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-brand-cyan font-mono"
                >
                  <option value="covaleda402">Jose Esneider Covaleda (@covaleda402 - Dev & QA)</option>
                  <option value="edwin-esquivel">Edwin Esquivel (@edwin-esquivel - Tech Lead)</option>
                  <option value="maria-dev">Maria Gomez (@maria-dev - Backend Eng)</option>
                  <option value="alex-coder">Alex Rivera (@alex-coder - FullStack)</option>
                </select>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-300 mb-1">
                    Usuario / Handle:
                  </label>
                  <input
                    type="text"
                    required
                    value={customUsername}
                    onChange={(e) => setCustomUsername(e.target.value)}
                    placeholder="ej. covaleda402, juan-dev, paula"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-brand-cyan font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-300 mb-1">
                    Nombre Completo (Opcional):
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="ej. Esneider Covaleda"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-brand-cyan font-mono"
                  />
                </div>
              </div>
            )}

            {errorNotice && (
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-600 dark:text-rose-400 font-mono">
                {errorNotice}
              </div>
            )}

            <button
              type="submit"
              disabled={demoLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-brand-cyan border border-brand-cyan/40 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
            >
              <UserCheck className="w-4 h-4 text-brand-cyan" />
              <span>{demoLoading ? 'Iniciando sesión...' : 'Entrar con este Perfil'}</span>
            </button>
          </form>
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
