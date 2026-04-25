import { useState, useEffect } from 'react';
import { Chart } from "react-google-charts";
import Navbar from '../components/Navbar';
import MapEmbed from '../components/MapEmbed';
import ChatBox from '../components/ChatBox';
import ReportModal from '../components/ReportModal';
import ResQAIChat from '../components/ResQAIChat';
import IncidentSidePanel from '../components/IncidentSidePanel';
import { useIncidents } from '../hooks/useIncidents';
import { useAuth } from '../hooks/useAuth';
import { Clock, MapPin, ShieldAlert, Navigation, Loader2, Plus, Bell, BellOff, X } from 'lucide-react';
import { doc, updateDoc, collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { seedDemoData, clearDemoData } from '../services/seedData';
import { playCriticalAlert, playModerateAlert } from '../utils/audio';



function CountdownTimer({ expires }) {
  const [remaining, setRemaining] = useState(Math.max(0, Math.ceil((expires - Date.now()) / 1000)));

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((expires - Date.now()) / 1000)));
    }, 100);
    return () => clearInterval(timer);
  }, [expires]);

  return <span className="text-[#5A6478] text-[11px]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>{remaining}s</span>;
}

export default function Dashboard() {
  const { user, role } = useAuth();
  const [time, setTime] = useState(new Date());
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [closingNote, setClosingNote] = useState('');
  const [personnel, setPersonnel] = useState([]);
  const [closureReportIncident, setClosureReportIncident] = useState(null);
  const [muted, setMuted] = useState(() => localStorage.getItem('resq_muted') === 'true');
  const [toasts, setToasts] = useState([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleSeedData = async () => {
    if (window.confirm("This will populate Firestore with demo data for presentation. Existing data will not be deleted. Continue?")) {
      const id = Date.now();
      setToasts(prev => [...prev, { id, type: 'moderate', incident: { title: 'Seeding demo data...', location: 'Please wait' } }]);
      
      try {
        setIsSeeding(true);
        await seedDemoData();
        setToasts(prev => [...prev, { id: Date.now() + 1, type: 'moderate', incident: { title: '✓ Demo data loaded', location: 'Ready for presentation!' }, success: true }]);
      } catch (e) {
        setToasts(prev => [...prev, { id: Date.now() + 1, type: 'critical', incident: { title: 'Seeding Failed', location: 'Check console for errors' } }]);
      } finally {
        setIsSeeding(false);
      }
    }
  };

  const handleClearData = async () => {
    if (window.confirm("This will delete all demo_ prefixed data from Firestore. Continue?")) {
      try {
        setIsClearing(true);
        await clearDemoData();
        setToasts(prev => [...prev, { id: Date.now(), type: 'moderate', incident: { title: 'Demo data cleared', location: 'Removed successfully' } }]);
      } catch (e) {
        setToasts(prev => [...prev, { id: Date.now(), type: 'critical', incident: { title: 'Clear Failed', location: 'Check console for errors' } }]);
      } finally {
        setIsClearing(false);
      }
    }
  };

  const toggleMute = () => {
    const newMuted = !muted;
    setMuted(newMuted);
    localStorage.setItem('resq_muted', String(newMuted));
  };

  const handleNewIncident = (incident) => {
    const isMuted = localStorage.getItem('resq_muted') === 'true';
    if (incident.severity === 'critical') {
      if (!isMuted) playCriticalAlert();
      
      let flashes = 0;
      const originalTitle = document.title;
      const flashInterval = setInterval(() => {
        document.title = document.title === "🔴 CRITICAL ALERT!" ? "ResQ Command" : "🔴 CRITICAL ALERT!";
        flashes++;
        if (flashes >= 20) {
          clearInterval(flashInterval);
          document.title = originalTitle;
        }
      }, 500);

      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { id, type: 'critical', incident }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 8000);
    } else if (incident.severity === 'moderate') {
      if (!isMuted) playModerateAlert();
      
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { id, type: 'moderate', incident }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 5000);
    }
  };

  const { incidents, loading } = useIncidents({ onNewIncident: handleNewIncident });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, snap => {
      setPersonnel(snap.docs.map(d => d.data()));
    });
    return () => unsub();
  }, []);

  if (loading) return <div className="min-h-screen bg-navy flex items-center justify-center text-slate-400"><Loader2 className="animate-spin" size={32} /></div>;

  const activeIncidents = incidents.filter(i => i.status === 'active' || i.status === 'assigned');
  const inProgressIncidents = incidents.filter(i => i.status === 'in_progress');
  
  const today = new Date();
  today.setHours(0,0,0,0);
  const resolvedToday = incidents.filter(i => {
    if (i.status !== 'resolved' || !i.resolvedAt) return false;
    const resolvedDate = i.resolvedAt.toDate ? i.resolvedAt.toDate() : new Date(i.resolvedAt);
    return resolvedDate >= today;
  });

  const threatColors = {
    medical: '#F59E0B',
    fire: '#FF6B35',
    security: '#FF3B3B',
    maintenance: '#3B82F6',
    other: '#5A6478'
  };

  const typeCount = incidents.reduce((acc, i) => {
    acc[i.type] = (acc[i.type] || 0) + 1;
    return acc;
  }, {});

  const typeData = [
    ["Type", "Count", { role: "style" }],
    ...(Object.keys(typeCount).length ? Object.keys(typeCount).map(k => [
      k.charAt(0).toUpperCase() + k.slice(1), 
      typeCount[k], 
      threatColors[k] || '#5A6478'
    ]) : [["None", 0, '#5A6478']])
  ];

  let peakType = "NONE";
  let peakCount = 0;
  Object.keys(typeCount).forEach(k => {
    if (typeCount[k] > peakCount) {
      peakCount = typeCount[k];
      peakType = k.toUpperCase();
    }
  });
  
  const totalIncidentsToday = incidents.filter(i => {
    if (!i.createdAt) return false;
    const d = i.createdAt.toDate ? i.createdAt.toDate() : new Date(i.createdAt);
    return d.toDateString() === new Date().toDateString();
  }).length;

  const threatChartOptions = {
    backgroundColor: 'transparent',
    chartArea: { width: '100%', height: '80%', left: 20, right: 10, top: 20, bottom: 30 },
    legend: { position: 'none' },
    bar: { groupWidth: '60%' },
    hAxis: { 
      textStyle: { color: '#5A6478', fontSize: 10, fontName: 'JetBrains Mono' }
    },
    vAxis: { 
      textStyle: { color: '#5A6478', fontSize: 10, fontName: 'JetBrains Mono' },
      gridlines: { color: '#1E2230', count: 4 },
      baselineColor: '#1E2230',
      format: '0',
      minValue: 0
    },
    tooltip: { textStyle: { color: '#111318', fontName: 'Instrument Sans' } }
  };

  // 24 Hour Chart Calculation
  const getLast24HoursData = () => {
    const hoursArr = [];
    const now = new Date();
    
    // Initialize last 24 hours ordered chronologically
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourStr = d.toLocaleTimeString([], { hour: '2-digit', hour12: false }) + ':00';
      hoursArr.push({ label: hourStr, critical: 0, moderate: 0, minor: 0, timestamp: d.getTime() });
    }

    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    let totalCritical = 0;
    let totalModerate = 0;
    let totalMinor = 0;

    incidents.forEach(inc => {
      if (!inc.createdAt) return;
      const date = inc.createdAt.toDate ? inc.createdAt.toDate() : new Date(inc.createdAt);
      if (date >= cutoff && date <= now) {
        const bucketIndex = hoursArr.findIndex(b => date.getTime() >= b.timestamp && date.getTime() < b.timestamp + 3600000);
        
        if (bucketIndex !== -1) {
          if (inc.severity === 'critical') {
             hoursArr[bucketIndex].critical++;
             totalCritical++;
          } else if (inc.severity === 'moderate') {
             hoursArr[bucketIndex].moderate++;
             totalModerate++;
          } else {
             hoursArr[bucketIndex].minor++;
             totalMinor++;
          }
        }
      }
    });

    const rows = hoursArr.map((b, index) => [
      (index % 4 === 0) ? b.label : '', 
      b.critical, 
      b.moderate, 
      b.minor
    ]);
    
    return {
      chartData: [['Hour', 'Critical', 'Moderate', 'Minor'], ...rows],
      totals: { critical: totalCritical, moderate: totalModerate, minor: totalMinor }
    };
  };

  const { chartData: lineChartData, totals: last24Totals } = getLast24HoursData();

  const lineChartOptions = {
    backgroundColor: 'transparent',
    chartArea: { width: '100%', height: '80%', left: 20, right: 10, top: 20, bottom: 30 },
    colors: ['#FF3B3B', '#F59E0B', '#22D3A0'],
    legend: { position: 'none' },
    hAxis: { 
      textStyle: { color: '#5A6478', fontSize: 10, fontName: 'JetBrains Mono' },
      gridlines: { color: 'transparent' },
      baselineColor: '#1E2230'
    },
    vAxis: { 
      textStyle: { color: '#5A6478', fontSize: 10, fontName: 'JetBrains Mono' },
      gridlines: { color: '#1E2230', count: 4 },
      baselineColor: '#1E2230',
      minValue: 0,
      format: '0'
    },
    lineWidth: 2,
    pointSize: 3,
    pointShape: 'circle',
    curveType: 'none',
    tooltip: { 
      textStyle: { color: '#111318', fontName: 'Instrument Sans' },
      showColorCode: true 
    }
  };

  const chartOptions = {
    backgroundColor: 'transparent',
    legend: { textStyle: { color: '#94a3b8' } },
    pieSliceBorderColor: 'transparent',
    colors: ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#475569'],
    hAxis: { textStyle: { color: '#94a3b8' }, gridlines: { color: '#2A3347' } },
    vAxis: { textStyle: { color: '#94a3b8' }, gridlines: { color: '#2A3347' } },
  };

  const handleRespond = async (incidentId) => {
    await updateDoc(doc(db, 'incidents', incidentId), {
      status: 'in_progress',
      assignedTo: user.uid,
      assignedName: user.displayName || user.email
    });
    setSelectedIncident(prev => prev ? { ...prev, status: 'in_progress', assignedTo: user.uid, assignedName: user.displayName || user.email } : prev);
  };

  const handleResolve = async (incidentId) => {
    await updateDoc(doc(db, 'incidents', incidentId), {
      status: 'resolved',
      resolvedAt: new Date(),
      closingNote: closingNote
    });
    setSelectedIncident(prev => prev ? { ...prev, status: 'resolved', closingNote } : prev);
    setClosingNote('');
  };

  const criticalActive = activeIncidents.some(i => i.severity === 'critical');

  const mapMarkers = incidents.filter(i => i.status !== 'resolved').map(inc => {
    if (inc.coordinates) {
      return { 
        position: [inc.coordinates.lat, inc.coordinates.lng], 
        title: inc.title, 
        severity: inc.severity, 
        type: inc.type,
        status: inc.status,
        locationName: inc.locationName || inc.location
      };
    }
    return null;
  }).filter(Boolean);

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden print:h-auto print:overflow-visible print:bg-white">
      {/* Toasts Container */}
      <div className="fixed top-[60px] right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={`w-[360px] bg-[#111318] rounded-[8px] p-4 pointer-events-auto shadow-2xl shrink-0 flex flex-col border-y border-r border-l-[4px] relative overflow-hidden ${
                toast.type === 'critical' 
                  ? 'border-[#FF3B3B] animate-borderPulse' 
                  : 'border-[#F59E0B]'
              }`}
            >
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="absolute top-2 right-2 text-[#5A6478] hover:text-white"
              >
                <X size={16} />
              </button>
              <div className="flex justify-between items-center mb-1.5 pr-4">
                <span className={`text-[11px] tracking-[0.1em] uppercase ${toast.type === 'critical' ? 'text-[#FF3B3B]' : toast.success ? 'text-[#22D3A0]' : 'text-[#F59E0B]'}`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  {toast.type === 'critical' ? '🔴 CRITICAL ALERT' : toast.success ? '✓ SUCCESS' : '🟡 NOTIFICATION'}
                </span>
                {toast.expires && (
                  <CountdownTimer expires={toast.expires} />
                )}
              </div>
              <h4 className="text-[#E8EDF5] text-[14px] font-bold my-1.5" style={{ fontFamily: '"Syne", sans-serif' }}>
                {toast.incident.title}
              </h4>
              <p className="text-[#5A6478] text-[12px]" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>
                {toast.incident.location}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {criticalActive && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-accent-red text-white text-center py-2 font-bold uppercase tracking-widest text-sm shadow-[0_0_15px_rgba(239,68,68,0.5)] z-50 relative shrink-0"
          >
            CRITICAL INCIDENT ACTIVE — ALL UNITS BE ADVISED
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Live Event Ticker */}
      <div className="bg-navy border-b-2 border-slate-border py-1.5 overflow-hidden shrink-0 flex items-center shadow-[0_0_10px_rgba(57,255,20,0.1)] relative z-40 print:hidden">
        <div className="animate-ticker text-accent-green font-bold text-[10px] uppercase tracking-widest mono-text whitespace-nowrap">
          {activeIncidents.length > 0 
            ? activeIncidents.map(inc => `[${new Date().toLocaleTimeString()}] ${inc.status === 'in_progress' ? 'RESPONDER EN ROUTE' : 'CRITICAL ALERT'} AT ${inc.locationName || inc.location} - ${inc.title}`).join(' \u00A0\u00A0•\u00A0\u00A0 ')
            : "SYSTEM NORMAL \u00A0\u00A0•\u00A0\u00A0 NO ACTIVE CRITICAL INCIDENTS \u00A0\u00A0•\u00A0\u00A0 MONITORING ALL SECTORS"}
        </div>
      </div>
      
      <div className="shrink-0 print:hidden">
        <Navbar title="Tactical Command">
          <div className="flex items-center gap-4 mr-4">
            <div className="mono-text text-lg flex items-center gap-2 text-slate-300 hidden md:flex">
              <Clock size={18} className="text-accent-blue" />
              {time.toLocaleTimeString()}
            </div>
            <button 
              onClick={toggleMute}
              title={muted ? "Unmute alerts" : "Mute alerts"}
              className="text-[#5A6478] hover:text-[#E8EDF5] transition p-2 flex items-center justify-center bg-transparent border-none cursor-pointer"
            >
              {muted ? <BellOff size={18} /> : <Bell size={18} />}
            </button>
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => { setIsReportModalOpen(true); setSelectedIncidentId(null); }}
              className="tactical-btn flex items-center gap-2 px-4 py-2 bg-accent-red text-white font-bold rounded-sm border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:bg-red-600 transition"
            >
              <Plus size={18} /> <span className="hidden sm:inline">Report Emergency</span>
            </motion.button>
          </div>
        </Navbar>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative print:hidden">
        
        {/* Left Side: Map Container (Edge-to-Edge) */}
        <motion.div 
          layout
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          animate={{ width: isReportModalOpen ? '30%' : '50%' }}
          className="h-full w-full lg:w-auto shrink-0 relative bg-navy border-r-[4px] border-slate-border z-10"
        >
          <div className="absolute inset-0">
            <MapEmbed markers={mapMarkers} style={{ height: '100%', width: '100%' }} />
          </div>
        </motion.div>

        {/* Right Side: Content Area */}
        <motion.div 
          layout
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          animate={{ width: isReportModalOpen ? '70%' : '50%' }}
          className="flex flex-col gap-4 overflow-y-auto custom-scrollbar h-full w-full lg:w-auto p-6 bg-navy relative z-20"
        >
          {isReportModalOpen ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full border-[4px] border-slate-border rounded-sm bg-slate p-2 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
               <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} />
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 h-full">
              {/* Default Dashboard Views */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 shrink-0">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-slate border-[4px] border-slate-border border-l-accent-red rounded-sm p-5 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent-red/5 rounded-full -mr-10 -mt-10 blur-xl"></div>
                  <div className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-1">Active Alerts</div>
                  <div className="text-4xl font-bold text-white mono-text">{activeIncidents.length}</div>
                </motion.div>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-slate border-[4px] border-slate-border border-l-accent-amber rounded-sm p-5 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent-amber/5 rounded-full -mr-10 -mt-10 blur-xl"></div>
                  <div className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-1">Units Engaged</div>
                  <div className="text-4xl font-bold text-white mono-text">{inProgressIncidents.length}</div>
                </motion.div>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-slate border-[4px] border-slate-border border-l-accent-green rounded-sm p-5 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent-green/5 rounded-full -mr-10 -mt-10 blur-xl"></div>
                  <div className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-1">Cleared Today</div>
                  <div className="text-4xl font-bold text-white mono-text">{resolvedToday.length}</div>
                </motion.div>
              </div>
              
              <div className="bg-navy border-[4px] border-slate-border rounded-sm shadow-lg flex-1 min-h-[400px] flex flex-col overflow-hidden relative">
                <div className="p-3 border-b-2 border-slate-border bg-slate flex items-center justify-between shrink-0">
                  <h3 className="text-white font-bold text-xs uppercase tracking-widest m-0 flex items-center gap-2"><span className="w-2 h-2 bg-accent-red animate-pulse rounded-full"></span> Live Data Stream</h3>
                  <div className="mono-text text-[10px] text-slate-500">SYS.VER.4.2.0</div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                  <AnimatePresence>
                    {incidents.length === 0 && <div className="text-center text-slate-500 p-8 mono-text text-sm">NO DATA DETECTED</div>}
                    {incidents.slice(0, 50).map(inc => {
                      const isCritical = inc.severity === 'critical';
                      const dotColor = isCritical ? 'bg-accent-red' : inc.severity === 'moderate' ? 'bg-accent-amber' : 'bg-accent-green';
                      
                      return (
                        <motion.div 
                          layout
                          key={inc.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)", rotateX: 20 }}
                          className={`tactical-btn cursor-pointer bg-slate border-2 border-slate-border rounded-sm p-4 hover:border-slate-400 transition-colors duration-200 group relative overflow-hidden`}
                          onClick={() => setSelectedIncidentId(inc.id)}
                        >
                          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 relative z-10">
                            <div className="flex items-start gap-4">
                              <div className="mt-1 flex items-center justify-center">
                                <div className={`w-3 h-3 rounded-full ${dotColor} ${isCritical && inc.status !== 'resolved' ? 'animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.8)]' : ''}`}></div>
                              </div>
                              <div>
                                <h4 className="font-bold text-white text-base mb-1 group-hover:text-accent-blue transition-colors">{inc.locationName || inc.location}</h4>
                                <div className="text-slate-400 text-sm flex items-center gap-2 mono-text">
                                  <span>{inc.title}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-row md:flex-col items-center md:items-end gap-2 md:gap-1 ml-7 md:ml-0">
                               <span className="mono-text text-[10px] uppercase font-bold text-slate-400 tracking-wider">ID: RQ-{inc.id.substring(0,4)}</span>
                               <div className="flex items-center gap-2">
                                 {inc.status === 'resolved' && inc.closureReport && (
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); setClosureReportIncident(inc); }} 
                                     className="border border-[#22D3A0] text-[#22D3A0] hover:bg-[#22D3A0]/10 px-2 py-0.5 rounded text-[11px] transition-colors" 
                                     style={{ fontFamily: '"JetBrains Mono", monospace' }}
                                   >
                                     View Report
                                   </button>
                                 )}
                                 <span className={`px-2 py-0.5 rounded-sm border text-[10px] uppercase font-bold tracking-wider mono-text ${inc.status === 'resolved' ? 'bg-accent-green/10 text-accent-green border-accent-green/30' : inc.status === 'in_progress' ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/30' : 'bg-accent-amber/10 text-accent-amber border-accent-amber/30'}`}>
                                   {inc.status}
                                 </span>
                               </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </div>
              
              <div className="flex flex-col gap-3 min-h-[250px] shrink-0 pb-6">
                
                {/* ROW 1: Charts */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {/* Threat Vectors */}
                  <div className="bg-[#111318] border border-[#1E2230] rounded-lg p-4 flex flex-col min-h-[200px]">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-[#5A6478] text-[10px] tracking-[0.12em] uppercase" style={{ fontFamily: '"JetBrains Mono", monospace' }}>THREAT VECTORS</h4>
                      <div className="flex gap-4">
                        <span className="text-[#5A6478] text-[11px]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>TOTAL TODAY &nbsp;<span className="text-white font-bold">{totalIncidentsToday}</span></span>
                        <span className="text-[#5A6478] text-[11px]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>PEAK TYPE &nbsp;<span className="text-white font-bold">{peakType}</span></span>
                      </div>
                    </div>
                    <div className="flex-1 w-full min-h-[160px]">
                      <Chart chartType="BarChart" width="100%" height="100%" data={typeData} options={threatChartOptions} />
                    </div>
                  </div>

                  {/* Incidents Last 24H */}
                  <div className="bg-[#111318] border border-[#1E2230] rounded-lg p-4 flex flex-col min-h-[200px]">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-[#5A6478] text-[10px] tracking-[0.12em] uppercase" style={{ fontFamily: '"JetBrains Mono", monospace' }}>INCIDENTS LAST 24H</h4>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-[#FF3B3B]"></div>
                          <span className="text-[#5A6478] text-[11px]" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>Critical</span>
                          <span className="text-[#FF3B3B] text-[13px] font-bold ml-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>{last24Totals.critical}</span>
                        </div>
                        <div className="w-[1px] h-[12px] bg-[#1E2230] mx-1"></div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-[#F59E0B]"></div>
                          <span className="text-[#5A6478] text-[11px]" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>Moderate</span>
                          <span className="text-[#F59E0B] text-[13px] font-bold ml-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>{last24Totals.moderate}</span>
                        </div>
                        <div className="w-[1px] h-[12px] bg-[#1E2230] mx-1"></div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-[#22D3A0]"></div>
                          <span className="text-[#5A6478] text-[11px]" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>Minor</span>
                          <span className="text-[#22D3A0] text-[13px] font-bold ml-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>{last24Totals.minor}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 w-full min-h-[160px]">
                      <Chart chartType="LineChart" width="100%" height="100%" data={lineChartData} options={lineChartOptions} />
                    </div>
                  </div>
                </div>

                {/* ROW 2: Active Personnel Roster */}
                <div className="bg-[#111318] border border-[#1E2230] rounded-[8px] p-4 flex flex-col max-h-[280px]">
                  <h4 className="text-[#5A6478] text-[10px] tracking-[0.1em] uppercase mb-3" style={{ fontFamily: '"JetBrains Mono", monospace' }}>ACTIVE PERSONNEL ROSTER</h4>
                  
                  {/* Summary Row */}
                  <div className="flex gap-4 items-center mb-3 pb-2.5 border-b border-[#1E2230]">
                    <div className="flex items-center gap-1.5 text-[#E8EDF5] text-[11px]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                      <div className="w-[10px] h-[10px] rounded-full bg-[#22D3A0]"></div>
                      {personnel.filter(p => p.available && !p.currentIncident).length} Available
                    </div>
                    <div className="flex items-center gap-1.5 text-[#E8EDF5] text-[11px]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                      <div className="w-[10px] h-[10px] rounded-full bg-[#F59E0B]"></div>
                      {personnel.filter(p => p.available && p.currentIncident).length} On Duty
                    </div>
                    <div className="flex items-center gap-1.5 text-[#E8EDF5] text-[11px]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                      <div className="w-[10px] h-[10px] rounded-full bg-[#5A6478]"></div>
                      {personnel.filter(p => !p.available).length} Offline
                    </div>
                  </div>

                  {/* Responders List */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col">
                    {personnel.length === 0 ? (
                      <div className="flex items-center justify-center h-full min-h-[100px] border border-dashed border-[#1E2230] rounded text-[#5A6478] text-[13px]" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>
                        No responders registered
                      </div>
                    ) : (
                      (() => {
                        const available = personnel.filter(p => p.available && !p.currentIncident);
                        const onDuty = personnel.filter(p => p.available && p.currentIncident);
                        const offline = personnel.filter(p => !p.available);
                        const sortedPersonnel = [
                          ...available.sort((a,b) => (a.name || a.email || '').localeCompare(b.name || b.email || '')),
                          ...onDuty.sort((a,b) => (a.name || a.email || '').localeCompare(b.name || b.email || '')),
                          ...offline.sort((a,b) => (a.name || a.email || '').localeCompare(b.name || b.email || ''))
                        ];
                        
                        return sortedPersonnel.map((p, i) => {
                          const initials = p.name ? p.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : (p.email || 'U').substring(0,2).toUpperCase();
                          const dept = p.department || 'other';
                          
                          let bg = 'rgba(90,100,120,0.15)', text = '#5A6478';
                          if (dept === 'medical') { bg = 'rgba(245,158,11,0.15)'; text = '#F59E0B'; }
                          else if (dept === 'security') { bg = 'rgba(255,59,59,0.15)'; text = '#FF3B3B'; }
                          else if (dept === 'maintenance') { bg = 'rgba(59,130,246,0.15)'; text = '#3B82F6'; }

                          const isAvailable = p.available && !p.currentIncident;
                          const isOnDuty = p.available && p.currentIncident;

                          return (
                            <div key={i} className="flex items-center gap-[10px] h-[44px] border-b border-white/5 hover:bg-white/5 transition-colors shrink-0 px-2 rounded-sm cursor-default">
                              <div className={`w-[10px] h-[10px] rounded-full shrink-0 ${isAvailable ? 'bg-[#22D3A0] animate-pulse' : isOnDuty ? 'bg-[#F59E0B]' : 'bg-[#5A6478]'}`}></div>
                              <div className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ backgroundColor: bg, color: text, fontFamily: '"Syne", sans-serif' }}>
                                {initials}
                              </div>
                              <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-[#E8EDF5] text-[13px] truncate" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>{p.name || p.email}</span>
                                <span className="text-[#5A6478] text-[10px] capitalize block truncate" style={{ fontFamily: '"JetBrains Mono", monospace' }}>{dept}</span>
                              </div>
                              <div className="flex flex-col items-end shrink-0">
                                {isOnDuty ? (
                                  <>
                                    <span className="text-[#5A6478] text-[9px] uppercase" style={{ fontFamily: '"JetBrains Mono", monospace' }}>ON INCIDENT</span>
                                    <span className="text-[#F59E0B] text-[10px]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>#{p.currentIncident.substring(0,6).toUpperCase()}</span>
                                  </>
                                ) : isAvailable ? (
                                  <span className="text-[#22D3A0] text-[9px]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>AVAILABLE</span>
                                ) : (
                                  <span className="text-[#5A6478] text-[9px]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>OFF DUTY</span>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
      <div className="print:hidden"><ResQAIChat /></div>
      


      <AnimatePresence>
        {selectedIncidentId && (
          <IncidentSidePanel 
            incident={incidents.find(i => i.id === selectedIncidentId)} 
            onClose={() => setSelectedIncidentId(null)} 
          />
        )}
      </AnimatePresence>

      {/* Closure Report Modal */}
      <AnimatePresence>
        {closureReportIncident && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setClosureReportIncident(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#111318] border border-[#1E2230] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-[#1E2230] flex justify-between items-center bg-[#0A0C10]">
                <div className="flex items-center gap-3">
                  <h3 className="text-[#FF3B3B] text-[13px] tracking-widest uppercase font-bold" style={{ fontFamily: '"JetBrains Mono", monospace' }}>INCIDENT CLOSURE REPORT</h3>
                  <span className="text-white/40 text-[10px]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>RQ-{closureReportIncident.id.substring(0,6)}</span>
                </div>
                <button onClick={() => setClosureReportIncident(null)} className="text-[#5A6478] hover:text-white transition-colors">
                  <Plus className="rotate-45 w-5 h-5" />
                </button>
              </div>
              <div className="p-5 flex flex-col gap-4">
                <div>
                  <h4 className="text-white text-lg font-bold" style={{ fontFamily: '"Syne", sans-serif' }}>{closureReportIncident.title}</h4>
                </div>
                <div className="bg-[#0A0C10] border border-[#1E2230] p-4 rounded-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#22D3A0]/0 via-[#22D3A0] to-[#22D3A0]/0"></div>
                  <p className="text-[#22D3A0] text-[13px] whitespace-pre-wrap" style={{ fontFamily: '"JetBrains Mono", monospace', lineHeight: '1.8' }}>
                    {closureReportIncident.closureReport}
                  </p>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[#3B82F6] text-[10px] tracking-wider uppercase font-bold bg-[#3B82F6]/10 px-2 py-1 rounded" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    POWERED BY GEMINI AI
                  </span>
                  {closureReportIncident.responseTimeMinutes !== undefined && closureReportIncident.responseTimeMinutes !== null && (
                    <span className="text-[#F59E0B] text-[11px] font-bold" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                      ⚡ Resolved in {closureReportIncident.responseTimeMinutes} minutes
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Demo Data Buttons */}
      <div className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-2 print:hidden">
        <button
          onClick={handleSeedData}
          disabled={isSeeding || isClearing}
          className="bg-[#111318] border border-[#1E2230] text-[#5A6478] px-3 py-1.5 rounded-[4px] hover:border-[#3B82F6] hover:text-[#3B82F6] transition-colors disabled:opacity-50"
          style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}
        >
          {isSeeding ? 'Seeding...' : '⚙ Load Demo Data'}
        </button>
        <button
          onClick={handleClearData}
          disabled={isSeeding || isClearing}
          className="bg-[#111318] border border-[#1E2230] text-[#5A6478] px-3 py-1.5 rounded-[4px] hover:border-[#FF3B3B] hover:text-[#FF3B3B] transition-colors disabled:opacity-50"
          style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}
        >
          {isClearing ? 'Clearing...' : '⚙ Clear Demo Data'}
        </button>
      </div>

    </div>
  );
}
