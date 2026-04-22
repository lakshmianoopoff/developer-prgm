import { useState, useEffect, useRef } from 'react';
import { Navigation, Send, AlertTriangle, Clock, MapPin, Mic } from 'lucide-react';
import Navbar from '../components/Navbar';
import TriageResult from '../components/TriageResult';
import MapEmbed from '../components/MapEmbed';
import ChatBox from '../components/ChatBox';
import { analyzeIncident, refineDescription } from '../services/gemini';
import { createIncident } from '../services/incidents';
import { useAuth } from '../hooks/useAuth';
import { useIncidents } from '../hooks/useIncidents';
import { motion } from 'framer-motion';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

const INCIDENT_TYPES = [
  { id: 'security', label: '🚨 Security' },
  { id: 'fire', label: '🔥 Fire' },
  { id: 'medical', label: '🏥 Medical' },
  { id: 'maintenance', label: '🔧 Maintenance' },
  { id: 'other', label: '⚠️ Other' }
];

export default function Report() {
  const { user } = useAuth();
  const { incidents } = useIncidents();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('security');
  const [locationStr, setLocationStr] = useState('');
  const [coords, setCoords] = useState(null);
  const [notes, setNotes] = useState('');
  const [time, setTime] = useState(new Date());
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [triageResult, setTriageResult] = useState(null);
  const [expandedReportId, setExpandedReportId] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setHasSpeechSupport(false);
    }
  }, []);

  const handleMicClick = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    const recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onstart = () => setIsRecording(true);

    let finalTranscript = '';

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (final) {
        finalTranscript += final;
      }
      setDescription(finalTranscript || interim);
    };

    recognition.onerror = (e) => {
      console.error("Speech error", e);
      setIsRecording(false);
    };

    recognition.onend = async () => {
      setIsRecording(false);
      if (finalTranscript) {
        setIsProcessingVoice(true);
        const refined = await refineDescription(finalTranscript);
        setDescription(refined);
        setIsProcessingVoice(false);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const reverseGeocode = async (lat, lon) => {
    setLocationStr('Fetching address...');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await res.json();
      setLocationStr(data.display_name || `Lat: ${lat.toFixed(4)}, Lng: ${lon.toFixed(4)}`);
    } catch (e) {
      setLocationStr(`Lat: ${lat.toFixed(4)}, Lng: ${lon.toFixed(4)}`);
    }
  };

  const handleUseLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setCoords([lat, lon]);
        reverseGeocode(lat, lon);
      });
    }
  };

  const handleMapClick = (latlng) => {
    setCoords(latlng);
    reverseGeocode(latlng[0], latlng[1]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const triage = await analyzeIncident(title, type, description, locationStr);
      
      const incidentData = {
        title,
        description,
        location: locationStr,
        coordinates: coords ? { lat: coords[0], lng: coords[1] } : null,
        type,
        notes,
        reportedBy: user.uid,
        reporterName: user.displayName || user.email,
        severity: triage.severity || 'moderate', 
      };
      
      const id = await createIncident(incidentData, triage);
      
      // Auto-generate system message
      await addDoc(collection(db, 'incidents', id, 'liveUpdates'), {
        text: `SYSTEM LOG: Initial report received. Incident categorised as ${type.toUpperCase()}. Units notified and standby initiated.`,
        uid: 'system',
        name: 'ResQ System',
        createdAt: serverTimestamp()
      });
      
      // Trigger backend geofencing alert logic
      if (coords) {
         fetch('http://localhost:4000/api/trigger-alerts', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ incidentId: id, title, severity: incidentData.severity, type, coordinates: incidentData.coordinates })
         }).catch(err => console.error("Alert trigger failed", err));
      }
      
      setTriageResult({ ...triage, incidentId: id });
    } catch (error) {
      console.error("Failed to submit incident", error);
      alert("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const myPastIncidents = (incidents || []).filter(i => i.reportedBy === user.uid);

  return (
    <div className="bg-navy min-h-screen">
      <Navbar title="Report an Incident">
        <div className="mono-text text-lg flex items-center gap-2 text-slate-300 mr-4">
          <Clock size={18} className="text-accent-blue" />
          {time.toLocaleTimeString()}
        </div>
      </Navbar>
      
      <div className="max-w-7xl mx-auto p-6 flex gap-8 flex-wrap items-start">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 min-w-[400px]">
          {!triageResult ? (
            <form className="bg-slate border border-slate-border rounded-xl p-6 shadow-lg" onSubmit={handleSubmit}>
              <h2 className="text-2xl font-bold mb-6">Incident Details</h2>
              
              <input 
                type="text" 
                className="w-full bg-navy border border-slate-border text-white p-3 rounded mb-4 focus:outline-none focus:border-accent-blue transition" 
                placeholder="Incident Title" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                required 
              />
              
              <div className="relative mb-4">
                <textarea 
                  className="w-full bg-navy border border-slate-border text-white p-3 rounded focus:outline-none focus:border-accent-blue transition custom-scrollbar" 
                  placeholder="What happened?" 
                  rows="4" 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  required
                />
                {hasSpeechSupport && (
                  <button
                    type="button"
                    onClick={handleMicClick}
                    className={`absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isRecording ? 'bg-[#FF3B3B] border border-[#FF3B3B]' : 'bg-[#1E2230] border border-[#2A3040] hover:bg-slate-border'}`}
                    title="Dictate description"
                  >
                    <Mic size={14} className={`text-white ${isRecording ? 'animate-pulse' : ''}`} />
                  </button>
                )}
                {isRecording && (
                  <div className="text-[#FF3B3B] text-[12px] mt-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    🔴 Listening... speak now
                  </div>
                )}
                {isProcessingVoice && (
                  <div className="text-[#3B82F6] text-[12px] mt-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    ⚡ Gemini is refining your description...
                  </div>
                )}
              </div>
              
              <div className="mb-4">
                <label className="block text-slate-400 mb-2">Incident Type</label>
                <div className="flex flex-wrap gap-2">
                  {INCIDENT_TYPES.map(t => (
                    <button 
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      className={`px-4 py-2 rounded border transition ${type === t.id ? 'bg-accent-blue text-white border-accent-blue' : 'bg-transparent border-slate-border text-slate-300 hover:bg-slate-light'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  className="flex-1 bg-navy border border-slate-border text-white p-3 rounded focus:outline-none focus:border-accent-blue transition" 
                  placeholder="Location (e.g., Library 2nd Floor)" 
                  value={locationStr} 
                  onChange={e => setLocationStr(e.target.value)} 
                  required 
                />
                <button type="button" className="px-4 py-2 bg-slate-light border border-slate-border rounded hover:bg-slate-border transition flex items-center gap-2" onClick={handleUseLocation}>
                  <Navigation size={16} /> <span className="hidden sm:inline">Use Location</span>
                </button>
              </div>
              
              <div className="mb-4 rounded-xl overflow-hidden border border-slate-border h-[250px]">
                <MapEmbed 
                  center={coords || [10.3546, 76.2133]} 
                  userLocation={coords} 
                  onMapClick={handleMapClick} 
                  isReportMode={true} 
                  zoom={coords ? 16 : 14} 
                />
              </div>
              
              <textarea 
                className="w-full bg-navy border border-slate-border text-white p-3 rounded mb-4 focus:outline-none focus:border-accent-blue transition" 
                placeholder="Additional notes (optional)" 
                rows="2" 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
              />
              
              <button type="submit" className="w-full bg-accent-blue text-white py-3 rounded font-bold hover:bg-blue-600 transition flex justify-center items-center gap-2" disabled={isSubmitting}>
                {isSubmitting ? 'Gemini is analysing your report...' : 'Submit & Analyse with AI'}
                {!isSubmitting && <Send size={18} />}
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-6">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-accent-green/10 border border-accent-green rounded-xl p-6">
                <div className="flex gap-4 items-center">
                  <AlertTriangle className="text-accent-green" size={32} />
                  <div>
                    <h3 className="text-accent-green text-xl font-bold m-0">Incident Broadcasted</h3>
                    <p className="text-slate-300 mt-1">Backend geofencing alerts dispatched to users within 5km.</p>
                  </div>
                </div>
              </motion.div>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate border border-slate-border rounded-xl p-6 shadow-lg">
                 <div className="flex justify-between items-center border-b border-slate-border pb-3 mb-4">
                   <h2 className="text-xl font-bold text-white m-0">Reported Incident</h2>
                   <button 
                     onClick={() => {
                        setTriageResult(null);
                        setTitle('');
                        setDescription('');
                        setLocationStr('');
                        setNotes('');
                        setCoords(null);
                     }}
                     className="bg-accent-blue text-white font-bold text-xs px-3 py-1.5 rounded hover:bg-blue-600 transition"
                   >
                     + New Report
                   </button>
                 </div>
                 <div className="grid grid-cols-2 gap-4 text-sm">
                   <div><span className="text-slate-400">Title:</span> <span className="text-white font-bold ml-1">{title}</span></div>
                   <div><span className="text-slate-400">Category:</span> <span className="text-white font-bold ml-1 uppercase">{type}</span></div>
                   <div className="col-span-2"><span className="text-slate-400">Location:</span> <span className="text-white font-mono ml-1 bg-navy px-2 py-1 rounded">{locationStr}</span></div>
                   <div className="col-span-2 mt-2">
                     <span className="text-slate-400 mb-1 block">Description provided:</span> 
                     <p className="text-slate-300 bg-navy p-3 rounded border border-slate-border">{description}</p>
                   </div>
                 </div>
              </motion.div>
              
              <TriageResult triage={triageResult} />
            </div>
          )}
        </motion.div>

        {triageResult && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 min-w-[350px] flex flex-col gap-6">
            <ChatBox incidentId={triageResult.incidentId} isPublic={true} />
            <ChatBox incidentId={triageResult.incidentId} isPublic={false} />
          </motion.div>
        )}

        {!triageResult && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 min-w-[350px]">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Clock size={24} className="text-accent-blue" /> My Past Reports
            </h2>
            {myPastIncidents.length === 0 ? (
              <div className="bg-slate border border-slate-border border-dashed rounded-xl p-8 text-center text-slate-500">
                You have not submitted any reports yet.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {myPastIncidents.map(inc => (
                  <motion.div 
                    key={inc.id}
                    className="bg-slate border border-slate-border rounded-xl p-4 hover:border-accent-blue transition shadow-lg overflow-hidden flex flex-col"
                  >
                    <div className="cursor-pointer" onClick={() => {
                      setTitle(inc.title);
                      setType(inc.type);
                      setLocationStr(inc.location);
                      setDescription(inc.description);
                      setTriageResult({ ...inc.geminiTriage, incidentId: inc.id });
                    }}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-white text-base">{inc.title}</h4>
                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${inc.status === 'resolved' ? 'bg-accent-green/20 text-accent-green' : inc.status === 'assigned' || inc.status === 'in_progress' ? 'bg-accent-blue/20 text-accent-blue' : 'bg-accent-amber/20 text-accent-amber'}`}>
                          {inc.status}
                        </span>
                      </div>
                      <div className="text-slate-400 text-xs flex items-center gap-1 mt-2">
                         <MapPin size={12} className="text-slate-500" /> {inc.location}
                      </div>
                    </div>
                    
                    {inc.status === 'resolved' && inc.closureReport && (
                      <div className="mt-3 pt-3 border-t border-slate-border">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedReportId(expandedReportId === inc.id ? null : inc.id);
                          }}
                          className="text-[#22D3A0] text-[12px] hover:underline flex items-center gap-1"
                          style={{ fontFamily: '"JetBrains Mono", monospace' }}
                        >
                          See closure report {expandedReportId === inc.id ? '▴' : '▾'}
                        </button>
                        
                        {expandedReportId === inc.id && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }} 
                            animate={{ height: 'auto', opacity: 1 }} 
                            className="mt-3 bg-[#0A0C10] border border-[#1E2230] p-3 rounded-lg relative overflow-hidden"
                          >
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#22D3A0]/0 via-[#22D3A0] to-[#22D3A0]/0"></div>
                            <p className="text-[#22D3A0] text-[11px] whitespace-pre-wrap" style={{ fontFamily: '"JetBrains Mono", monospace', lineHeight: '1.6' }}>
                              {inc.closureReport}
                            </p>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
