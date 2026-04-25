import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, ChevronDown, ChevronUp, Loader2, Volume2, Square } from 'lucide-react';
import { translateIncidentText, GEMINI_API_KEY } from '../services/gemini';
import ChatBox from './ChatBox';

export default function ResponderIncidentCard({ 
  incident, 
  isAssigned, 
  dist, 
  onStatusUpdate, 
  onAssignSelf
}) {
  const [expanded, setExpanded] = useState(false);
  const [displayedDescription] = useState(incident.description || 'No description provided.');
  const [displayedInstructions] = useState(incident.geminiTriage?.instructions || []);
  
  const isCritical = incident.severity === 'critical';
  const borderColor = isCritical ? 'border-[#FF3B3B]' : incident.severity === 'moderate' ? 'border-[#F59E0B]' : 'border-[#22D3A0]';

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-[#111318] border-l-[4px] ${borderColor} border-y border-r border-[#1E2230] rounded-r-xl p-6 mb-4 relative`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold mb-2 text-[#E8EDF5]" style={{ fontFamily: '"Syne", sans-serif' }}>{incident.title}</h3>
          <div className="flex items-center gap-4 my-2 text-[#5A6478] text-sm">
            <span className="flex items-center gap-1">
              <MapPin size={16} className="text-[#3B82F6]" /> {incident.location}
            </span>
            {dist && (
              <span className="text-[#F59E0B] bg-[rgba(245,158,11,0.1)] px-2 py-1 rounded flex items-center gap-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                <Navigation size={14} /> {dist} km away
              </span>
            )}
            <span className="text-[#5A6478] text-xs" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>
              {new Date(incident.createdAt?.toDate?.() || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-[#0A0C10] border border-[#1E2230] px-3 py-1 rounded text-xs capitalize text-[#5A6478]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              {incident.type}
            </span>
            <span className="bg-[#0A0C10] border border-[#1E2230] px-3 py-1 rounded text-xs capitalize text-[#5A6478]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              {incident.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>



      {/* Description Text Area */}
      <div 
        className={`bg-[#0A0C10] border border-[#1E2230] rounded-[4px] p-[10px_12px] min-h-[60px] relative mb-4 transition-all`}
        style={{ fontFamily: '"Instrument Sans", sans-serif', fontSize: '14px', color: '#E8EDF5', lineHeight: '1.7', textAlign: 'left' }}
      >
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          {displayedDescription}
        </motion.div>
      </div>
      


      {/* Assigned Controls & Content */}
      {isAssigned ? (
        <>
          <div className="mt-4 flex gap-3">
            <button 
              className={`flex-1 py-3 rounded-[4px] font-bold transition-all text-sm ${incident.status === 'assigned' || incident.status === 'in_progress' ? 'bg-[#3B82F6] text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-transparent border border-[#1E2230] text-[#5A6478] hover:bg-[#1E2230]'}`}
              onClick={() => onStatusUpdate(incident.id, 'in_progress')}
              style={{ fontFamily: '"Instrument Sans", sans-serif' }}
            >
              {incident.status === 'assigned' || incident.status === 'in_progress' ? 'Respond (En Route)' : 'En Route'}
            </button>
            <button 
              className="flex-1 py-3 rounded-[4px] font-bold transition-all border border-[#22D3A0] text-[#22D3A0] hover:bg-[rgba(34,211,160,0.1)] text-sm"
              onClick={() => onStatusUpdate(incident.id, 'resolved')}
              style={{ fontFamily: '"Instrument Sans", sans-serif' }}
            >
              Mark Resolved ✓
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-[#1E2230]">
            <button 
              className="flex items-center gap-2 text-[#3B82F6] hover:text-blue-400 transition text-sm font-semibold mb-4"
              onClick={() => setExpanded(!expanded)}
              style={{ fontFamily: '"Instrument Sans", sans-serif' }}
            >
              {expanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
              Coordination Hub
            </button>
            
            <AnimatePresence>
              {expanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden flex flex-col gap-6"
                >
                  <div 
                    className="p-4 bg-[#0A0C10] rounded-lg border border-[#1E2230]"
                  >
                    <div className="text-[#5A6478] text-xs uppercase tracking-widest mb-3" style={{ fontFamily: '"JetBrains Mono", monospace' }}>AI Instructions</div>
                    <ol className={`list-decimal text-sm text-[#E8EDF5] space-y-2 pl-4`} style={{ fontFamily: '"Instrument Sans", sans-serif' }}>
                      {displayedInstructions.map((inst, i) => <li key={i}>{typeof inst === 'string' ? inst.replace(/^\d+\.\s*/, '') : inst}</li>)}
                    </ol>
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <ChatBox incidentId={incident.id} isPublic={true} />
                    </div>
                    <div className="flex-1">
                      <ChatBox incidentId={incident.id} isPublic={false} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      ) : (
        <button 
          className="w-full mt-2 py-3 rounded-[4px] font-bold transition-all border border-[#1E2230] text-[#E8EDF5] hover:bg-[#1E2230] text-sm"
          onClick={() => onAssignSelf(incident.id)}
          style={{ fontFamily: '"Instrument Sans", sans-serif' }}
        >
          Click to take assignment
        </button>
      )}
    </motion.div>
  );
}
