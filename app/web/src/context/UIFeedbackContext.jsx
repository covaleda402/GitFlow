import React, { createContext, useContext, useState, useCallback } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Info, 
  Trash2, 
  HelpCircle,
  AlertCircle
} from 'lucide-react';

const UIFeedbackContext = createContext(null);

export function UIFeedbackProvider({ children }) {
  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Aceptar',
    cancelText: 'Cancelar',
    type: 'warning', // 'warning' | 'danger' | 'info' | 'success'
    resolve: null
  });

  // Prompt / Input Modal state (e.g. for linking commit or adding repo)
  const [promptModal, setPromptModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    placeholder: '',
    defaultValue: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    resolve: null
  });

  // Show Toast
  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 7);
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Show Confirmation Dialog (returns a Promise<boolean>)
  const confirm = useCallback(({
    title = '¿Estás seguro?',
    message = '',
    confirmText = 'Aceptar',
    cancelText = 'Cancelar',
    type = 'warning'
  }) => {
    return new Promise((resolve) => {
      setConfirmModal({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        type,
        resolve
      });
    });
  }, []);

  const handleConfirmClose = (result) => {
    if (confirmModal.resolve) {
      confirmModal.resolve(result);
    }
    setConfirmModal(prev => ({ ...prev, isOpen: false, resolve: null }));
  };

  return (
    <UIFeedbackContext.Provider value={{ showToast, confirm }}>
      {children}

      {/* 1. Animated Responsive Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md p-5 sm:p-6 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl bg-white dark:bg-dark-900 text-slate-900 dark:text-white transition-all transform animate-scale-up space-y-4">
            
            {/* Header with Type Icon */}
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-2xl shrink-0 ${
                confirmModal.type === 'danger'
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  : confirmModal.type === 'success'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : confirmModal.type === 'info'
                  ? 'bg-cyan-500/15 text-cyan-600 dark:text-brand-cyan border border-cyan-500/30'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
              }`}>
                {confirmModal.type === 'danger' ? (
                  <Trash2 className="w-6 h-6" />
                ) : confirmModal.type === 'success' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : confirmModal.type === 'info' ? (
                  <Info className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>

              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed font-sans">
                  {confirmModal.message}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {confirmModal.cancelText}
              </button>

              <button
                type="button"
                onClick={() => handleConfirmClose(true)}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                  confirmModal.type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                    : confirmModal.type === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                    : confirmModal.type === 'info'
                    ? 'bg-brand-cyan hover:bg-cyan-300 text-dark-950 shadow-brand-cyan/20'
                    : 'bg-amber-500 hover:bg-amber-400 text-dark-950 shadow-amber-500/20'
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. Floating On-Screen Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm sm:max-w-md w-full px-4 sm:px-0 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3 sm:p-3.5 rounded-2xl shadow-xl border flex items-center justify-between gap-3 animate-fade-in backdrop-blur-xl ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 dark:bg-emerald-950/95 border-emerald-500/40 text-emerald-100'
                : toast.type === 'error'
                ? 'bg-rose-950/90 dark:bg-rose-950/95 border-rose-500/40 text-rose-100'
                : toast.type === 'warning'
                ? 'bg-amber-950/90 dark:bg-amber-950/95 border-amber-500/40 text-amber-100'
                : 'bg-slate-900/90 dark:bg-dark-900/95 border-slate-700 text-slate-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-brand-cyan shrink-0" />}
              <span className="text-xs font-medium leading-snug font-sans">
                {toast.message}
              </span>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

    </UIFeedbackContext.Provider>
  );
}

export function useUIFeedback() {
  const ctx = useContext(UIFeedbackContext);
  if (!ctx) {
    // Graceful fallback if used outside provider
    return {
      showToast: (msg) => console.log('[Toast]', msg),
      confirm: ({ message }) => Promise.resolve(window.confirm(message))
    };
  }
  return ctx;
}
