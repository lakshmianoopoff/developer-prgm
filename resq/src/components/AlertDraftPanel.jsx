import { useState, useEffect, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { generateAlertDraft } from '../services/gemini';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';

export default function AlertDraftPanel({ incident, onClose, className = "" }) {
  const [draft, setDraft] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const { user } = useAuth();
  const editableRef = useRef(null);

  useEffect(() => {
    if (!incident) return;
    
    if (incident.alertDraft) {
      setDraft(incident.alertDraft);
      // If it hasn't been sent and we are not editing, make sure it matches
      if (editableRef.current && !isEditing) {
        editableRef.current.innerText = incident.alertDraft;
      }
    } else if (!incident.alertDraftGeneratedAt) {
      handleGenerate();
    }
  }, [incident, incident?.alertDraft]);

  const handleGenerate = async () => {
    if (incident.alertSent) return;
    
    setIsGenerating(true);
    setDraft('');
    const newDraft = await generateAlertDraft(incident);
    setDraft(newDraft);
    setIsGenerating(false);
    
    try {
      await updateDoc(doc(db, 'incidents', incident.id), {
        alertDraft: newDraft,
        alertDraftGeneratedAt: new Date(),
        alertSent: false
      });
    } catch (e) {
      console.error("Failed to save draft to Firestore:", e);
    }
  };

  const handleApprove = async () => {
    const finalMessage = isEditing ? editableRef.current.innerText : draft;
    try {
      await updateDoc(doc(db, 'incidents', incident.id), {
        alertDraft: finalMessage,
        alertSent: true,
        alertApprovedBy: user?.name || user?.displayName || user?.email || 'Admin',
        alertSentAt: new Date()
      });
      setIsEditing(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (e) {
      console.error("Failed to approve draft:", e);
    }
  };

  const handleToggleEdit = () => {
    if (isEditing) {
      // Locking it, save the draft state
      setDraft(editableRef.current.innerText);
    } else {
      // Entering edit mode
      setTimeout(() => {
        if (editableRef.current) {
          editableRef.current.focus();
        }
      }, 0);
    }
    setIsEditing(!isEditing);
  };

  if (!incident) return null;

  const isSent = incident.alertSent;
  const borderColor = isSent ? '#22D3A0' : '#F59E0B';
  const charCount = (isEditing && editableRef.current ? editableRef.current.innerText.length : draft.length);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-[#111318] border rounded-[8px] p-4 flex flex-col gap-3 shadow-lg relative ${className}`}
      style={{ borderColor: borderColor }}
    >
      {/* Header Row */}
      <div className="flex justify-between items-center mb-1">
        <div className="text-[10px] tracking-[0.1em] font-bold uppercase" style={{ color: borderColor, fontFamily: '"JetBrains Mono", monospace' }}>
          📱 ALERT DRAFT
        </div>
        <div className="text-[#3B82F6] text-[10px] bg-[#3B82F6]/10 px-2 py-0.5 rounded font-bold" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
          Powered by Gemini
        </div>
      </div>

      {/* Message Preview Box */}
      <div className="bg-[#0A0C10] border border-[#1E2230] rounded-[4px] p-3 relative flex flex-col group">
        {isGenerating ? (
          <div className="animate-pulse flex flex-col gap-2 py-2">
            <div className="h-3 bg-[#1E2230] rounded w-3/4"></div>
            <div className="h-3 bg-[#1E2230] rounded w-full"></div>
            <div className="h-3 bg-[#1E2230] rounded w-5/6"></div>
            <div className="text-[#5A6478] text-[10px] mt-2" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              <span className="inline-block animate-spin mr-2">⟳</span>
              Gemini is drafting alert...
            </div>
          </div>
        ) : (
          <>
            <div 
              ref={editableRef}
              contentEditable={isEditing && !isSent}
              suppressContentEditableWarning={true}
              className={`text-[#E8EDF5] text-[12px] whitespace-pre-wrap outline-none ${isEditing ? 'border-b border-[#3B82F6] min-h-[60px]' : ''}`}
              style={{ fontFamily: '"JetBrains Mono", monospace', lineHeight: '1.8' }}
              onInput={(e) => {
                if (isEditing) {
                  setDraft(e.currentTarget.innerText); // keep sync for charcount
                }
              }}
            >
              {draft}
            </div>
            {!isGenerating && !isSent && (
              <div className="flex justify-between items-center mt-3 pt-2">
                <div className="text-[#5A6478] text-[10px]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  [{charCount}]/160 characters
                </div>
                <button 
                  onClick={handleToggleEdit}
                  className="text-[#8A94A8] hover:text-white text-[11px] px-2 py-1 border border-[#2A3040] rounded-[4px] transition-colors"
                  style={{ fontFamily: '"Instrument Sans", sans-serif' }}
                >
                  {isEditing ? 'Lock' : 'Edit'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Buttons Row */}
      {isSent ? (
        <div className="flex justify-between items-center mt-1">
          <div className="text-[#22D3A0] text-[11px]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            ✓ Sent by {incident.alertApprovedBy || 'Admin'} at {incident.alertSentAt ? (incident.alertSentAt.toDate ? incident.alertSentAt.toDate().toLocaleTimeString() : new Date(incident.alertSentAt).toLocaleTimeString()) : new Date().toLocaleTimeString()}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-1">
          <button 
            onClick={handleApprove}
            disabled={isGenerating || !draft}
            className="flex-1 bg-[#22D3A0]/10 border border-[#22D3A0] text-[#22D3A0] rounded-[4px] py-1.5 text-[13px] hover:bg-[#22D3A0]/20 transition-colors disabled:opacity-50"
            style={{ fontFamily: '"Instrument Sans", sans-serif' }}
          >
            ✓ Approve & Mark Sent
          </button>
          
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-3 py-1.5 bg-transparent border border-[#2A3040] text-[#8A94A8] rounded-[4px] text-[13px] hover:text-white hover:border-[#5A6478] transition-colors disabled:opacity-50"
            style={{ fontFamily: '"Instrument Sans", sans-serif' }}
          >
            ↻ Regenerate
          </button>
          
          {onClose && (
            <button 
              onClick={onClose}
              className="px-3 py-1.5 bg-transparent border-none text-[#5A6478] text-[12px] hover:text-white transition-colors"
              style={{ fontFamily: '"Instrument Sans", sans-serif' }}
            >
              ✕ Dismiss
            </button>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute -top-10 left-0 right-0 mx-auto w-fit bg-[#22D3A0]/10 border border-[#22D3A0] text-[#22D3A0] px-4 py-1.5 rounded-[4px] text-[11px]"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          Alert marked as sent
        </motion.div>
      )}
    </motion.div>
  );
}
