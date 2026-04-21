import { useState, useEffect } from 'react';
import { Chart } from "react-google-charts";
import Navbar from '../components/Navbar';
import { useIncidents } from '../hooks/useIncidents';
import { useResponders } from '../hooks/useResponders';
import { Clock, MapPin, ShieldAlert } from 'lucide-react';
import { updateIncidentStatus } from '../services/incidents';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function Dashboard() {
  const { incidents, loading } = useIncidents();
  const { responders } = useResponders();
  const [time, setTime] = useState(new Date());
  const [selectedIncident, setSelectedIncident] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) return <div className="mono-text" style={{padding:'2rem'}}>Loading dashboard...</div>;

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
    legend: { textStyle: { color: 'var(--text-primary)' } },
    pieSliceBorderColor: 'transparent',
    colors: ['#3B82F6', '#FF3B3B', '#F59E0B', '#22D3A0', '#5A6478'],
    hAxis: { textStyle: { color: 'var(--text-primary)' }, gridlines: { color: 'var(--border-color)' } },
    vAxis: { textStyle: { color: 'var(--text-primary)' }, gridlines: { color: 'var(--border-color)' } },
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

  return (
    <div>
      {criticalActive && (
        <div className="alert-bar">
          CRITICAL INCIDENT ACTIVE — ALL UNITS BE ADVISED
        </div>
      )}
      
      <Navbar title="Command Dashboard">
        <div className="mono-text" style={{ fontSize: '1.25rem', marginRight: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={20} />
          {time.toLocaleTimeString()}
        </div>
      </Navbar>

      <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
        
        {/* Top Row - Stats */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="card" style={{ flex: '1 1 200px', borderTop: '4px solid var(--critical-color)' }}>
            <div className="text-muted">Active Incidents</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{activeIncidents.length}</div>
          </div>
          <div className="card" style={{ flex: '1 1 200px', borderTop: '4px solid var(--warning-color)' }}>
            <div className="text-muted">In Progress</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{inProgressIncidents.length}</div>
          </div>
          <div className="card" style={{ flex: '1 1 200px', borderTop: '4px solid var(--safe-color)' }}>
            <div className="text-muted">Resolved Today</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{resolvedToday.length}</div>
          </div>
          <div className="card" style={{ flex: '1 1 200px', borderTop: '4px solid var(--action-color)' }}>
            <div className="text-muted">Available Responders</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{availableResponders.length}</div>
          </div>
        </div>

        {/* Middle Row - Split */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem', minHeight: '500px' }}>
          
          {/* Left - Table */}
          <div className="card" style={{ flex: '1 1 60%', overflowY: 'auto', maxHeight: '600px' }}>
            <h3 style={{ marginBottom: '1rem' }}>Live Incident Feed</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Sev</th>
                  <th style={{ padding: '0.75rem' }}>Type</th>
                  <th style={{ padding: '0.75rem' }}>Title</th>
                  <th style={{ padding: '0.75rem' }}>Location</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {incidents.slice(0, 50).map(inc => (
                  <tr 
                    key={inc.id} 
                    style={{ 
                      borderBottom: '1px solid var(--border-color)', 
                      cursor: 'pointer',
                      backgroundColor: selectedIncident?.id === inc.id ? 'var(--border-color)' : 'transparent'
                    }}
                    onClick={() => setSelectedIncident(inc)}
                  >
                    <td style={{ padding: '0.75rem' }}>
                      <div className="pulse-dot" style={{ backgroundColor: inc.severity === 'critical' ? 'var(--critical-color)' : inc.severity === 'moderate' ? 'var(--warning-color)' : 'var(--safe-color)', animation: inc.severity === 'critical' && inc.status !== 'resolved' ? 'pulse-red 2s infinite' : 'none' }}></div>
                    </td>
                    <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>{inc.type}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{inc.title}</td>
                    <td style={{ padding: '0.75rem' }}>{inc.location}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '4px', 
                        fontSize: '0.8rem',
                        backgroundColor: 'var(--bg-color)',
                        border: '1px solid var(--border-color)'
                      }}>
                        {inc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right - Detail */}
          <div className="card" style={{ flex: '1 1 35%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {selectedIncident ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.5rem' }}>{selectedIncident.title}</h3>
                  <div className="mono-text text-muted" style={{ fontSize: '0.8rem' }}>#RQ-{selectedIncident.id.substring(0,4).toUpperCase()}</div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <span style={{ backgroundColor: 'var(--bg-color)', padding: '0.25rem 0.5rem', borderRadius: '4px', textTransform: 'capitalize', border: '1px solid var(--border-color)' }}>{selectedIncident.type}</span>
                  <span style={{ backgroundColor: 'var(--bg-color)', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={14}/> {selectedIncident.location}
                  </span>
                </div>

                <div style={{ backgroundColor: '#0A0C10', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                  <h4 style={{ marginBottom: '0.5rem' }}>AI Triage Summary</h4>
                  <p className="text-muted" style={{ marginBottom: '1rem' }}>{selectedIncident.geminiTriage?.summary || 'No summary available.'}</p>
                  
                  <h4 style={{ marginBottom: '0.5rem' }}>Instructions</h4>
                  <ol className="mono-text" style={{ paddingLeft: '1.2rem', margin: 0, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    {selectedIncident.geminiTriage?.instructions?.map((inst, i) => <li key={i}>{inst}</li>)}
                  </ol>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ marginBottom: '0.5rem' }}>Assign Responder</h4>
                  <select 
                    className="input-field"
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

                <div style={{ marginTop: 'auto' }}>
                  <button 
                    className="btn btn-outline" 
                    style={{ width: '100%', borderColor: 'var(--safe-color)', color: 'var(--safe-color)' }}
                    onClick={() => handleForceResolve(selectedIncident.id)}
                    disabled={selectedIncident.status === 'resolved'}
                  >
                    {selectedIncident.status === 'resolved' ? 'Resolved ✓' : 'Force Resolve'}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                <ShieldAlert size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>Select an incident to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row - Analytics */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', minHeight: '300px' }}>
          <div className="card" style={{ flex: '1 1 400px' }}>
            <h4 style={{ marginBottom: '1rem' }}>Incidents by Type</h4>
            <div style={{ height: '250px' }}>
              <Chart chartType="BarChart" width="100%" height="100%" data={typeData} options={{...chartOptions, legend: {position: 'none'}}} />
            </div>
          </div>
          <div className="card" style={{ flex: '1 1 400px' }}>
            <h4 style={{ marginBottom: '1rem' }}>Incidents by Severity</h4>
            <div style={{ height: '250px' }}>
              <Chart chartType="PieChart" width="100%" height="100%" data={severityData} options={{...chartOptions, pieHole: 0.4}} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
