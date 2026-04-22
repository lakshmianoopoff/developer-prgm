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
import { Clock, MapPin, ShieldAlert, Navigation, Loader2, Plus } from 'lucide-react';
import { doc, updateDoc, collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const { incidents, loading } = useIncidents();
  const { user, role } = useAuth();
  const [time, setTime] = useState(new Date());
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [closingNote, setClosingNote] = useState('');
  const [personnel, setPersonnel] = useState([]);

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

  const typeCount = incidents.reduce((acc, i) => {
    acc[i.type] = (acc[i.type] || 0) + 1;
    return acc;
  }, {});
  const typeData = [
    ["Type", "Count"],
    ...(Object.keys(typeCount).length ? Object.keys(typeCount).map(k => [k, typeCount[k]]) : [["None", 0]])
  ];

  const severityCount = incidents.reduce((acc, i) => {
    acc[i.severity] = (acc[i.severity] || 0) + 1;
    return acc;
  }, {});
  const severityData = [
    ["Severity", "Count"],
    ...(Object.keys(severityCount).length ? Object.keys(severityCount).map(k => [k, severityCount[k]]) : [["None", 0]])
  ];

  // 24 Hour Chart Calculation
  const getLast24HoursData = () => {
    const dataMap = {};
    const now = new Date();
    
    // Initialize last 24 hours with 0
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourStr = d.toLocaleTimeString([], { hour: '2-digit', hour12: false }) + ':00';
      dataMap[hourStr] = { critical: 0, moderate: 0, minor: 0 };
    }

    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    let totalCritical = 0;
    let totalModerate = 0;
    let totalMinor = 0;

    incidents.forEach(inc => {
      if (!inc.createdAt) return;
      const date = inc.createdAt.toDate ? inc.createdAt.toDate() : new Date(inc.createdAt);
      if (date >= cutoff && date <= now) {
        const hourStr = date.toLocaleTimeString([], { hour: '2-digit', hour12: false }) + ':00';
        if (dataMap[hourStr]) {
          if (inc.severity === 'critical') {
             dataMap[hourStr].critical++;
             totalCritical++;
          } else if (inc.severity === 'moderate') {
             dataMap[hourStr].moderate++;
             totalModerate++;
          } else {
             dataMap[hourStr].minor++;
             totalMinor++;
          }
        }
      }
    });

    const rows = Object.keys(dataMap).map(hour => [
      hour, 
      dataMap[hour].critical, 
      dataMap[hour].moderate, 
      dataMap[hour].minor
    ]);
    
    return {
      chartData: [['Hour', 'Critical', 'Moderate', 'Minor'], ...rows],
      totals: { critical: totalCritical, moderate: totalModerate, minor: totalMinor }
    };
  };

  const { chartData: lineChartData, totals: last24Totals } = getLast24HoursData();

  const lineChartOptions = {
    backgroundColor: '#111318',
    chartArea: { backgroundColor: '#111318', left: 40, right: 20, top: 20, bottom: 40, width: '100%', height: '80%' },
    colors: ['#FF3B3B', '#F59E0B', '#22D3A0'],
    legend: { 
      position: 'bottom', 
      textStyle: { color: '#5A6478', fontSize: 11, fontName: 'JetBrains Mono' }
    },
    hAxis: { 
      textStyle: { color: '#5A6478', fontSize: 10, fontName: 'JetBrains Mono' },
      gridlines: { color: '#1E2230' },
      baselineColor: '#1E2230'
    },
    vAxis: { 
      textStyle: { color: '#5A6478', fontSize: 10, fontName: 'JetBrains Mono' },
      gridlines: { color: '#1E2230' },
      baselineColor: '#1E2230',
      minValue: 0,
      format: '0'
    },
    lineWidth: 2,
    pointSize: 4,
    pointShape: 'circle',
    curveType: 'function',
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
                               <span className={`px-2 py-0.5 rounded-sm border text-[10px] uppercase font-bold tracking-wider mono-text ${inc.status === 'resolved' ? 'bg-accent-green/10 text-accent-green border-accent-green/30' : inc.status === 'in_progress' ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/30' : 'bg-accent-amber/10 text-accent-amber border-accent-amber/30'}`}>
                                 {inc.status}
                               </span>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </div>
              
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 min-h-[250px] shrink-0">
                <div className="bg-slate border-[4px] border-slate-border rounded-sm shadow-lg p-5">
                  <h4 className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-4">Threat Vectors</h4>
                  <div className="h-[180px]">
                    <Chart chartType="BarChart" width="100%" height="100%" data={typeData} options={{...chartOptions, legend: {position: 'none'}}} />
                  </div>
                </div>
                <div className="bg-slate border-[4px] border-slate-border rounded-sm shadow-lg p-5 flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[#5A6478] text-[10px] tracking-[0.1em] font-bold" style={{ fontFamily: '"JetBrains Mono", monospace' }}>INCIDENTS — LAST 24H</h4>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-1 rounded border border-[#FF3B3B] text-[#FF3B3B] bg-[#FF3B3B]/10">🔴 Critical: {last24Totals.critical}</span>
                    <span className="text-[10px] font-bold px-2 py-1 rounded border border-[#F59E0B] text-[#F59E0B] bg-[#F59E0B]/10">🟡 Moderate: {last24Totals.moderate}</span>
                    <span className="text-[10px] font-bold px-2 py-1 rounded border border-[#22D3A0] text-[#22D3A0] bg-[#22D3A0]/10">🟢 Minor: {last24Totals.minor}</span>
                  </div>
                  <div className="flex-1 h-[180px] w-full mt-2">
                    <Chart chartType="LineChart" width="100%" height="100%" data={lineChartData} options={lineChartOptions} />
                  </div>
                </div>
                <div className="bg-slate border-[4px] border-slate-border rounded-sm shadow-lg p-5 flex flex-col">
                  <h4 className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-4">Active Personnel Roster</h4>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                    {personnel.map((p, i) => (
                      <div key={i} className="flex justify-between items-center bg-navy p-2 rounded border border-slate-border">
                        <span className="text-sm font-bold text-white truncate max-w-[150px]">{p.name || p.email}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${p.role === 'admin' ? 'bg-accent-red/20 text-accent-red' : p.role === 'responder' ? 'bg-accent-blue/20 text-accent-blue' : 'bg-slate-border text-slate-300'}`}>
                          {p.role}
                        </span>
                      </div>
                    ))}
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
    </div>
  );
}
