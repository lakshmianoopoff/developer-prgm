import { useState, useEffect } from 'react';
import { updateDoc, doc, getDoc } from 'firebase/firestore';
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../hooks/useAuth';
import { useIncidents } from '../hooks/useIncidents';
import { db } from '../services/firebase';
import { updateIncidentStatus } from '../services/incidents';

export default function Responder() {
  const { user } = useAuth();
  const { incidents, loading } = useIncidents();
  const [available, setAvailable] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'responders', user.uid)).then(docSnap => {
        if (docSnap.exists()) {
          setAvailable(docSnap.data().available);
        }
      });
    }
  }, [user]);

  const toggleAvailability = async () => {
    const newVal = !available;
    setAvailable(newVal);
    await updateDoc(doc(db, 'responders', user.uid), {
      available: newVal
    });
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

  if (loading) return <div className="mono-text" style={{padding:'2rem'}}>Loading...</div>;

  const assignedIncidents = incidents.filter(i => i.assignedTo === user.uid && i.status !== 'resolved');
  const activeIncidents = incidents
    .filter(i => i.status !== 'resolved')
    .sort((a,b) => {
       const sevMap = { critical: 3, moderate: 2, minor: 1 };
       return (sevMap[b.severity] || 0) - (sevMap[a.severity] || 0);
    });

  return (
    <div>
      <Navbar title="Responder Panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem' }}>
          <span className="text-muted" style={{fontSize: '0.875rem'}}>Status:</span>
          <button 
            onClick={toggleAvailability}
            style={{ 
              backgroundColor: available ? 'var(--safe-color)' : 'transparent',
              color: available ? '#000' : 'var(--text-primary)',
              border: `1px solid ${available ? 'var(--safe-color)' : 'var(--border-color)'}`,
              padding: '0.25rem 0.75rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
          >
            {available ? 'Available' : 'Busy'}
          </button>
        </div>
      </Navbar>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Left Section - Assigned */}
        <div style={{ flex: '1 1 60%', minWidth: '300px' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>My Assigned Incidents</h2>
          {assignedIncidents.length === 0 ? (
            <div className="card text-muted" style={{ textAlign: 'center' }}>No active incidents assigned to you.</div>
          ) : (
            assignedIncidents.map(inc => (
              <div key={inc.id} className={`card severity-border-${inc.severity}`} style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3>{inc.title}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', margin: '0.5rem 0' }}>
                      <MapPin size={16} /> {inc.location}
                    </div>
                    <span style={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', textTransform: 'capitalize' }}>
                      {inc.type}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className={`btn ${inc.status === 'assigned' ? '' : 'btn-outline'}`}
                    style={{ flex: 1 }}
                    onClick={() => handleStatusUpdate(inc.id, 'assigned')}
                  >
                    En Route
                  </button>
                  <button 
                    className={`btn ${inc.status === 'in_progress' ? '' : 'btn-outline'}`}
                    style={{ flex: 1 }}
                    onClick={() => handleStatusUpdate(inc.id, 'in_progress')}
                  >
                    On Scene
                  </button>
                  <button 
                    className={`btn btn-outline`}
                    style={{ flex: 1, borderColor: 'var(--safe-color)', color: 'var(--safe-color)' }}
                    onClick={() => handleStatusUpdate(inc.id, 'resolved')}
                  >
                    Resolved
                  </button>
                </div>

                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <button 
                    style={{ background: 'transparent', border: 'none', color: 'var(--action-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}
                    onClick={() => setExpandedId(expandedId === inc.id ? null : inc.id)}
                  >
                    {expandedId === inc.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                    AI Instructions
                  </button>
                  
                  {expandedId === inc.id && (
                    <div className="mono-text" style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#0A0C10', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                      <ol style={{ paddingLeft: '1.2rem', margin: 0, color: 'var(--text-primary)' }}>
                        {inc.geminiTriage?.instructions?.map((inst, i) => <li key={i} style={{ marginBottom: '0.5rem' }}>{inst}</li>)}
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Section - All Active */}
        <div style={{ flex: '1 1 35%', minWidth: '300px' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>All Active Incidents</h2>
          <div className="card" style={{ padding: '0' }}>
            {activeIncidents.length === 0 ? (
               <div style={{ padding: '1.5rem', textAlign: 'center' }} className="text-muted">No active incidents. Campus is safe ✓</div>
            ) : (
              activeIncidents.map(inc => (
                <div key={inc.id} style={{ display: 'flex', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div className={`pulse-dot`} style={{ animation: inc.severity === 'critical' ? 'pulse-red 2s infinite' : 'none', backgroundColor: inc.severity === 'critical' ? 'var(--critical-color)' : inc.severity === 'moderate' ? 'var(--warning-color)' : 'var(--safe-color)' }}></div>
                  <div style={{ marginLeft: '1rem' }}>
                    <div style={{ fontWeight: 'bold' }}>{inc.title}</div>
                    <div className="text-muted" style={{ fontSize: '0.85rem' }}>{inc.location}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
