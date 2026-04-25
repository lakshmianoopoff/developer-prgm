import { useState, useEffect } from 'react';
import { updateDoc, doc, getDoc } from 'firebase/firestore';
import { MapPin, ChevronDown, ChevronUp, Navigation, Loader2, Plus, Bell, BellOff } from 'lucide-react';
import Navbar from '../components/Navbar';
import MapEmbed from '../components/MapEmbed';
import ChatBox from '../components/ChatBox';
import { useAuth } from '../hooks/useAuth';
import { useIncidents } from '../hooks/useIncidents';
import { db } from '../services/firebase';
import { updateIncidentStatus } from '../services/incidents';
import { motion, AnimatePresence } from 'framer-motion';
import ResponderIncidentCard from '../components/ResponderIncidentCard';
import ReportModal from '../components/ReportModal';
import { playCriticalAlert, playModerateAlert } from '../utils/audio';

export default function Responder() {
  const { user } = useAuth();

  const handleNewIncident = (incident) => {
    const isMuted = localStorage.getItem('resq_muted') === 'true';
    if (incident.severity === 'critical') {
      if (!isMuted) playCriticalAlert();
    } else if (incident.severity === 'moderate') {
      if (!isMuted) playModerateAlert();
    }
  };

  const { incidents, loading } = useIncidents({ onNewIncident: handleNewIncident });
  const [available, setAvailable] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [myLocation, setMyLocation] = useState(null);
  const [sector, setSector] = useState(localStorage.getItem('responderSector') || 'all');

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

  const handleSectorChange = (newSector) => {
    setSector(newSector);
    localStorage.setItem('responderSector', newSector);
  };

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

  const handleAssignSelf = async (incidentId) => {
    await updateDoc(doc(db, 'incidents', incidentId), {
      assignedTo: user.uid,
      status: 'assigned'
    });
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

  const assignedIncidents = incidents.filter(i => {
    if (i.status === 'resolved') return false;
    if (i.assignedTo === user.uid) return true;
    if (sector !== 'all' && i.type === sector) return true;
    return false;
  });

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
        <div className="flex items-center gap-4 mr-4">
          <select 
            value={sector}
            onChange={(e) => handleSectorChange(e.target.value)}
            className="bg-slate-light border border-slate-border text-white px-3 py-1.5 rounded-full text-xs font-bold outline-none"
          >
            <option value="all" className="bg-navy text-white">All Sectors</option>
            <option value="security" className="bg-navy text-white">Security Sector</option>
            <option value="fire" className="bg-navy text-white">Fire & Rescue Sector</option>
            <option value="medical" className="bg-navy text-white">Medical Sector</option>
            <option value="maintenance" className="bg-navy text-white">Maintenance Sector</option>
          </select>
          <div className="flex items-center gap-2 bg-slate-light px-3 py-1.5 rounded-full border border-slate-border">
            <span className="text-slate-400 text-xs uppercase tracking-wider font-bold">Status</span>
            <button 
              onClick={toggleAvailability}
              className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-2 ${available ? 'bg-accent-green text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-transparent text-slate-400 border border-slate-border hover:bg-slate-border'}`}
            >
              {available && <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse"></span>}
              {available ? 'Available' : 'Busy'}
            </button>
          </div>
          <button 
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-red text-white text-xs font-bold rounded-full hover:bg-red-600 transition shadow-[0_0_10px_rgba(239,68,68,0.3)]"
          >
            <Plus size={14} /> <span className="hidden sm:inline">Report</span>
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
            <div style={{ height: '350px', width: '100%' }}>
               <MapEmbed markers={mapMarkers} userLocation={myLocation} />
            </div>
          </motion.div>

          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              Sector Tasks
              {assignedIncidents.length > 0 && <span className="bg-accent-red text-white text-xs px-2 py-0.5 rounded-full">{assignedIncidents.length}</span>}
            </h2>
            
            {assignedIncidents.length === 0 ? (
              <div className="bg-slate border border-slate-border border-dashed rounded-xl p-12 text-center text-slate-500">
                No active incidents in your sector. Stand by.
              </div>
            ) : (
              <AnimatePresence>
                {assignedIncidents.map(inc => {
                  const dist = calculateDistance(myLocation, inc.coordinates ? [inc.coordinates.lat, inc.coordinates.lng] : null);
                  const isCritical = inc.severity === 'critical';
                  const borderColor = isCritical ? 'border-accent-red' : inc.severity === 'moderate' ? 'border-accent-amber' : 'border-accent-green';
                  
                  return (
                    <ResponderIncidentCard
                      key={inc.id}
                      incident={inc}
                      isAssigned={true}
                      dist={dist}
                      onStatusUpdate={handleStatusUpdate}
                      onAssignSelf={handleAssignSelf}
                    />
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
              <div className="space-y-4">
                {activeIncidents.map(inc => {
                  const dist = calculateDistance(myLocation, inc.coordinates ? [inc.coordinates.lat, inc.coordinates.lng] : null);
                  return (
                    <ResponderIncidentCard
                      key={inc.id}
                      incident={inc}
                      isAssigned={false}
                      dist={dist}
                      onStatusUpdate={handleStatusUpdate}
                      onAssignSelf={handleAssignSelf}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {isReportModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#111318] border border-[#1E2230] rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] overflow-hidden"
            >
              <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
