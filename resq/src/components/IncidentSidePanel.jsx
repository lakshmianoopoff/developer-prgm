import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Printer } from 'lucide-react';
import { updateIncidentStatus } from '../services/incidents';
import { generateClosureReport } from '../services/gemini';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const formatTime = (timestamp) => {
  if (!timestamp) return "Pending";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function IncidentSidePanel({ incident, onClose }) {
  const [isResolving, setIsResolving] = useState(false);

  const handleForceResolve = async () => {
    setIsResolving(true);
    try {
      await updateIncidentStatus(incident.id, 'resolved');
      // Fetch fresh incident with resolvedAt to generate report accurately, 
      // but we can just use the current incident and simulate resolvedAt
      const simulatedResolvedIncident = { ...incident, resolvedAt: { toDate: () => new Date() } };
      const report = await generateClosureReport(simulatedResolvedIncident);
      
      await updateDoc(doc(db, 'incidents', incident.id), {
        closureReport: report
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsResolving(false);
      onClose();
    }
  };

  const handleExport = () => {
    window.print();
  };

  if (!incident) return null;

  const sevColor = incident.severity === 'critical' ? '#FF3B3B' : incident.severity === 'moderate' ? '#F59E0B' : '#22D3A0';

  // Timeline Step logic
  const isAssigned = !!incident.assignedTo;
  const isEnRoute = incident.enRouteAt || incident.onSceneAt || incident.resolvedAt || incident.status === 'in_progress' || incident.status === 'on_scene' || incident.status === 'resolved';
  const isOnScene = incident.onSceneAt || incident.resolvedAt || incident.status === 'on_scene' || incident.status === 'resolved';
  const isResolved = incident.status === 'resolved';

  const steps = [
    {
      title: "Incident Reported",
      color: "#3B82F6",
      completed: true,
      time: formatTime(incident.createdAt),
      desc: `Reported by ${incident.reporterName || 'Unknown'}`
    },
    {
      title: "AI Triage Completed",
      color: "#F59E0B",
      completed: true,
      time: incident.createdAt ? formatTime(new Date((incident.createdAt.toDate ? incident.createdAt.toDate().getTime() : new Date(incident.createdAt).getTime()) + 3000)) : "Pending",
      desc: `Severity assessed as ${incident.severity} by AI`,
      extra: incident.geminiTriage?.summary
    },
    {
      title: "Responder Assigned",
      color: "#3B82F6",
      completed: isAssigned,
      time: formatTime(incident.assignedAt),
      desc: isAssigned ? `Assigned to ${incident.assignedName}` : "Awaiting assignment"
    },
    {
      title: "En Route",
      color: "#F59E0B",
      completed: isEnRoute,
      time: formatTime(incident.enRouteAt),
      desc: isEnRoute ? `${incident.assignedName} is en route` : ""
    },
    {
      title: "On Scene",
      color: "#F59E0B",
      completed: isOnScene,
      time: formatTime(incident.onSceneAt),
      desc: isOnScene ? "Responder arrived at location" : ""
    },
    {
      title: "Resolved",
      color: "#22D3A0",
      completed: isResolved,
      time: formatTime(incident.resolvedAt),
      desc: isResolved ? "Incident cleared" : ""
    }
  ];

  return (
    <>
      {/* Backdrop overlay for smaller screens, mostly transparent */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 z-40 xl:hidden"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 h-full w-[420px] bg-[#111318] border-l border-[#1E2230] z-50 flex flex-col shadow-2xl print:static print:h-auto print:w-full print:border-none print:shadow-none print:overflow-visible print:bg-white"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#1E2230] flex-shrink-0 print:border-b-2 print:border-black print:text-black">
          <div className="flex justify-between items-start mb-4">
            <div className="text-[#FF3B3B] text-xs" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              ID: {incident.id.toUpperCase()}
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition print:hidden">
              <X size={20} />
            </button>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 print:text-black" style={{ fontFamily: '"Syne", sans-serif' }}>
            {incident.title}
          </h2>
          <div className="flex gap-2">
            <span className="px-2 py-1 text-[10px] uppercase tracking-widest font-bold rounded" style={{ backgroundColor: `${sevColor}20`, color: sevColor }}>
              {incident.severity}
            </span>
            <span className="px-2 py-1 text-[10px] uppercase tracking-widest font-bold rounded bg-[#1E2230] text-slate-300 print:bg-gray-100 print:text-gray-800">
              {incident.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar print:overflow-visible print:text-black">
          <div className="text-[#5A6478] text-[10px] tracking-[0.2em] mb-6 print:text-gray-600" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            INCIDENT TIMELINE
          </div>

          <div className="relative pl-4 mb-8">
            {/* Vertical Line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-[#1E2230]" />

            {steps.map((step, idx) => (
              <div key={idx} className="relative mb-8 last:mb-0 print:break-inside-avoid">
                {/* Node Circle */}
                <div 
                  className="absolute -left-[14px] top-1 w-4 h-4 rounded-full z-10 print:!border-gray-300"
                  style={{ 
                    backgroundColor: step.completed ? step.color : '#111318',
                    border: step.completed ? 'none' : '2px solid #1E2230'
                  }}
                />
                
                <div className="pl-4 flex flex-col gap-1">
                  <div className="flex justify-between items-start">
                    <span className="text-white text-[14px] font-bold print:text-black" style={{ fontFamily: '"Syne", sans-serif' }}>{step.title}</span>
                    <span className="text-[#5A6478] text-[11px] print:text-gray-600" style={{ fontFamily: '"JetBrains Mono", monospace' }}>{step.time}</span>
                  </div>
                  {(step.completed || step.desc === "Awaiting assignment") && (
                    <span className="text-slate-400 text-sm print:text-gray-800">{step.desc}</span>
                  )}
                  {step.extra && (
                    <span className="text-slate-500 text-xs italic mt-1 print:text-gray-600">{step.extra}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* AI Terminal Blocks */}
          {incident.status === 'resolved' && incident.closureReport && (
            <div className="mt-8 print:break-inside-avoid">
              <div className="text-[#5A6478] text-[10px] tracking-[0.2em] mb-3 print:text-gray-600" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                AI CLOSURE REPORT
              </div>
              <div className="bg-[#0A0C10] border border-[#1E2230] rounded p-4 text-[#22D3A0] text-[12px] whitespace-pre-wrap print:bg-white print:border-gray-300 print:text-black" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                {incident.closureReport}
              </div>
            </div>
          )}

          {incident.status !== 'resolved' && incident.geminiTriage?.instructions && (
            <div className="mt-8 print:break-inside-avoid">
              <div className="text-[#5A6478] text-[10px] tracking-[0.2em] mb-3 print:text-gray-600" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                AI RESPONSE INSTRUCTIONS
              </div>
              <div className="bg-[#0A0C10] border border-[#1E2230] rounded p-4 text-slate-300 text-[12px] print:bg-white print:border-gray-300 print:text-black" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                <ol className="list-decimal pl-4 space-y-2">
                  {incident.geminiTriage.instructions.map((inst, i) => (
                    <li key={i}>{inst}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-[#1E2230] flex-shrink-0 bg-[#111318] print:hidden">
          {incident.status !== 'resolved' ? (
            <button 
              onClick={handleForceResolve}
              disabled={isResolving}
              className="w-full border border-[#FF3B3B] text-[#FF3B3B] hover:bg-[#FF3B3B] hover:text-white transition font-bold py-3 rounded flex items-center justify-center gap-2"
            >
              {isResolving ? 'Resolving...' : (
                <>
                  <CheckCircle size={18} /> FORCE RESOLVE
                </>
              )}
            </button>
          ) : (
            <button 
              onClick={handleExport}
              className="w-full border border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6] hover:text-white transition font-bold py-3 rounded flex items-center justify-center gap-2"
            >
              <Printer size={18} /> EXPORT REPORT
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
}
