import { useState } from 'react';
import { Navigation, Send } from 'lucide-react';
import Navbar from '../components/Navbar';
import TriageResult from '../components/TriageResult';
import { analyzeIncident } from '../services/gemini';
import { createIncident } from '../services/incidents';
import { useAuth } from '../hooks/useAuth';

const INCIDENT_TYPES = [
  { id: 'security', label: '🚨 Security' },
  { id: 'fire', label: '🔥 Fire' },
  { id: 'medical', label: '🏥 Medical' },
  { id: 'maintenance', label: '🔧 Maintenance' },
  { id: 'other', label: '⚠️ Other' }
];

export default function Report() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('security');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [triageResult, setTriageResult] = useState(null);

  const handleUseLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLocation(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Call Gemini API
      const triage = await analyzeIncident(title, type, description, location);
      
      // Save to Firestore
      const incidentData = {
        title,
        description,
        location,
        type,
        notes,
        reportedBy: user.uid,
        reporterName: user.displayName || user.email,
        severity: triage.severity || 'moderate', 
      };
      
      const id = await createIncident(incidentData, triage);
      setTriageResult({ ...triage, incidentId: id });
    } catch (error) {
      console.error("Failed to submit incident", error);
      alert("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Navbar title="Report an Incident" />
      
      <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <form className="card" onSubmit={handleSubmit}>
          <h2 style={{ marginBottom: '1.5rem' }}>Incident Details</h2>
          
          <input 
            type="text" 
            className="input-field" 
            placeholder="Incident Title" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            required 
          />
          
          <textarea 
            className="input-field" 
            placeholder="What happened?" 
            rows="4" 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            required
          />
          
          <div style={{ marginBottom: '1rem' }}>
            <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Incident Type</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {INCIDENT_TYPES.map(t => (
                <button 
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`btn ${type === t.id ? '' : 'btn-outline'}`}
                  style={{ padding: '0.5rem 1rem' }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input 
              type="text" 
              className="input-field" 
              style={{ marginBottom: 0, flexGrow: 1 }}
              placeholder="Location (e.g., Library 2nd Floor)" 
              value={location} 
              onChange={e => setLocation(e.target.value)} 
              required 
            />
            <button type="button" className="btn btn-outline" onClick={handleUseLocation} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Navigation size={16} /> Use My Location
            </button>
          </div>
          
          <textarea 
            className="input-field" 
            placeholder="Additional notes (optional)" 
            rows="2" 
            value={notes} 
            onChange={e => setNotes(e.target.value)} 
          />
          
          <button type="submit" className="btn" style={{ width: '100%', marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }} disabled={isSubmitting}>
            {isSubmitting ? 'Gemini is analysing your report...' : 'Submit & Analyse with AI'}
            {!isSubmitting && <Send size={18} />}
          </button>
        </form>

        {triageResult && (
          <div style={{ marginTop: '2rem' }}>
            <TriageResult triage={triageResult} />
          </div>
        )}
      </div>
    </div>
  );
}
