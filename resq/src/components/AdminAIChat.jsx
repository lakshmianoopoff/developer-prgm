import { useState, useRef, useEffect } from 'react';
import { Shield, Send, X, Loader2, Sparkles } from 'lucide-react';
import { chatWithGemini } from '../services/gemini';
import { useIncidents } from '../hooks/useIncidents';
import { useResponders } from '../hooks/useResponders';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  const { incidents } = useIncidents();
  const { responders } = useResponders();

  const activeIncidents = incidents.filter(i => i.status !== 'resolved');
  const today = new Date();
  today.setHours(0,0,0,0);
  const resolvedTodayCount = incidents.filter(i => {
    if (i.status !== 'resolved' || !i.resolvedAt) return false;
    const resolvedDate = i.resolvedAt.toDate ? i.resolvedAt.toDate() : new Date(i.resolvedAt);
    return resolvedDate >= today;
  }).length;
  const availableRespondersCount = responders.filter(r => r.available).length;

  const severityCounts = activeIncidents.reduce((acc, i) => {
    acc[i.severity] = (acc[i.severity] || 0) + 1;
    return acc;
  }, {});

  const buildSystemPrompt = () => {
    const incidentText = activeIncidents.map(inc => 
      `- ID: ${inc.id} | Type: ${inc.type} | Severity: ${inc.severity} | Location: ${inc.locationName || inc.location} | Status: ${inc.status} | Assigned To: ${inc.assignedName || 'Unassigned'} | Reported: ${inc.createdAt?.toDate ? inc.createdAt.toDate().toLocaleString() : inc.createdAt}\n  Description: ${inc.description}`
    ).join('\n');

    const responderText = responders.map(res => 
      `- ${res.name} | ${res.department || 'General'} | ${res.available ? 'Available' : 'On Incident'} | Current: ${res.currentIncident || 'None'}`
    ).join('\n');

    return `You are ResQ, an AI crisis command assistant for a college campus emergency response system. You have access to real-time campus incident data. Be concise, tactical, and clear. Use bullet points for lists. Never say you don't have access to data — the data is provided to you below.

CURRENT CAMPUS STATUS:
Active Incidents: ${activeIncidents.length}
In Progress: ${activeIncidents.filter(i => i.status === 'in_progress').length}  
Resolved Today: ${resolvedTodayCount}
Available Responders: ${availableRespondersCount}

ACTIVE INCIDENTS:
${incidentText || 'None'}

RESPONDERS:
${responderText || 'None'}`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend) => {
    if (!textToSend.trim()) return;
    
    const userMessage = { 
      id: Date.now(), 
      role: 'user', 
      parts: [{ text: textToSend }], 
      timestamp: new Date() 
    };
    
    setMessages(prev => [...prev.slice(-19), userMessage]); // keep last 20 messages (10 turns)
    setInputValue('');
    setIsLoading(true);

    try {
      const systemPrompt = buildSystemPrompt();
      const currentMessages = [...messages.slice(-19), userMessage].map(m => ({
        role: m.role,
        parts: m.parts
      }));
      
      const responseText = await chatWithGemini(systemPrompt, currentMessages);
      
      const aiMessage = {
        id: Date.now() + 1,
        role: 'model',
        parts: [{ text: responseText }],
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  };

  const quickPrompts = [
    "Summarise active incidents",
    "Which area has most incidents?",
    "How many responders are available?",
    "Give me a full situation report"
  ];

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-accent-red hover:bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.5)] z-50 text-white transition-colors"
            title="Ask ResQ AI"
          >
            <Sparkles size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 right-6 w-[380px] h-[520px] bg-[#111318] border border-[#1E2230] rounded-lg shadow-2xl flex flex-col z-50 overflow-hidden"
          >
            <div className="bg-navy border-b border-[#1E2230] p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Shield className="text-accent-blue" size={20} />
                <h3 className="text-white font-syne font-bold m-0">ResQ AI Assistant</h3>
                <span className="bg-accent-blue/20 text-accent-blue text-[10px] uppercase px-2 py-0.5 rounded-sm font-bold ml-2 border border-accent-blue/30">Powered by Gemini</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
                  <Sparkles size={32} className="text-accent-blue opacity-50" />
                  <p className="font-instrument text-sm text-center">I'm connected to the live incident database.<br/>How can I assist command today?</p>
                </div>
              )}
              
              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-1 max-w-[85%] ${msg.role === 'user' ? 'self-end' : 'self-start'}`}>
                  <div className={`p-3 rounded-lg font-instrument text-sm whitespace-pre-wrap leading-relaxed
                    ${msg.role === 'user' ? 'bg-[#3B82F6]/20 text-white rounded-tr-sm border border-[#3B82F6]/30' : 'bg-[#1E2230] text-slate-200 rounded-tl-sm border border-slate-border'}`}
                  >
                    {msg.role === 'model' && (
                      <div className="flex items-center gap-2 mb-2 text-accent-blue">
                        <Sparkles size={14} />
                        <span className="text-xs font-bold font-syne">ResQ AI</span>
                      </div>
                    )}
                    {msg.parts[0].text}
                  </div>
                  <span className="text-[10px] text-slate-500 font-jetbrains">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-2 items-center self-start bg-[#1E2230] p-3 rounded-lg rounded-tl-sm border border-slate-border">
                  <Sparkles size={14} className="text-accent-blue" />
                  <div className="flex gap-1">
                    <motion.div animate={{ y: [0,-3,0] }} transition={{ repeat: Infinity, delay: 0 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full"></motion.div>
                    <motion.div animate={{ y: [0,-3,0] }} transition={{ repeat: Infinity, delay: 0.15 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full"></motion.div>
                    <motion.div animate={{ y: [0,-3,0] }} transition={{ repeat: Infinity, delay: 0.3 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full"></motion.div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-navy border-t border-[#1E2230] shrink-0">
              {messages.length === 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {quickPrompts.map((prompt, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleSend(prompt)}
                      className="text-xs bg-slate border border-slate-border text-slate-300 px-2 py-1.5 rounded-full hover:border-accent-blue hover:text-white transition whitespace-nowrap"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask about incidents, responders, threats..."
                  className="flex-1 bg-[#1E2230] border border-slate-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-blue transition font-instrument"
                  disabled={isLoading}
                />
                <button 
                  onClick={() => handleSend(inputValue)}
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-accent-red text-white p-2 rounded hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
