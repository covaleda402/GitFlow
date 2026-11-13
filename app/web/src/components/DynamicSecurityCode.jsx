import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Copy, Check, Clock, RefreshCw, KeyRound } from 'lucide-react';

export default function DynamicSecurityCode({ projectId = 1 }) {
  const { token } = useAuth();
  const [codeData, setCodeData] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [copied, setCopied] = useState(false);

  const fetchCode = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/security-code`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setCodeData(data);
        setSecondsLeft(data.timeRemainingSeconds);
      }
    } catch (err) {
      console.error('Error fetching dynamic code:', err);
    }
  };

  useEffect(() => {
    fetchCode();
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          fetchCode();
          return 300;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [projectId, token]);

  const handleCopy = () => {
    if (codeData && codeData.code) {
      navigator.clipboard.writeText(codeData.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressPercent = Math.round((secondsLeft / 300) * 100);

  return (
    <div className="p-3.5 rounded-2xl glass-card border border-brand-cyan/20 relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5 font-bold">
          <KeyRound className="w-3.5 h-3.5 text-brand-cyan" />
          Código de Sala (5 min)
        </span>
        <span className="text-[10px] font-mono text-brand-cyan flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeFormatted}
        </span>
      </div>

      <div className="flex items-center justify-between bg-slate-100 dark:bg-dark-900/90 rounded-xl p-2.5 border border-slate-200 dark:border-slate-800">
        <span className="font-mono text-base font-extrabold tracking-widest text-slate-800 dark:text-white">
          {codeData ? codeData.code : '------'}
        </span>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all shadow-sm"
          title="Copiar código para compartir"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expiration Progress Bar */}
      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
        <div 
          className="bg-brand-cyan h-full transition-all duration-1000 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <p className="text-[9px] text-slate-500 mt-1.5 font-mono text-center">
        Rota cada 5 min para máxima seguridad.
      </p>
    </div>
  );
}
