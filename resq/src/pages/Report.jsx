import { useState } from 'react';
import { Navigation, Send, AlertTriangle } from 'lucide-react';
import Navbar from '../components/Navbar';
import TriageResult from '../components/TriageResult';
import MapEmbed from '../components/MapEmbed';
import ChatBox from '../components/ChatBox';
import { analyzeIncident } from '../services/gemini';
import { createIncident } from '../services/incidents';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';

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
  const [locationStr, setLocationStr] = useState('');
  const [coords, setCoords] = useState(null);
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [triageResult, setTriageResult] = useState(null);

  const handleUseLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setCoords([position.coords.latitude, position.coords.longitude]);
        setLocationStr(`Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`);
      });
    }
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

  return (
    <div className="bg-navy min-h-screen">
      <Navbar title="Report an Incident" />
      
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
              
              <textarea 
                className="w-full bg-navy border border-slate-border text-white p-3 rounded mb-4 focus:outline-none focus:border-accent-blue transition" 
                placeholder="What happened?" 
                rows="4" 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                required
              />
              
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
              
              {coords && (
                <div className="mb-4 rounded-xl overflow-hidden border border-slate-border">
                  <MapEmbed center={coords} userLocation={coords} />
                </div>
              )}
              
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
      </div>
    </div>
  );
}
