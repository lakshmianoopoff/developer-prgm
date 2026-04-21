import { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatBox({ incidentId, isPublic = false, isAdmin = false }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!incidentId) return;
    const colName = isPublic ? 'liveUpdates' : 'messages';
    const q = query(collection(db, 'incidents', incidentId, colName), orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      setMessages(data);
    });
    return () => unsubscribe();
  }, [incidentId, isPublic]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !user) return;
    const colName = isPublic ? 'liveUpdates' : 'messages';
    try {
      await addDoc(collection(db, 'incidents', incidentId, colName), {
        text, uid: user.uid, name: user.displayName || user.email, createdAt: serverTimestamp()
      });
      setText('');
    } catch (err) {
      console.error("Error sending message", err);
    }
  };

  if (isAdmin && !isPublic) {
    return (
      <div className="bg-slate border border-slate-border rounded-xl h-full min-h-[300px] flex items-center justify-center text-slate-500 p-6 text-center">
        🔒 Private coordination chat is encrypted and hidden from administrative oversight.
      </div>
    );
  }

  return (
    <div className="bg-slate border border-slate-border rounded-xl flex flex-col h-[400px] shadow-lg overflow-hidden">
      <div className="p-4 border-b border-slate-border bg-slate-light">
        <h4 className="font-bold text-white m-0 flex items-center gap-2 text-sm">
          {isPublic ? (
            <><span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse"></span> Public Live Updates</>
          ) : (
            <><span className="w-2 h-2 rounded-full bg-accent-amber animate-pulse"></span> Private Coordination Chat</>
          )}
        </h4>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="text-slate-500 m-auto text-sm">No {isPublic ? 'updates' : 'messages'} yet.</div>
        ) : (
          <AnimatePresence>
            {messages.map(msg => {
              const isMe = msg.uid === user?.uid;
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id} 
                  className={`max-w-[85%] ${isMe ? 'self-end' : 'self-start'}`}
                >
                  <div className={`text-[10px] text-slate-500 mb-1 ${isMe ? 'text-right' : 'text-left'}`}>
                    {msg.name}
                  </div>
                  <div className={`p-3 text-sm leading-relaxed ${isMe ? 'bg-accent-blue text-white rounded-t-xl rounded-bl-xl' : 'bg-navy border border-slate-border text-slate-200 rounded-t-xl rounded-br-xl'}`}>
                    {msg.text}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
      
      {(!isAdmin || isPublic) && (
        <form onSubmit={handleSend} className="flex border-t border-slate-border p-2 bg-navy">
          <input 
            type="text" 
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isPublic ? "Broadcast live update..." : "Send private message..."}
            className="flex-1 bg-transparent text-white p-2 outline-none text-sm"
          />
          <button type="submit" className="text-accent-blue p-2 hover:bg-slate-light rounded transition">
            <Send size={18} />
          </button>
        </form>
      )}
    </div>
  );
}
