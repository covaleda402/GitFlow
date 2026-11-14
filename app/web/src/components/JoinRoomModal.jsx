import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, X, CheckCircle, ShieldAlert } from 'lucide-react';

export default function JoinRoomModal({ isOpen, onClose, onJoined }) {
  const { token } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/projects/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code })
      });

      const data = await res.json();
      if (res.ok && data.projectId) {
        onJoined(data.projectId);
        onClose();
      } else {
        setError(data.error || 'Código incorrecto o expirado.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-sm p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl bg-white dark:bg-dark-900 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-brand-cyan" />
            Unirse a una Sala
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
          Ingresa el código dinámico de 6 caracteres proporcionado por el creador de la sala. Recuerda que este código rota cada 5 minutos.
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500 font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1">Código de Sala (ej. 7A9F1B):</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength="8"
              className="w-full px-4 py-3 text-center text-lg font-mono font-bold tracking-widest rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
              placeholder="CÓDIGO"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-cyan hover:bg-cyan-400 text-dark-950 shadow-md shadow-brand-cyan/20 disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Entrar a la Sala'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
