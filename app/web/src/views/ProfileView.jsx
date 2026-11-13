import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import MobileBottomNav from '../components/MobileBottomNav';
import MobileTopBar from '../components/MobileTopBar';
import CreateRoomModal from '../components/CreateRoomModal';
import JoinRoomModal from '../components/JoinRoomModal';
import { 
  User, 
  CheckCircle2, 
  GitCommit, 
  Award, 
  Sparkles, 
  Save, 
  Edit2, 
  Calendar, 
  Github, 
  ShieldCheck, 
  Radio 
} from 'lucide-react';

const AVATAR_PRESETS = [
  { name: 'Tech Lead', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80' },
  { name: 'Cyberpunk Dev', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80' },
  { name: 'Backend Architect', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80' },
  { name: 'Security Hacker', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80' }
];

export default function ProfileView() {
  const { user, token } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [customAvatarInput, setCustomAvatarInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Modals for rooms
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/users/profile/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.profile) {
        setProfileData(data.profile);
        setName(data.profile.name || data.profile.username);
        setBio(data.profile.bio || '');
        setSelectedAvatar(data.profile.custom_avatar || data.profile.avatar_url);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const finalAvatar = customAvatarInput.trim() || selectedAvatar;
      const res = await fetch('/api/users/profile/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          bio,
          custom_avatar: finalAvatar
        })
      });

      if (res.ok) {
        setIsEditing(false);
        fetchProfile();
      }
    } catch (err) {
      console.error('Error updating profile:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-950 flex flex-col md:flex-row transition-colors">
      
      {/* Desktop Sidebar (Left) */}
      <Sidebar 
        projectId={1}
        onOpenCreateRoom={() => setCreateModalOpen(true)}
        onOpenJoinRoom={() => setJoinModalOpen(true)}
        onSimulatePush={() => {}}
      />

      {/* Mobile Top Bar */}
      <MobileTopBar 
        projectName="Mi Perfil"
        onOpenRoomsModal={() => setCreateModalOpen(true)}
        onOpenJoinModal={() => setJoinModalOpen(true)}
      />

      {/* Main Profile Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-8">
        
        {/* Profile Hero Card */}
        <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-cyan/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="relative group">
                <img
                  src={selectedAvatar || profileData?.custom_avatar || profileData?.avatar_url || 'https://avatars.githubusercontent.com/u/10101?v=4'}
                  alt={profileData?.username}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border-2 border-brand-cyan shadow-xl object-cover"
                />
                <div className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-dark-950 border border-slate-700 text-brand-cyan">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                    {profileData?.name || profileData?.username || 'Edwin Esquivel'}
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                    Lead Dev
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  @{profileData?.username || 'edwin-esquivel'} • {profileData?.email || 'edwin@omnicode.tech'}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 max-w-lg leading-relaxed">
                  {profileData?.bio || 'Full-Stack Developer construyendo GitFlow con telemetría en tiempo real y arquitectura de microservicios.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 transition-all self-start sm:self-auto shadow-sm"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancelar Edición' : 'Editar Foto / Perfil'}</span>
            </button>
          </div>

          {/* Edit Profile Panel */}
          {isEditing && (
            <form onSubmit={handleSaveProfile} className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1">Nombre Completo:</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1">Bio / Especialidad:</label>
                  <input
                    type="text"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                  />
                </div>
              </div>

              {/* Avatar Selector Options */}
              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-2">
                  Selecciona tu Avatar / Foto de Perfil:
                </label>
                <div className="flex items-center gap-3 flex-wrap">
                  {/* GitHub Original */}
                  {profileData?.avatar_url && (
                    <button
                      type="button"
                      onClick={() => { setSelectedAvatar(profileData.avatar_url); setCustomAvatarInput(''); }}
                      className={`p-1 rounded-2xl border-2 transition-all ${
                        selectedAvatar === profileData.avatar_url && !customAvatarInput
                          ? 'border-brand-cyan scale-105'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                      title="Usar Avatar original de GitHub"
                    >
                      <img src={profileData.avatar_url} alt="GitHub" className="w-12 h-12 rounded-xl object-cover" />
                      <span className="block text-[9px] font-mono mt-1 text-center text-slate-500">GitHub</span>
                    </button>
                  )}

                  {/* Presets */}
                  {AVATAR_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => { setSelectedAvatar(p.url); setCustomAvatarInput(''); }}
                      className={`p-1 rounded-2xl border-2 transition-all ${
                        selectedAvatar === p.url && !customAvatarInput
                          ? 'border-brand-cyan scale-105'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                      title={p.name}
                    >
                      <img src={p.url} alt={p.name} className="w-12 h-12 rounded-xl object-cover" />
                      <span className="block text-[9px] font-mono mt-1 text-center text-slate-500 truncate max-w-[50px]">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1">
                  O pega una URL de imagen personalizada:
                </label>
                <input
                  type="url"
                  value={customAvatarInput}
                  onChange={(e) => setCustomAvatarInput(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-brand-cyan text-dark-950 hover:bg-cyan-300 transition-all shadow-md shadow-brand-cyan/20 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Personal Impact KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 uppercase">MIS TAREAS COMPLETADAS</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                {profileData?.stats?.completedTasksCount || 0}
              </span>
              <span className="text-xs text-emerald-500 font-mono">archivadas</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Registradas en tu historial</p>
          </div>

          <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 uppercase">MIS COMMITS SINCRONIZADOS</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                {profileData?.stats?.commitsCount || 0}
              </span>
              <span className="text-xs text-brand-cyan font-mono">verificados</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Telemetría de GitHub Webhooks</p>
          </div>

          <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 uppercase">SCORE DE IMPACTO TOTAL</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-500 font-mono">
                {profileData?.stats?.impactScore || 0}
              </span>
              <span className="text-xs text-amber-500 font-mono">pts</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Puntos acumulados del sprint</p>
          </div>
        </div>

        {/* Personal Completed Tasks History */}
        <div className="p-6 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Historial Personal de Tareas Cerradas
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {profileData?.completedTasks?.length || 0} tareas
            </span>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {profileData?.completedTasks?.map((task) => (
              <div key={task.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-brand-cyan font-bold">#{task.id}</span>
                  <div>
                    <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-through decoration-emerald-500/50">
                      {task.title}
                    </h5>
                    <span className="text-[10px] text-slate-400 font-mono">Sala: {task.project_name}</span>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-slate-400 shrink-0 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{new Date(task.completed_at || task.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}

            {(!profileData?.completedTasks || profileData?.completedTasks.length === 0) && (
              <div className="py-8 text-center text-xs text-slate-400 font-mono">
                Aún no tienes tareas terminadas en tu historial.
              </div>
            )}
          </div>
        </div>

      </main>

      {/* Mobile Bottom Navigation (Bottom TikTok style) */}
      <MobileBottomNav projectId={1} onSimulatePush={() => {}} />

      {/* Modals */}
      <CreateRoomModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} onCreated={() => {}} />
      <JoinRoomModal isOpen={joinModalOpen} onClose={() => setJoinModalOpen(false)} onJoined={() => {}} />

    </div>
  );
}
