import { useState, useEffect } from 'react';
import { Chart } from "react-google-charts";
import Navbar from '../components/Navbar';
import MapEmbed from '../components/MapEmbed';
import ChatBox from '../components/ChatBox';
import { useIncidents } from '../hooks/useIncidents';
import { useResponders } from '../hooks/useResponders';
import { Clock, MapPin, ShieldAlert, Navigation, Loader2 } from 'lucide-react';
import { updateIncidentStatus } from '../services/incidents';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const { incidents, loading } = useIncidents();
  const { responders } = useResponders();
  const [time, setTime] = useState(new Date());
  const [selectedIncident, setSelectedIncident] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
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

  const availableResponders = responders.filter(r => r.available);

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

  const chartOptions = {
    backgroundColor: 'transparent',
    legend: { textStyle: { color: '#94a3b8' } },
    pieSliceBorderColor: 'transparent',
    colors: ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#475569'],
    hAxis: { textStyle: { color: '#94a3b8' }, gridlines: { color: '#2A3347' } },
    vAxis: { textStyle: { color: '#94a3b8' }, gridlines: { color: '#2A3347' } },
  };

  const handleForceResolve = async (id) => {
    await updateIncidentStatus(id, 'resolved');
    setSelectedIncident(prev => prev && prev.id === id ? { ...prev, status: 'resolved' } : prev);
  };

  const handleAssignResponder = async (incidentId, responderId) => {
    await updateDoc(doc(db, 'incidents', incidentId), {
      status: 'assigned',
      assignedTo: responderId,
      assignedName: responders.find(r => r.id === responderId)?.name || 'Responder'
    });
    await updateDoc(doc(db, 'responders', responderId), {
      available: false,
      currentIncident: incidentId
    });
  };

  const criticalActive = activeIncidents.some(i => i.severity === 'critical');

  const mapMarkers = incidents.filter(i => i.status !== 'resolved').map(inc => {
    if (inc.coordinates) {
      return { position: [inc.coordinates.lat, inc.coordinates.lng], title: inc.title, severity: inc.severity, type: inc.type };
    }
    return null;
  }).filter(Boolean);

  return (
    <div className="bg-navy min-h-screen pb-12">
      <AnimatePresence>
        {criticalActive && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-accent-red text-white text-center py-2 font-bold uppercase tracking-widest text-sm shadow-[0_0_15px_rgba(239,68,68,0.5)] z-50 relative"
          >
            CRITICAL INCIDENT ACTIVE — ALL UNITS BE ADVISED
          </motion.div>
        )}
      </AnimatePresence>
      
      <Navbar title="Command Dashboard">
        <div className="mono-text text-xl flex items-center gap-2 mr-4 text-slate-300">
          <Clock size={20} className="text-accent-blue" />
          {time.toLocaleTimeString()}
        </div>
      </Navbar>

      <div className="max-w-[1600px] mx-auto p-6">
        
        {/* Top Row - Stats & Map */}
        <div className="flex flex-wrap gap-6 mb-8">
          <div className="flex-[1_1_600px] flex flex-col gap-6">
            <div className="flex gap-6">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-slate border border-slate-border border-t-4 border-t-accent-red rounded-xl p-6 flex-1 shadow-lg">
                <div className="text-slate-400 text-sm uppercase tracking-wider font-bold mb-2">Active Incidents</div>
                <div className="text-4xl font-bold text-white">{activeIncidents.length}</div>
              </motion.div>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-slate border border-slate-border border-t-4 border-t-accent-amber rounded-xl p-6 flex-1 shadow-lg">
                <div className="text-slate-400 text-sm uppercase tracking-wider font-bold mb-2">In Progress</div>
                <div className="text-4xl font-bold text-white">{inProgressIncidents.length}</div>
              </motion.div>
            </div>
            <div className="flex gap-6">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-slate border border-slate-border border-t-4 border-t-accent-green rounded-xl p-6 flex-1 shadow-lg">
                <div className="text-slate-400 text-sm uppercase tracking-wider font-bold mb-2">Resolved Today</div>
                <div className="text-4xl font-bold text-white">{resolvedToday.length}</div>
              </motion.div>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4 }} className="bg-slate border border-slate-border border-t-4 border-t-accent-blue rounded-xl p-6 flex-1 shadow-lg">
                <div className="text-slate-400 text-sm uppercase tracking-wider font-bold mb-2">Available Responders</div>
                <div className="text-4xl font-bold text-white">{availableResponders.length}</div>
              </motion.div>
            </div>
          </div>
          
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-slate border border-slate-border rounded-xl flex-[1_1_600px] overflow-hidden shadow-lg flex flex-col">
            <div className="p-4 border-b border-slate-border bg-slate-light flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse"></span>
              <h3 className="m-0 text-white font-bold text-sm uppercase tracking-wider">Campus Global Map</h3>
            </div>
            <div className="flex-1 min-h-[300px]">
              <MapEmbed markers={mapMarkers} style={{ height: '100%', width: '100%' }} />
            </div>
          </motion.div>
        </div>

        {/* Middle Row - Split Table & Detail */}
        <div className="flex flex-wrap gap-6 mb-8 min-h-[600px]">
          
          <div className="bg-slate border border-slate-border rounded-xl flex-[1_1_50%] shadow-lg overflow-hidden flex flex-col max-h-[700px]">
            <div className="p-4 border-b border-slate-border bg-slate-light">
              <h3 className="text-white font-bold text-sm uppercase tracking-wider m-0">Live Incident Feed</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-navy sticky top-0 z-10">
                  <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-border">
                    <th className="p-4 font-semibold">Sev</th>
                    <th className="p-4 font-semibold">Type</th>
                    <th className="p-4 font-semibold">Title</th>
                    <th className="p-4 font-semibold">Location</th>
                    <th className="p-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-border">
                  <AnimatePresence>
                    {incidents.slice(0, 50).map(inc => {
                      const isCritical = inc.severity === 'critical';
                      const dotColor = isCritical ? 'bg-accent-red' : inc.severity === 'moderate' ? 'bg-accent-amber' : 'bg-accent-green';
                      return (
                        <motion.tr 
                          key={inc.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={`cursor-pointer transition hover:bg-slate-light ${selectedIncident?.id === inc.id ? 'bg-slate-light' : ''}`}
                          onClick={() => setSelectedIncident(inc)}
                        >
                          <td className="p-4">
                            <div className={`w-2.5 h-2.5 rounded-full ${dotColor} ${isCritical && inc.status !== 'resolved' ? 'animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]' : ''}`}></div>
                          </td>
                          <td className="p-4 capitalize text-sm text-slate-300">{inc.type}</td>
                          <td className="p-4 font-bold text-white text-sm">{inc.title}</td>
                          <td className="p-4 text-sm text-slate-400">{inc.location}</td>
                          <td className="p-4">
                            <span className="bg-navy border border-slate-border px-2 py-1 rounded text-xs text-slate-300 capitalize">
                              {inc.status}
                            </span>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate border border-slate-border rounded-xl flex-[1_1_45%] shadow-lg p-6 max-h-[700px] overflow-y-auto flex flex-col">
            <AnimatePresence mode="wait">
              {selectedIncident ? (
                <motion.div key={selectedIncident.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-bold text-white m-0">{selectedIncident.title}</h3>
                    <div className="mono-text text-slate-500 text-xs border border-slate-border px-2 py-1 rounded">#RQ-{selectedIncident.id.substring(0,4).toUpperCase()}</div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="bg-navy border border-slate-border px-3 py-1.5 rounded text-xs capitalize text-slate-300">{selectedIncident.type}</span>
                    <span className="bg-navy border border-slate-border px-3 py-1.5 rounded text-xs flex items-center gap-1.5 text-slate-300">
                      <MapPin size={14} className="text-accent-blue" /> {selectedIncident.location}
                    </span>
                    {selectedIncident.coordinates && (
                      <span className="mono-text bg-navy border border-slate-border px-3 py-1.5 rounded text-xs flex items-center gap-1.5 text-accent-amber">
                        <Navigation size={14} /> {selectedIncident.coordinates.lat.toFixed(4)}, {selectedIncident.coordinates.lng.toFixed(4)}
                      </span>
                    )}
                  </div>

                  <div className="bg-navy p-5 rounded-xl border border-slate-border mb-6">
                    <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">AI Triage Summary</h4>
                    <p className="text-slate-300 text-sm mb-4 leading-relaxed">{selectedIncident.geminiTriage?.summary || 'No summary available.'}</p>
                    
                    <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Instructions</h4>
                    <ol className="mono-text pl-4 list-decimal marker:text-slate-500 text-sm text-slate-200 space-y-1">
                      {selectedIncident.geminiTriage?.instructions?.map((inst, i) => <li key={i}>{inst}</li>)}
                    </ol>
                  </div>

                  {/* Comms Overview for Admin */}
                  <div className="flex gap-4 mb-6">
                    <div className="flex-1">
                      <ChatBox incidentId={selectedIncident.id} isPublic={true} isAdmin={true} />
                    </div>
                    <div className="flex-1">
                      <ChatBox incidentId={selectedIncident.id} isPublic={false} isAdmin={true} />
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Assign Responder</h4>
                    <select 
                      className="w-full bg-navy border border-slate-border text-white p-3 rounded focus:outline-none focus:border-accent-blue transition appearance-none"
                      onChange={(e) => handleAssignResponder(selectedIncident.id, e.target.value)}
                      value={selectedIncident.assignedTo || ""}
                      disabled={selectedIncident.status === 'resolved'}
                    >
                      <option value="" disabled>Select available responder...</option>
                      {availableResponders.map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({r.department})</option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-auto">
                    <button 
                      className="w-full py-3 rounded font-bold transition border border-accent-green text-accent-green hover:bg-accent-green hover:text-navy disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleForceResolve(selectedIncident.id)}
                      disabled={selectedIncident.status === 'resolved'}
                    >
                      {selectedIncident.status === 'resolved' ? 'Resolved ✓' : 'Force Resolve'}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <ShieldAlert size={48} className="mb-4 opacity-50" />
                  <p>Select an incident to view details</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Row - Analytics */}
        <div className="flex flex-wrap gap-6 min-h-[300px]">
          <div className="bg-slate border border-slate-border rounded-xl flex-[1_1_400px] shadow-lg p-6">
            <h4 className="text-slate-400 text-sm uppercase tracking-wider font-bold mb-4">Incidents by Type</h4>
            <div className="h-[250px]">
              <Chart chartType="BarChart" width="100%" height="100%" data={typeData} options={{...chartOptions, legend: {position: 'none'}}} />
            </div>
          </div>
          <div className="bg-slate border border-slate-border rounded-xl flex-[1_1_400px] shadow-lg p-6">
            <h4 className="text-slate-400 text-sm uppercase tracking-wider font-bold mb-4">Incidents by Severity</h4>
            <div className="h-[250px]">
              <Chart chartType="PieChart" width="100%" height="100%" data={severityData} options={{...chartOptions, pieHole: 0.4}} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
