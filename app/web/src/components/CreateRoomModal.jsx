import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, X, Layers, Github, Trash2, GitFork } from 'lucide-react';

export default function CreateRoomModal({ isOpen, onClose, onCreated }) {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [repos, setRepos] = useState(['edwin-esquivel-ADSO/GitFlow']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleAddRepo = () => {
    setRepos(prev => [...prev, '']);
  };

  const handleRepoChange = (index, value) => {
    setRepos(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleRemoveRepo = (index) => {
    if (repos.length <= 1) return;
    setRepos(prev => prev.filter((_, i) => i !== index));
  };

  const cleanRepoInput = (str) => {
    return String(str || '')
      .trim()
      .replace(/^https?:\/\/github\.com\//i, '')
      .replace(/^git@github\.com:/i, '')
      .replace(/\.git$/i, '')
      .replace(/^\/+|\/+$/g, '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const validRepos = repos.map(cleanRepoInput).filter(Boolean);
    if (validRepos.length === 0) {
      setError('Debes ingresar al menos un repositorio de GitHub.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          description,
          github_repos: validRepos,
          github_repo: validRepos.join(', ')
        })
      });

      const data = await res.json();
      if (res.ok && data.project) {
        onCreated(data.project);
        onClose();
      } else {
        setError(data.error || 'Error al crear la sala');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-lg p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl bg-white dark:bg-dark-900 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-cyan" />
            Crear Nueva Sala de Trabajo
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500 font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1">Nombre de la Sala / Proyecto:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
              placeholder="ej. Sprint E-commerce v2"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1">Descripción del Objetivo:</label>
            <textarea
              rows="2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan resize-none"
              placeholder="Breve resumen de metas y alcance..."
            />
          </div>

          {/* Repositories Section: Single or Multi-Repo */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-slate-700 dark:text-slate-200 flex items-center gap-1.5 font-bold">
                <Github className="w-3.5 h-3.5 text-cyan-600 dark:text-brand-cyan" />
                <span>Repositorios de GitHub Conectados:</span>
              </label>
              <button
                type="button"
                onClick={handleAddRepo}
                className="text-[11px] font-mono text-cyan-600 dark:text-brand-cyan hover:underline flex items-center gap-1 font-bold"
              >
                <Plus className="w-3 h-3" />
                <span>Añadir Otro Repo</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Si tu proyecto incluye varios repositorios (ej. Frontend y Backend), anéxalos aquí. Si solo agregas uno, se seleccionará automáticamente en todas las tareas.
            </p>

            <div className="space-y-2 pt-1">
              {repos.map((r, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={r}
                      onChange={(e) => handleRepoChange(idx, e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                      placeholder="usuario/repositorio (ej. edwin-esquivel-ADSO/GitFlow-Backend)"
                      required
                    />
                  </div>

                  {repos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRepo(idx)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Eliminar repositorio"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
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
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-cyan hover:bg-cyan-400 text-dark-950 shadow-md shadow-brand-cyan/20 disabled:opacity-50 font-bold"
            >
              {loading ? 'Creando Sala...' : 'Crear Sala'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
