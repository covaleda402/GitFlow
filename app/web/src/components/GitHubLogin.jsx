import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Github, ShieldCheck, Zap, ArrowRight, UserCheck } from 'lucide-react';

export default function GitHubLogin() {
  const { loginWithGitHub, loginDemo, loading } = useAuth();
  const [selectedDemoUser, setSelectedDemoUser] = useState('edwin-esquivel');
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemoSubmit = async (e) => {
    e.preventDefault();
    setDemoLoading(true);
    await loginDemo(selectedDemoUser);
    setDemoLoading(false);
  };

  return (
    <div className="w-full max-w-md p-8 glass-panel rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
      {/* Background neon glow */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-brand-cyan/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-brand-violet/15 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center mb-8 relative z-10">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-brand-cyan/20 to-brand-violet/20 border border-brand-cyan/30 flex items-center justify-center shadow-lg shadow-brand-cyan/10">
          <Github className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Acceso a GitFlow</h2>
        <p className="text-sm text-slate-400 mt-2">
          Gestión ágil sincronizada automáticamente con tus repositorios y commits de GitHub.
        </p>
      </div>

      <div className="space-y-4 relative z-10">
        {/* Main GitHub OAuth Button */}
        <button
          onClick={loginWithGitHub}
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-xl bg-slate-100 hover:bg-white text-dark-950 font-bold text-sm flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5 shadow-lg shadow-white/5 active:scale-95 disabled:opacity-60"
        >
          <Github className="w-5 h-5 text-dark-950" />
          <span>Iniciar sesión con GitHub</span>
          <ArrowRight className="w-4 h-4 ml-auto text-dark-950/70" />
        </button>

        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-slate-800" />
          <span className="px-3 text-[11px] font-mono text-slate-500 uppercase tracking-wider">o acceso instantáneo</span>
          <div className="flex-1 border-t border-slate-800" />
        </div>

        {/* Demo Fast Login (Ideal for immediate local testing & review) */}
        <form onSubmit={handleDemoSubmit} className="space-y-3 bg-dark-900/60 p-4 rounded-2xl border border-slate-800/80">
          <label className="block text-xs font-mono text-slate-400">
            Perfil Demo de Prueba:
          </label>
          <select
            value={selectedDemoUser}
            onChange={(e) => setSelectedDemoUser(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg bg-dark-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-brand-cyan font-mono"
          >
            <option value="edwin-esquivel">Edwin Esquivel (@edwin-esquivel - Tech Lead)</option>
            <option value="maria-dev">Maria Gomez (@maria-dev - Backend Eng)</option>
            <option value="alex-coder">Alex Rivera (@alex-coder - FullStack)</option>
          </select>

          <button
            type="submit"
            disabled={demoLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-cyan border border-brand-cyan/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <UserCheck className="w-4 h-4" />
            <span>{demoLoading ? 'Autenticando...' : 'Entrar en Modo Demo'}</span>
          </button>
        </form>
      </div>

      {/* Feature Pills */}
      <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-left relative z-10">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-slate-300">Auth Segura</p>
            <p className="text-[10px] text-slate-500">JWT & Prepared Statements</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Zap className="w-4 h-4 text-brand-cyan shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-slate-300">Live Sockets</p>
            <p className="text-[10px] text-slate-500">Telemetría en tiempo real</p>
          </div>
        </div>
      </div>
    </div>
  );
}
