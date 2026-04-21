import { CheckCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TriageResult({ triage }) {
  const isCritical = triage.severity === 'critical';
  const isMod = triage.severity === 'moderate';
  
  const borderColor = isCritical ? 'border-accent-red' : isMod ? 'border-accent-amber' : 'border-accent-green';
  const bgColor = isCritical ? 'bg-accent-red' : isMod ? 'bg-accent-amber' : 'bg-accent-green';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`bg-slate border-l-4 ${borderColor} border-y border-r border-slate-border rounded-r-xl p-6 shadow-lg`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className={`${bgColor} text-black px-3 py-1 rounded text-xs font-bold uppercase tracking-wider`}>
            {triage.severity}
          </span>
          <h3 className="text-xl font-bold mt-3 mb-1">AI Triage Summary</h3>
          <p className="text-slate-400 text-sm">{triage.summary}</p>
        </div>
        
        <div className="flex items-center gap-2 text-accent-blue bg-accent-blue/10 px-3 py-1.5 rounded-full">
          <Clock size={14} />
          <span className="mono-text text-sm font-semibold">ETA: {triage.estimatedResponseTime}</span>
        </div>
      </div>

      <div className="bg-navy p-4 rounded-lg border border-slate-border mb-6">
        <h4 className="text-slate-400 text-xs font-bold mb-3 uppercase tracking-wide">Response Instructions</h4>
        <ol className="mono-text text-sm text-slate-200 pl-4 list-decimal marker:text-slate-500 space-y-2">
          {triage.instructions?.map((inst, idx) => (
            <li key={idx}>{inst}</li>
          ))}
        </ol>
      </div>

      <div className="mb-6">
        <h4 className="text-slate-400 text-xs font-bold mb-3 uppercase tracking-wide">Resources Needed</h4>
        <div className="flex flex-wrap gap-2">
          {triage.resourcesNeeded?.map((res, idx) => (
            <span key={idx} className="bg-slate-light border border-slate-border px-3 py-1 rounded-full text-xs text-slate-300">
              {res}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-accent-green mt-4 pt-4 border-t border-slate-border">
        <CheckCircle size={18} />
        <span className="font-bold text-sm">Help is on the way</span>
        <span className="mono-text text-slate-500 ml-auto text-xs">ID: #RQ-{triage.incidentId?.substring(0, 4).toUpperCase()}</span>
      </div>
    </motion.div>
  );
}
