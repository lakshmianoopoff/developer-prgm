import { useState, useEffect } from 'react';
import { updateDoc, doc, getDoc } from 'firebase/firestore';
import { MapPin, ChevronDown, ChevronUp, Navigation, Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import MapEmbed from '../components/MapEmbed';
import ChatBox from '../components/ChatBox';
import { useAuth } from '../hooks/useAuth';
import { useIncidents } from '../hooks/useIncidents';
import { db } from '../services/firebase';
import { updateIncidentStatus } from '../services/incidents';
import { motion, AnimatePresence } from 'framer-motion';

export default function Responder() {
  const { user } = useAuth();
  const { incidents, loading } = useIncidents();
  const [available, setAvailable] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [myLocation, setMyLocation] = useState(null);

  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'responders', user.uid)).then(docSnap => {
        if (docSnap.exists()) {
          setAvailable(docSnap.data().available);
        }
      });
    }
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(pos => {
        setMyLocation([pos.coords.latitude, pos.coords.longitude]);
      });
    }
  }, [user]);

  const toggleAvailability = async () => {
    const newVal = !available;
    setAvailable(newVal);
    await updateDoc(doc(db, 'responders', user.uid), { available: newVal });
  };

  const handleStatusUpdate = async (incidentId, newStatus) => {
    await updateIncidentStatus(incidentId, newStatus);
    if (newStatus === 'resolved') {
      await updateDoc(doc(db, 'responders', user.uid), {
        available: true,
        currentIncident: null
      });
      setAvailable(true);
    }
  };

  const calculateDistance = (coord1, coord2) => {
    if (!coord1 || !coord2) return null;
    const R = 6371; // km
    const dLat = (coord2[0] - coord1[0]) * Math.PI / 180;
    const dLon = (coord2[1] - coord1[1]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coord1[0] * Math.PI / 180) * Math.cos(coord2[0] * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(2);
  };

  if (loading) return <div className="min-h-screen bg-navy flex items-center justify-center text-slate-400"><Loader2 className="animate-spin" size={32} /></div>;

  const assignedIncidents = incidents.filter(i => i.assignedTo === user.uid && i.status !== 'resolved');
  const activeIncidents = incidents
    .filter(i => i.status !== 'resolved')
    .sort((a,b) => {
       const sevMap = { critical: 3, moderate: 2, minor: 1 };
       return (sevMap[b.severity] || 0) - (sevMap[a.severity] || 0);
    });

  const mapMarkers = activeIncidents.map(inc => {
    if (inc.coordinates) {
      return { position: [inc.coordinates.lat, inc.coordinates.lng], title: inc.title, severity: inc.severity, type: inc.type };
    }
    return null;
  }).filter(Boolean);

  return (
    <div className="bg-navy min-h-screen pb-12">
      <Navbar title="Responder Panel">
        <div className="flex items-center gap-2 mr-4 bg-slate-light px-3 py-1.5 rounded-full border border-slate-border">
          <span className="text-slate-400 text-xs uppercase tracking-wider font-bold">Status</span>
          <button 
            onClick={toggleAvailability}
            className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-2 ${available ? 'bg-accent-green text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-transparent text-slate-400 border border-slate-border hover:bg-slate-border'}`}
          >
            {available && <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse"></span>}
            {available ? 'Available' : 'Busy'}
          </button>
        </div>
      </Navbar>
      
      <div className="max-w-[1600px] mx-auto p-6 flex flex-wrap gap-8">
        
        {/* Left Section - Assigned & Maps */}
        <div className="flex-[1_1_60%] min-w-[400px] flex flex-col gap-8">
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate border border-slate-border rounded-xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-border bg-slate-light flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse"></span>
              <h3 className="m-0 text-white font-bold text-sm uppercase tracking-wider">Live Campus Map</h3>
            </div>
            <MapEmbed markers={mapMarkers} userLocation={myLocation} style={{ height: '350px', width: '100%' }} />
          </motion.div>

          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              My Assigned Tasks 
              {assignedIncidents.length > 0 && <span className="bg-accent-red text-white text-xs px-2 py-0.5 rounded-full">{assignedIncidents.length}</span>}
            </h2>
            
            {assignedIncidents.length === 0 ? (
              <div className="bg-slate border border-slate-border border-dashed rounded-xl p-12 text-center text-slate-500">
                No active incidents assigned to you. Stand by.
              </div>
            ) : (
              <AnimatePresence>
                {assignedIncidents.map(inc => {
                  const dist = calculateDistance(myLocation, inc.coordinates ? [inc.coordinates.lat, inc.coordinates.lng] : null);
                  const isCritical = inc.severity === 'critical';
                  const borderColor = isCritical ? 'border-accent-red' : inc.severity === 'moderate' ? 'border-accent-amber' : 'border-accent-green';
                  
                  return (
                    <motion.div 
                      key={inc.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`bg-slate border-l-4 ${borderColor} border-y border-r border-slate-border rounded-r-xl p-6 mb-4 shadow-lg`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold mb-2 text-white">{inc.title}</h3>
                          <div className="flex items-center gap-4 my-3 text-slate-400 text-sm">
                            <span className="flex items-center gap-1">
                              <MapPin size={16} className="text-accent-blue" /> {inc.location}
                            </span>
                            {dist && (
                              <span className="mono-text text-accent-amber bg-accent-amber/10 px-2 py-1 rounded flex items-center gap-1">
                                <Navigation size={14} /> {dist} km away
                              </span>
                            )}
                          </div>
                          <span className="bg-navy border border-slate-border px-3 py-1 rounded text-xs capitalize text-slate-300">
                            {inc.type}
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 flex gap-3">
                        <button 
                          className={`flex-1 py-3 rounded font-bold transition ${inc.status === 'assigned' ? 'bg-accent-blue text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-transparent border border-slate-border text-slate-400 hover:bg-slate-light'}`}
                          onClick={() => handleStatusUpdate(inc.id, 'in_progress')}
                        >
                          {inc.status === 'assigned' ? 'Respond (En Route)' : 'En Route'}
                        </button>
                        <button 
                          className={`flex-1 py-3 rounded font-bold transition border border-accent-green text-accent-green hover:bg-accent-green/10`}
                          onClick={() => handleStatusUpdate(inc.id, 'resolved')}
                        >
                          Mark Resolved ✓
                        </button>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-border">
                        <button 
                          className="flex items-center gap-2 text-accent-blue hover:text-blue-400 transition text-sm font-semibold"
                          onClick={() => setExpandedId(expandedId === inc.id ? null : inc.id)}
                        >
                          {expandedId === inc.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                          Coordination Hub
                        </button>
                        
                        <AnimatePresence>
                          {expandedId === inc.id && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-4 overflow-hidden flex flex-col gap-6"
                            >
                              <div className="mono-text p-4 bg-navy rounded-lg border border-slate-border">
                                <div className="text-slate-500 text-xs uppercase tracking-widest mb-3">AI Instructions</div>
                                <ol className="pl-4 list-decimal marker:text-slate-500 space-y-2 text-sm text-slate-300">
                                  {inc.geminiTriage?.instructions?.map((inst, i) => <li key={i}>{inst}</li>)}
                                </ol>
                              </div>
                              
                              <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1">
                                  <ChatBox incidentId={inc.id} isPublic={true} />
                                </div>
                                <div className="flex-1">
                                  <ChatBox incidentId={inc.id} isPublic={false} />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Right Section - All Active List */}
        <div className="flex-[1_1_300px]">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-red animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
            Active Feed
          </h2>
          
          <div className="bg-slate border border-slate-border rounded-xl overflow-hidden shadow-lg">
            {activeIncidents.length === 0 ? (
               <div className="p-8 text-center text-slate-500">No active incidents. Campus is safe ✓</div>
            ) : (
              <div className="divide-y divide-slate-border">
                {activeIncidents.map(inc => {
                  const isCritical = inc.severity === 'critical';
                  const dotColor = isCritical ? 'bg-accent-red' : inc.severity === 'moderate' ? 'bg-accent-amber' : 'bg-accent-green';
                  return (
                    <motion.div 
                      key={inc.id} 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex items-start p-4 hover:bg-slate-light transition"
                    >
                      <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${dotColor} ${isCritical ? 'animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]' : ''}`}></div>
                      <div className="ml-4">
                        <div className="font-bold text-white text-sm mb-1">{inc.title}</div>
                        <div className="text-slate-400 text-xs flex items-center gap-1">
                          <MapPin size={12} /> {inc.location}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
