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
  Clock,
  UploadCloud 
} from 'lucide-react';

const AVATAR_PRESETS = [
  { name: 'Tech Lead', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80' },
  { name: 'Cyberpunk Dev', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80' },
  { name: 'Backend Architect', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80' },
  { name: 'Security Hacker', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80' }
];

const INITIAL_PROFILE = {
  id: 1,
  username: 'edwin-esquivel',
  name: 'Edwin Esquivel',
  email: 'edwin@omnicode.tech',
  bio: 'Lead Full-Stack Developer & DevOps en GitFlow. Especialista en microservicios, WebSockets y telemetría de código.',
  avatar_url: 'https://avatars.githubusercontent.com/u/10101?v=4',
  custom_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  stats: {
    completedTasksCount: 5,
    commitsCount: 14,
    impactScore: 265
  },
  completedTasks: [
    { id: 1, title: 'Configurar autenticación OAuth con GitHub', project_name: 'GitFlow Ecosystem', completed_at: '2026-11-10T14:30:00Z' },
    { id: 2, title: 'Construir endpoint receptor de Webhooks de GitHub', project_name: 'GitFlow Ecosystem', completed_at: '2026-11-11T16:00:00Z' },
    { id: 7, title: 'Soporte para cambio de tema Claro y Oscuro', project_name: 'GitFlow Ecosystem', completed_at: '2026-11-13T10:15:00Z' },
    { id: 10, title: 'Diseño de navegación móvil TikTok-Style', project_name: 'Backend Microservices', completed_at: '2026-11-13T11:45:00Z' }
  ],
  recentCommits: [
    { id: 1, hash: '7a9f1b2', message: 'feat: configurar login OAuth con github y jwt tokens #1', timestamp: '2026-11-13T08:00:00Z' },
    { id: 2, hash: '8c3d4e5', message: 'fix: refrescar session y manejar errores en callback #1', timestamp: '2026-11-13T09:30:00Z' },
    { id: 5, hash: '2c3d4e5', message: 'feat: estructurar layout de LiveContextEditor con debounce #3', timestamp: '2026-11-13T11:00:00Z' }
  ]
};

export default function ProfileView() {
  const { user, token } = useAuth();
  const [profileData, setProfileData] = useState(() => ({
    id: user?.id || 1,
    username: user?.username || 'edwin-esquivel',
    name: user?.name || user?.username || 'Edwin Esquivel',
    email: user?.email || (user?.username ? `${user.username}@gitflow.dev` : 'edwin@omnicode.tech'),
    bio: user?.bio || 'Lead Full-Stack Developer & DevOps en GitFlow. Especialista en microservicios, WebSockets y telemetría de código.',
    avatar_url: user?.avatar_url || 'https://avatars.githubusercontent.com/u/10101?v=4',
    custom_avatar: user?.custom_avatar || user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    stats: {
      completedTasksCount: 5,
      commitsCount: 14,
      impactScore: 265
    },
    completedTasks: INITIAL_PROFILE.completedTasks,
    recentCommits: INITIAL_PROFILE.recentCommits
  }));
  const [loading, setLoading] = useState(false);

  // Synchronize profile data with authenticated user immediately
  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        id: user.id || prev.id,
        username: user.username || prev.username,
        name: user.name || user.username || prev.name,
        email: user.email || `${user.username}@gitflow.dev`,
        bio: user.bio !== undefined ? user.bio : prev.bio,
        avatar_url: user.avatar_url || prev.avatar_url,
        custom_avatar: user.custom_avatar || user.avatar_url || prev.custom_avatar
      }));
      setName(user.name || user.username || '');
      setBio(user.bio || '');
      setSelectedAvatar(user.custom_avatar || user.avatar_url || '');
    }
  }, [user]);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || user?.username || INITIAL_PROFILE.name);
  const [bio, setBio] = useState(user?.bio || INITIAL_PROFILE.bio);
  const [selectedAvatar, setSelectedAvatar] = useState(user?.custom_avatar || user?.avatar_url || INITIAL_PROFILE.custom_avatar);
  const [customAvatarInput, setCustomAvatarInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingCloudinary, setUploadingCloudinary] = useState(false);

  const handleCloudinaryUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (.png, .jpg, .webp).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert('La imagen no debe superar los 8MB.');
      return;
    }

    setUploadingCloudinary(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            file: reader.result,
            folder: 'avatars',
            tag: 'user-profile'
          })
        });

        const data = await res.json();
        if (res.ok && data.url) {
          setSelectedAvatar(data.url);
          setCustomAvatarInput(data.url);
        } else {
          alert(data.error || 'Error al subir imagen a Cloudinary.');
        }
      } catch (err) {
        console.error('Error uploading to Cloudinary:', err);
        alert('Error de conexión al subir la imagen.');
      } finally {
        setUploadingCloudinary(false);
      }
    };
    reader.readAsDataURL(file);
  };

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
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
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
      } else {
        // Local update fallback
        setProfileData(prev => ({
          ...prev,
          name,
          bio,
          custom_avatar: finalAvatar
        }));
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setIsEditing(false);
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
        onOpenCreateModal={() => setCreateModalOpen(true)}
      />

      {/* Main Profile Area: Fully Responsive on any screen and zoom level */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-8">
        
        {/* Profile Card Header */}
        <div className="p-5 sm:p-8 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900/60 shadow-sm relative overflow-hidden">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4 sm:gap-5 flex-wrap sm:flex-nowrap">
              <div className="relative group shrink-0">
                <img
                  src={selectedAvatar || profileData.custom_avatar || profileData.avatar_url}
                  alt={profileData.username}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border-2 border-brand-cyan shadow-lg object-cover"
                />
                <div className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-slate-900 border border-slate-700 text-brand-cyan shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white truncate">
                    {profileData.name || profileData.username}
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold shrink-0">
                    Lead Developer
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-0.5">
                  @{profileData.username} • {profileData.email}
                </p>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 max-w-lg leading-relaxed">
                  {profileData.bio}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 transition-all self-start sm:self-auto shadow-xs"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancelar Edición' : 'Editar Foto / Perfil'}</span>
            </button>
          </div>

          {/* Edit Profile Form */}
          {isEditing && (
            <form onSubmit={handleSaveProfile} className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-1">Nombre Completo:</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-1">Especialidad / Biografía:</label>
                  <input
                    type="text"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                  />
                </div>
              </div>

              {/* Avatar Selector Options */}
              <div>
                <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-2">
                  Selecciona tu Avatar o Foto de Perfil:
                </label>
                <div className="flex items-center gap-3 flex-wrap">
                  {/* GitHub Original */}
                  {profileData.avatar_url && (
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
                      <span className="block text-[9px] font-mono mt-1 text-center text-slate-600 dark:text-slate-400">GitHub</span>
                    </button>
                  )}

                  {/* Curated Presets */}
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
                      <span className="block text-[9px] font-mono mt-1 text-center text-slate-600 dark:text-slate-400 truncate max-w-[50px]">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cloudinary Direct File Upload */}
              <div className="p-3.5 rounded-2xl bg-cyan-500/5 dark:bg-cyan-500/10 border border-cyan-500/25 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-cyan-600 dark:text-brand-cyan" />
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      Subir Foto a Cloudinary:
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-brand-cyan font-bold">
                    Cloudinary CDN
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-brand-cyan border border-brand-cyan/40 text-xs font-mono font-medium transition-all shadow-sm">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{uploadingCloudinary ? 'Subiendo a Cloudinary...' : 'Elegir Archivo Local'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingCloudinary}
                      onChange={handleCloudinaryUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    PNG, JPG, WEBP (hasta 8MB)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-1">
                  O ingresa una URL de foto personalizada:
                </label>
                <input
                  type="url"
                  value={customAvatarInput}
                  onChange={(e) => setCustomAvatarInput(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
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

        {/* Personal Metrics KPIs - High Contrast */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900/60 shadow-xs">
            <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 uppercase font-bold">MIS TAREAS COMPLETADAS</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                {profileData.stats?.completedTasksCount || 0}
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold">archivadas</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">Registradas en tu historial de sprint</p>
          </div>

          <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900/60 shadow-xs">
            <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 uppercase font-bold">MIS COMMITS VINCULADOS</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                {profileData.stats?.commitsCount || 0}
              </span>
              <span className="text-xs text-cyan-600 dark:text-brand-cyan font-mono font-bold">verificados</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">Telemetría de GitHub Webhooks</p>
          </div>

          <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900/60 shadow-xs">
            <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 uppercase font-bold">SCORE DE IMPACTO TOTAL</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                {profileData.stats?.impactScore || 0}
              </span>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-mono font-bold">pts</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">Puntos acumulados del sprint</p>
          </div>
        </div>

        {/* Personal Completed Tasks History */}
        <div className="p-6 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900/60 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Historial Personal de Tareas Cerradas
            </h3>
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              {profileData.completedTasks?.length || 0} tareas
            </span>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {profileData.completedTasks?.map((task) => (
              <div key={task.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-cyan-700 dark:text-brand-cyan font-bold">#{task.id}</span>
                  <div>
                    <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-through decoration-emerald-500/50">
                      {task.title}
                    </h5>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        Sala: {task.project_name || `#${task.project_id}`}
                      </span>
                      {task.project_status === 'DELETED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[9px] font-mono font-bold">
                          Sala eliminada
                        </span>
                      )}
                      {task.project_status === 'SUSPENDED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[9px] font-mono font-bold">
                          Sala suspendida
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 shrink-0 flex items-center gap-1.5 bg-slate-100 dark:bg-dark-950 px-2.5 py-1 rounded-xl">
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{new Date(task.completed_at || '2026-11-13').toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Mobile Bottom Navigation (TikTok style) */}
      <MobileBottomNav projectId={1} onSimulatePush={() => {}} />

      {/* Modals */}
      <CreateRoomModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} onCreated={() => {}} />
      <JoinRoomModal isOpen={joinModalOpen} onClose={() => setJoinModalOpen(false)} onJoined={() => {}} />

    </div>
  );
}
