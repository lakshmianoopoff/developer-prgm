import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, ChevronDown, ChevronUp, Loader2, Volume2, Square } from 'lucide-react';
import { translateIncidentText } from '../services/gemini';
import ChatBox from './ChatBox';

const LANG_MAP = {
  EN: 'English',
  ML: 'Malayalam',
  HI: 'Hindi',
  TA: 'Tamil',
  KN: 'Kannada',
  AR: 'Arabic'
};

const TTS_LANG_MAP = {
  EN: 'en-IN',
  ML: 'ml-IN',
  HI: 'hi-IN',
  TA: 'ta-IN',
  KN: 'kn-IN',
  AR: 'ar-SA'
};

export default function ResponderIncidentCard({ 
  incident, 
  isAssigned, 
  dist, 
  onStatusUpdate, 
  onAssignSelf,
  globalLang,
  setGlobalLang
}) {
  const [expanded, setExpanded] = useState(false);
  const [translations, setTranslations] = useState({
    EN: {
      description: incident.description || 'No description provided.',
      instructions: incident.geminiTriage?.instructions || []
    }
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const utteranceRef = useRef(null);

  const activeTranslation = translations[globalLang] || translations['EN'];

  // Handle translation when globalLang changes
  useEffect(() => {
    if (globalLang === 'EN' || translations[globalLang]) {
      setTranslationError(false);
      return;
    }

    let isMounted = true;
    const fetchTranslation = async () => {
      setIsTranslating(true);
      setTranslationError(false);
      try {
        const [translatedDesc, translatedInst] = await Promise.all([
          translateIncidentText(incident.description || 'No description provided.', LANG_MAP[globalLang]),
          translateIncidentText((incident.geminiTriage?.instructions || []).join('\n'), LANG_MAP[globalLang])
        ]);

        if (isMounted) {
          setTranslations(prev => ({
            ...prev,
            [globalLang]: {
              description: translatedDesc,
              instructions: translatedInst.split('\n').filter(line => line.trim() !== '')
            }
          }));
        }
      } catch (error) {
        console.error("Translation failed:", error);
        if (isMounted) {
          setTranslationError(true);
          // If translation fails, revert back to EN pill
          setGlobalLang('EN');
        }
      } finally {
        if (isMounted) setIsTranslating(false);
      }
    };

    fetchTranslation();
    return () => { isMounted = false; };
  }, [globalLang, incident.description, incident.geminiTriage?.instructions, setGlobalLang, translations]);

  // Clean up speech synthesis when unmounting or switching languages/cards
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    // If language changes while playing, restart speech
    if (isPlaying) {
      speakDescription();
    }
  }, [globalLang]);

  const speakDescription = () => {
    if (!window.speechSynthesis) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();

    const textToSpeak = `${incident.title}, ${activeTranslation.description}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    utterance.lang = TTS_LANG_MAP[globalLang] || 'en-IN';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const targetLangPrefix = utterance.lang.split('-')[0];
    let matchingVoice = voices.find(v => v.lang.startsWith(targetLangPrefix));
    
    if (!matchingVoice) {
      matchingVoice = voices.find(v => v.lang.startsWith('en'));
    }
    
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const isCritical = incident.severity === 'critical';
  const borderColor = isCritical ? 'border-[#FF3B3B]' : incident.severity === 'moderate' ? 'border-[#F59E0B]' : 'border-[#22D3A0]';
  const isRtl = globalLang === 'AR';

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

      {/* Language Toggle Row */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto custom-scrollbar pb-2">
        {Object.keys(LANG_MAP).map(lang => {
          const isSelected = globalLang === lang;
          const isLoadingThis = isTranslating && isSelected;
          
          let btnClass = "px-[10px] py-[3px] rounded-[4px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1";
          let inlineStyle = { fontFamily: '"JetBrains Mono", monospace', fontSize: '10px' };
          
          if (isLoadingThis) {
            btnClass += " bg-transparent";
            inlineStyle = { ...inlineStyle, border: '1px solid #F59E0B', color: '#F59E0B' };
          } else if (isSelected) {
            btnClass += " bg-[rgba(59,130,246,0.15)]";
            inlineStyle = { ...inlineStyle, border: '1px solid #3B82F6', color: '#3B82F6' };
          } else {
            btnClass += " bg-[#0A0C10] hover:bg-[#111318]";
            inlineStyle = { ...inlineStyle, border: '1px solid #1E2230', color: '#5A6478' };
          }

          return (
            <button 
              key={lang} 
              onClick={() => {
                setGlobalLang(lang);
                localStorage.setItem('resq_responder_lang', lang);
              }}
              className={btnClass}
              style={inlineStyle}
              disabled={isTranslating}
            >
              {lang} {isLoadingThis && <Loader2 size={10} className="animate-spin" />}
            </button>
          );
        })}
        <div className="w-[1px] h-[14px] bg-[#1E2230] mx-1 shrink-0"></div>
        {window.speechSynthesis && (
          <button
            onClick={speakDescription}
            title="Listen to description"
            className={`w-[32px] h-[32px] rounded-full flex items-center justify-center shrink-0 transition-all ${
              isPlaying 
                ? 'bg-[rgba(34,211,160,0.15)] border border-[#22D3A0] shadow-[0_0_10px_rgba(34,211,160,0.5)] animate-pulse text-[#22D3A0]' 
                : isTranslating
                ? 'bg-[rgba(245,158,11,0.15)] border border-[#F59E0B] text-[#F59E0B]'
                : 'bg-[#1E2230] border border-[#2A3040] text-white hover:bg-[#2A3040]'
            }`}
          >
            {isTranslating ? <Loader2 size={14} className="animate-spin" /> : isPlaying ? <Square size={12} fill="currentColor" /> : <Volume2 size={14} />}
          </button>
        )}
        <div className="ml-auto text-[#5A6478] text-[9px] shrink-0 whitespace-nowrap" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>
          Powered by Gemini
        </div>
      </div>

      {/* Description Text Area */}
      <div 
        className="bg-[#0A0C10] border border-[#1E2230] rounded-[4px] p-[10px_12px] min-h-[60px] relative mb-4 transition-all"
        style={{ fontFamily: '"Instrument Sans", sans-serif', fontSize: '14px', color: '#E8EDF5', lineHeight: '1.7', direction: isRtl ? 'rtl' : 'ltr', textAlign: isRtl ? 'right' : 'left' }}
      >
        {isTranslating ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-gradient-to-r from-[#1E2230] to-[#2A3040] rounded w-full"></div>
            <div className="h-3 bg-gradient-to-r from-[#1E2230] to-[#2A3040] rounded w-5/6"></div>
            <div className="h-3 bg-gradient-to-r from-[#1E2230] to-[#2A3040] rounded w-4/6"></div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {activeTranslation.description}
          </motion.div>
        )}
      </div>
      
      {translationError && (
        <div className="text-[#5A6478] text-[11px] mb-4" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>
          Translation unavailable
        </div>
      )}

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
                    style={{ direction: isRtl ? 'rtl' : 'ltr', textAlign: isRtl ? 'right' : 'left' }}
                  >
                    <div className="text-[#5A6478] text-xs uppercase tracking-widest mb-3" style={{ fontFamily: '"JetBrains Mono", monospace' }}>AI Instructions</div>
                    {isTranslating ? (
                      <div className="space-y-2 animate-pulse">
                        <div className="h-3 bg-gradient-to-r from-[#1E2230] to-[#2A3040] rounded w-full"></div>
                        <div className="h-3 bg-gradient-to-r from-[#1E2230] to-[#2A3040] rounded w-5/6"></div>
                      </div>
                    ) : (
                      <ol className={`list-decimal text-sm text-[#E8EDF5] space-y-2 ${isRtl ? 'pr-4' : 'pl-4'}`} style={{ fontFamily: '"Instrument Sans", sans-serif' }}>
                        {activeTranslation.instructions.map((inst, i) => <li key={i}>{inst.replace(/^\d+\.\s*/, '')}</li>)}
                      </ol>
                    )}
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
