import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send } from 'lucide-react';
import { collection, query, getDocs, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

const QUICK_PROMPTS = [
  "Summarise active incidents",
  "Which area has most incidents?",
  "How many responders available?",
  "Full situation report",
  "Any unassigned incidents?"
];

export default function ResQAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'model', text: "ResQ AI online. Campus data loaded. How can I assist command?", timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Real-time data state
  const [activeIncidents, setActiveIncidents] = useState([]);
  const [recentResolvedIncidents, setRecentResolvedIncidents] = useState([]);
  const [responders, setResponders] = useState([]);
  const [resolvedTodayCount, setResolvedTodayCount] = useState(0);
  const [hasCritical, setHasCritical] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, isOpen, isTyping]);

  useEffect(() => {
    const unsubIncidents = onSnapshot(collection(db, 'incidents'), (snap) => {
      const active = [];
      const resolved = [];
      let resolvedCount = 0;
      let criticalFound = false;
      
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);

      snap.forEach(doc => {
        const data = doc.data();
        if (data.status !== 'resolved') {
          active.push({ id: doc.id, ...data });
          if (data.severity === 'critical') criticalFound = true;
        } else if (data.resolvedAt) {
          resolved.push({ id: doc.id, ...data });
          const resolvedDate = data.resolvedAt.toDate ? data.resolvedAt.toDate() : new Date(data.resolvedAt);
          if (resolvedDate >= todayMidnight) {
            resolvedCount++;
          }
        }
      });
      
      resolved.sort((a, b) => {
        const tA = a.resolvedAt?.toMillis ? a.resolvedAt.toMillis() : new Date(a.resolvedAt).getTime();
        const tB = b.resolvedAt?.toMillis ? b.resolvedAt.toMillis() : new Date(b.resolvedAt).getTime();
        return tB - tA;
      });
      
      setActiveIncidents(active);
      setRecentResolvedIncidents(resolved.slice(0, 10));
      setResolvedTodayCount(resolvedCount);
      setHasCritical(criticalFound);
    });

    const unsubResponders = onSnapshot(collection(db, 'responders'), (snap) => {
      const resp = [];
      snap.forEach(doc => {
        resp.push({ id: doc.id, ...doc.data() });
      });
      setResponders(resp);
    });

    return () => {
      unsubIncidents();
      unsubResponders();
    };
  }, []);

  const buildSystemPrompt = () => {
    const activeCount = activeIncidents.length;
    const inProgressCount = activeIncidents.filter(i => i.status === 'in_progress' || i.status === 'assigned').length;
    const availableCount = responders.filter(r => r.available).length;

    let prompt = `You are ResQ, an AI crisis command assistant for a college campus emergency response system. You have real-time access to ACTIVE and RECENTLY RESOLVED campus incident data provided below. Be concise, tactical, and clear. 

IMPORTANT RULES:
1. If a user asks about a specific person (e.g., "Sayona", a "terminated employee", etc.), or an event that is NOT in the active or resolved lists below, politely explain: "I currently only have visibility into active incidents and recent resolved incidents. I don't see any alerts regarding that. It may be an older incident archived outside my current database."
2. If the person/event IS in the incidents below, provide the details immediately.
3. Keep responses under 150 words unless a full report is requested.
4. Format severity as 🔴 Critical, 🟡 Moderate, 🟢 Minor.\n\n`;
    
    prompt += `CURRENT CAMPUS STATUS:\n`;
    prompt += `Active Incidents: ${activeCount}\n`;
    prompt += `In Progress: ${inProgressCount}\n`;
    prompt += `Resolved Today: ${resolvedTodayCount}\n`;
    prompt += `Available Responders: ${availableCount}\n\n`;

    prompt += `ACTIVE INCIDENTS:\n`;
    if (activeIncidents.length === 0) {
      prompt += "None.\n\n";
    } else {
      activeIncidents.forEach(inc => {
        const sevIcon = inc.severity === 'critical' ? '🔴 Critical' : inc.severity === 'moderate' ? '🟡 Moderate' : '🟢 Minor';
        const timeAgo = inc.createdAt ? Math.floor((new Date() - inc.createdAt.toDate()) / 60000) + ' mins ago' : 'Unknown time';
        prompt += `- ID: ${inc.id} | ${sevIcon} | Type: ${inc.type} | Location: ${inc.location}\n`;
        prompt += `  Status: ${inc.status} | Assigned: ${inc.assignedName || 'Unassigned'}\n`;
        prompt += `  Reported: ${timeAgo}\n`;
        prompt += `  Description: ${inc.description}\n\n`;
      });
    }

    prompt += `RECENTLY RESOLVED INCIDENTS (Last 10):\n`;
    if (recentResolvedIncidents.length === 0) {
      prompt += "None.\n\n";
    } else {
      recentResolvedIncidents.forEach(inc => {
        const sevIcon = inc.severity === 'critical' ? '🔴 Critical' : inc.severity === 'moderate' ? '🟡 Moderate' : '🟢 Minor';
        prompt += `- ID: ${inc.id} | ${sevIcon} | Type: ${inc.type} | Location: ${inc.location}\n`;
        prompt += `  Status: Resolved | Resolved By: ${inc.assignedName || 'Unknown'}\n`;
        prompt += `  Description: ${inc.description}\n`;
        if (inc.closureReport) prompt += `  Closure Report: ${inc.closureReport}\n`;
        prompt += `\n`;
      });
    }

    prompt += `RESPONDERS ON DUTY:\n`;
    if (responders.length === 0) {
      prompt += "None.\n";
    } else {
      responders.forEach(r => {
        prompt += `- ${r.name || 'Unknown'} | ${r.department || 'Unknown'} | ${r.available ? 'Available' : 'Busy'}\n`;
        prompt += `  Current incident: ${r.currentIncident || 'None'}\n\n`;
      });
    }

    return prompt;
  };

  const handleSend = async (textOverride) => {
    const msgText = textOverride || input;
    if (!msgText.trim()) return;

    const userMsg = { role: 'user', text: msgText, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const isDemo = import.meta.env.VITE_GROQ_API_KEY === "demo-api-key" || !import.meta.env.VITE_GROQ_API_KEY;
      
      let replyText = "";
      
      if (isDemo) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        replyText = "I am operating in offline demo mode. However, I can see there are currently " + activeIncidents.length + " active incidents and " + responders.filter(r => r.available).length + " available responders.";
      } else {
        const apiKey = import.meta.env.VITE_GROQ_API_KEY;
        
        // Map history to Groq/OpenAI format
        const historyData = messages
          .filter((m, idx) => idx !== 0) 
          .map(m => ({
            role: m.role === 'model' ? 'assistant' : 'user',
            content: m.text
          }));
          
        const history = historyData.slice(-10);
        
        // System prompt must be the very first message for Groq
        const systemMessage = {
          role: 'system',
          content: buildSystemPrompt()
        };

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [systemMessage, ...history, { role: 'user', content: msgText }]
          })
        });

        if (!res.ok) {
           const errText = await res.text();
           console.error("Groq API Error Response:", errText);
           throw new Error("Groq API request failed: " + res.status);
        }
        
        const data = await res.json();
        replyText = data.choices[0].message.content;
      }

      setMessages(prev => [...prev, { role: 'model', text: replyText, timestamp: new Date() }]);
    } catch (error) {
      console.error("Groq AI Error:", error);
      let replyText = "I'm currently running in offline fallback mode due to an API connectivity issue. ";
      
      const lowerText = msgText.toLowerCase();
      if (lowerText.includes('incident')) {
        replyText += `There are ${activeIncidents.length} active incidents, and ${activeIncidents.filter(i=>i.severity==='critical').length} are critical.`;
      } else if (lowerText.includes('responder') || lowerText.includes('available')) {
        replyText += `We currently have ${responders.filter(r => r.available).length} responders available and standing by.`;
      } else if (lowerText.includes('resolved') || lowerText.includes('today')) {
         replyText += `There have been ${resolvedTodayCount} incidents resolved successfully today.`;
      } else {
        replyText += "My language processing is restricted, but my telemetry is fully live. You can ask me for incident counts, responder status, or today's resolved metrics.";
      }
      
      setMessages(prev => [...prev, { role: 'model', text: replyText, timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed right-6 bottom-6 w-14 h-14 bg-[#FF3B3B] rounded-full flex items-center justify-center text-white shadow-lg z-50 transition-transform hover:scale-110 ${hasCritical ? 'animate-pulse shadow-[0_0_20px_rgba(255,59,59,0.6)]' : ''} ${isOpen ? 'hidden' : 'block'}`}
        title="Ask ResQ AI"
      >
        <Sparkles size={24} />
      </button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed right-6 bottom-6 w-[380px] h-[520px] bg-[#111318] border border-[#FF3B3B] rounded-lg z-50 flex flex-col overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#FF3B3B]" />
            
            {/* Header */}
            <div className="p-4 flex justify-between items-center border-b border-[#2A3040]">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold tracking-wide" style={{ fontFamily: '"Syne", sans-serif' }}>ResQ AI</span>
                <span className="text-[#3B82F6] text-[10px] bg-[#3B82F6]/10 px-2 py-0.5 rounded" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Powered by Gemini</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition">
                <X size={18} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div 
                    className={`relative p-[10px] px-[14px] max-w-[85%] text-[#E8EDF5] text-[14px] leading-relaxed shadow-sm`}
                    style={{ 
                      fontFamily: '"Instrument Sans", sans-serif',
                      backgroundColor: msg.role === 'user' ? 'rgba(59,130,246,0.15)' : '#1E2230',
                      border: msg.role === 'user' ? '1px solid rgba(59,130,246,0.3)' : '1px solid #2A3040',
                      borderRadius: msg.role === 'user' ? '8px 8px 2px 8px' : '8px 8px 8px 2px'
                    }}
                  >
                    {msg.role === 'model' && i > 0 && <span className="absolute -top-2 -left-2 text-[#3B82F6] bg-[#111318] rounded-full p-0.5 text-xs">⚡</span>}
                    {/* Render markdown boldly if needed, but text is fine */}
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                  <span className="text-[#5A6478] text-[10px] mt-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}

              {isTyping && (
                <div className="flex flex-col items-start">
                  <div className="relative p-[10px] px-[14px] max-w-[85%] bg-[#1E2230] border border-[#2A3040] rounded-[8px_8px_8px_2px] flex items-center gap-2">
                    <span className="text-[#3B82F6] text-xs">⚡</span>
                    <span className="text-[#E8EDF5] text-sm" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>ResQ AI is thinking...</span>
                    <div className="flex gap-1 ml-1">
                      <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1 h-1 bg-slate-400 rounded-full" />
                      <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1 h-1 bg-slate-400 rounded-full" />
                      <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1 h-1 bg-slate-400 rounded-full" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts (Only if just 1 message) */}
            {messages.length === 1 && (
              <div className="px-3 pb-2 flex gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
                {QUICK_PROMPTS.map((p, i) => (
                  <button 
                    key={i}
                    onClick={() => handleSend(p)}
                    className="bg-[#1E2230] border border-[#2A3040] rounded text-[#8A94A8] text-[11px] px-3 py-1.5 hover:text-white hover:bg-[#2A3040] transition shrink-0"
                    style={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3 border-t border-[#2A3040] bg-[#111318] flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about incidents, threats, responders..."
                className="flex-1 bg-[#0A0C10] border border-[#1E2230] rounded text-[#E8EDF5] text-sm px-3 py-2 outline-none focus:border-[#FF3B3B] transition"
                style={{ fontFamily: '"Instrument Sans", sans-serif' }}
              />
              <button 
                type="submit" 
                disabled={!input.trim() || isTyping}
                className="bg-[#FF3B3B] text-white p-2 rounded hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-10 h-10 shrink-0"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}
