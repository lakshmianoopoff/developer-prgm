import { useState } from 'react';
import { Navigation, Send, AlertTriangle, X } from 'lucide-react';
import { analyzeIncident } from '../services/gemini';
import { createIncident } from '../services/incidents';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

const INCIDENT_TYPES = [
  { id: 'security', label: '🚨 Security' },
  { id: 'fire', label: '🔥 Fire' },
  { id: 'medical', label: '🏥 Medical' },
  { id: 'maintenance', label: '🔧 Maintenance' },
  { id: 'other', label: '⚠️ Other' }
];

export default function ReportModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('security');
  const [locationStr, setLocationStr] = useState('');
  const [coords, setCoords] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getPlaceName = async (lat, lon) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await res.json();
      return data.display_name || `Lat: ${lat.toFixed(4)}, Lng: ${lon.toFixed(4)}`;
    } catch (e) {
      return `Lat: ${lat.toFixed(4)}, Lng: ${lon.toFixed(4)}`;
    }
  };

  const handleUseLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setCoords([lat, lon]);
        setLocationStr("Locating...");
        const placeName = await getPlaceName(lat, lon);
        setLocationStr(placeName);
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
        location: locationStr, // Now includes reverse geocoded name
        locationName: locationStr, // Add a specific field for it to show in UI
        coordinates: coords ? { lat: coords[0], lng: coords[1] } : null,
        type,
        notes: '',
        reportedBy: user.uid,
        reporterName: user.displayName || user.email,
        severity: triage.severity || 'moderate', 
      };
      
      const id = await createIncident(incidentData, triage);
      
      if (coords) {
         fetch('http://localhost:4000/api/trigger-alerts', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ incidentId: id, title, severity: incidentData.severity, type, coordinates: incidentData.coordinates })
         }).catch(err => console.error("Alert trigger failed", err));
      }
      
      // Reset and close
      setTitle('');
      setDescription('');
      setLocationStr('');
      setCoords(null);
      onClose();
    } catch (error) {
      console.error("Failed to submit incident", error);
      alert("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="w-full h-full flex flex-col px-4 py-2"
    >
      <div className="flex justify-between items-center mb-6 border-b-2 border-slate-border pb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3 uppercase tracking-tight">
          <AlertTriangle className="text-accent-amber" size={28} /> Report Incident
        </h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition p-2 bg-navy rounded-full border border-slate-border hover:border-slate-400">
          <X size={20} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="space-y-5 flex-1">
            <div>
              <label className="block text-slate-400 mb-2 text-sm font-semibold">Incident Title</label>
              <input 
                type="text" 
                className="w-full bg-navy border border-slate-border text-white p-3 rounded focus:outline-none focus:border-accent-blue transition" 
                placeholder="Brief summary..." 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                required 
              />
            </div>
            
            <div>
              <label className="block text-slate-400 mb-2 text-sm font-semibold">Incident Type</label>
              <div className="flex flex-wrap gap-3">
                {INCIDENT_TYPES.map(t => (
                  <button 
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={`px-4 py-2 rounded text-sm font-semibold transition ${type === t.id ? 'bg-accent-blue text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-navy border border-slate-border text-slate-300 hover:bg-slate-light'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-slate-400 mb-2 text-sm font-semibold">Description</label>
              <textarea 
                className="w-full bg-navy border border-slate-border text-white p-3 rounded focus:outline-none focus:border-accent-blue transition resize-none" 
                placeholder="What happened? Please be as detailed as possible..." 
                rows="4" 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                required
              />
            </div>
            
            <div>
              <label className="block text-slate-400 mb-2 text-sm font-semibold">Location</label>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  className="flex-1 bg-navy border border-slate-border text-white p-3 rounded focus:outline-none focus:border-accent-blue transition" 
                  placeholder="Location Details / Address" 
                  value={locationStr} 
                  onChange={e => setLocationStr(e.target.value)} 
                  required 
                />
                <button type="button" className="px-5 py-2 bg-slate-light border border-slate-border rounded hover:bg-slate-border transition flex items-center gap-2 font-semibold text-slate-300 whitespace-nowrap" onClick={handleUseLocation}>
                  <Navigation size={18} /> <span>Get Pin</span>
                </button>
              </div>
              {coords && (
                <p className="text-accent-green text-xs mt-2 font-mono flex items-center gap-1">
                  ✓ Location pinned successfully
                </p>
              )}
            </div>
          </div>
          
          <div className="pt-6 mt-4 border-t border-slate-border">
            <motion.button whileTap={{ scale: 0.95 }} type="submit" className="tactical-btn w-full bg-accent-blue text-white py-4 rounded-sm font-bold text-lg hover:bg-blue-600 transition flex justify-center items-center gap-3 shadow-[0_0_20px_rgba(59,130,246,0.4)] uppercase tracking-widest border-2 border-blue-400" disabled={isSubmitting}>
              {isSubmitting ? 'Analysing with AI...' : 'Submit Emergency'}
              {!isSubmitting && <Send size={20} />}
            </motion.button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
