import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  X, 
  Minimize2, 
  Maximize2, 
  User, 
  CheckCircle2, 
  HelpCircle,
  MessageSquare
} from 'lucide-react';

export default function RoomChatbot({ projectId = 1, projectName = 'GitFlow' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: `👋 ¡Hola! Soy **GitBot**, el asistente de la sala **${projectName}**.\n\nPuedo leer la documentación, informarte de qué trata el proyecto, decirte qué tareas faltan o buscar qué commits y tareas ha completado cualquier integrante (ej: *"¿Qué ha hecho Edwin?"*).`,
      suggestions: [
        '¿De qué trata esta sala?',
        '¿Qué tareas faltan por hacer?',
        '¿Qué ha hecho @edwin-esquivel?',
        '¿Qué documentos hay en las carpetas?'
      ],
      time: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (customMessage) => {
    const textToSend = customMessage || inputText;
    if (!textToSend.trim() || isTyping) return;

    const userMsg = {
      sender: 'user',
      text: textToSend,
      time: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend })
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        setMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: data.reply,
            suggestions: data.suggestions || [],
            time: new Date()
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: 'Disculpa, no pude procesar tu consulta en este momento.',
            suggestions: ['¿De qué trata esta sala?', '¿Qué tareas faltan?'],
            time: new Date()
          }
        ]);
      }
    } catch (err) {
      console.error('Error querying room chatbot:', err);
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: 'Error de conexión con el asistente de la sala.',
          suggestions: [],
          time: new Date()
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderSimpleMarkdown = (text) => {
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mt-2 mb-1">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('- ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-[11px] sm:text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
            {line.replace('- ', '')}
          </li>
        );
      }
      if (line.trim() === '') {
        return <div key={idx} className="h-1.5" />;
      }
      return <p key={idx} className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-200 leading-relaxed mb-0.5">{line}</p>;
    });
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-5 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-tr from-brand-cyan to-brand-violet text-dark-950 font-bold text-xs shadow-xl shadow-brand-cyan/25 hover:scale-105 active:scale-95 transition-all group"
          title="Abrir Asistente AI de la Sala"
        >
          <Bot className="w-5 h-5 text-dark-950 group-hover:rotate-12 transition-transform" />
          <span className="hidden sm:inline font-extrabold tracking-tight">GitBot Asistente</span>
          <span className="w-2 h-2 rounded-full bg-dark-950 animate-ping" />
        </button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <div className="fixed bottom-16 md:bottom-6 right-3 sm:right-6 z-50 w-[95vw] sm:w-[420px] h-[550px] max-h-[85vh] rounded-3xl glass-panel border border-slate-300 dark:border-slate-700 shadow-2xl bg-white dark:bg-dark-900 flex flex-col overflow-hidden animate-fade-in">
          
          {/* Header */}
          <div className="p-3.5 px-4 bg-slate-100 dark:bg-dark-950/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-cyan to-brand-violet flex items-center justify-center text-dark-950">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  GitBot AI
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[200px]">
                  Asistente de {projectName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] p-3 rounded-2xl text-xs ${
                    msg.sender === 'user'
                      ? 'bg-brand-cyan text-dark-950 font-medium rounded-tr-none shadow-sm'
                      : 'bg-slate-100 dark:bg-dark-950/80 border border-slate-200 dark:border-slate-800 rounded-tl-none text-slate-800 dark:text-slate-200 shadow-sm'
                  }`}
                >
                  {renderSimpleMarkdown(msg.text)}
                </div>

                {/* Suggestions Chips below bot message */}
                {msg.sender === 'bot' && msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-2 max-w-[95%]">
                    {msg.suggestions.map((sug, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => handleSendMessage(sug)}
                        className="text-[10px] font-mono px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-brand-cyan/20 hover:text-brand-cyan text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}

                <span className="text-[9px] text-slate-400 mt-1 font-mono px-1">
                  {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 p-3 max-w-[60%] rounded-2xl bg-slate-100 dark:bg-dark-950/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-brand-cyan animate-spin" />
                <span>GitBot analizando...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-slate-50 dark:bg-dark-950 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Pregúntale a GitBot sobre la sala o un miembro..."
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
            />
            <button
              type="submit"
              disabled={isTyping || !inputText.trim()}
              className="p-2.5 rounded-xl bg-brand-cyan hover:bg-cyan-300 text-dark-950 disabled:opacity-40 transition-all shrink-0 shadow-md shadow-brand-cyan/20"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      )}
    </>
  );
}
