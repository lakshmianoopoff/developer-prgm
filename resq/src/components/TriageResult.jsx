import { CheckCircle, Clock } from 'lucide-react';

export default function TriageResult({ triage }) {
  const getSeverityColor = (sev) => {
    if (sev === 'critical') return 'var(--critical-color)';
    if (sev === 'moderate') return 'var(--warning-color)';
    return 'var(--safe-color)';
  };

  return (
    <div className={`card severity-border-${triage.severity}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <span style={{ 
            backgroundColor: getSeverityColor(triage.severity), 
            color: '#000', 
            padding: '0.25rem 0.5rem', 
            borderRadius: '4px', 
            fontWeight: 'bold', 
            textTransform: 'uppercase',
            fontSize: '0.8rem'
          }}>
            {triage.severity}
          </span>
          <h3 style={{ marginTop: '0.5rem' }}>AI Triage Summary</h3>
          <p className="text-muted">{triage.summary}</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--action-color)' }}>
          <Clock size={16} />
          <span className="mono-text" style={{ fontSize: '0.9rem' }}>ETA: {triage.estimatedResponseTime}</span>
        </div>
      </div>

      <div style={{ backgroundColor: '#0A0C10', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', border: '1px solid var(--border-color)' }}>
        <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Response Instructions</h4>
        <ol style={{ paddingLeft: '1.2rem', margin: 0 }} className="mono-text">
          {triage.instructions?.map((inst, idx) => (
            <li key={idx} style={{ marginBottom: '0.25rem', color: 'var(--text-primary)' }}>{inst}</li>
          ))}
        </ol>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Resources Needed</h4>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {triage.resourcesNeeded?.map((res, idx) => (
            <span key={idx} style={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
              {res}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--safe-color)', marginTop: '1rem' }}>
        <CheckCircle size={20} />
        <span style={{ fontWeight: 'bold' }}>Help is on the way</span>
        <span className="mono-text text-muted" style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>ID: #RQ-{triage.incidentId?.substring(0, 4).toUpperCase()}</span>
      </div>
    </div>
  );
}
