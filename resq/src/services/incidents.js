import { collection, addDoc, updateDoc, doc, getDocs, getDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { generateClosureReport } from './gemini';

export async function createIncident(incidentData, geminiTriage) {
  try {
    // Attempt to auto-assign
    let assignedTo = null;
    let assignedName = null;
    
    const respondersRef = collection(db, 'responders');
    const q = query(respondersRef, where("available", "==", true), where("department", "==", geminiTriage.type));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const responder = querySnapshot.docs[0];
      assignedTo = responder.id;
      assignedName = responder.data().name;
    }

    const docRef = await addDoc(collection(db, 'incidents'), {
      ...incidentData,
      geminiTriage,
      status: assignedTo ? "assigned" : "active",
      assignedTo,
      assignedName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      assignedAt: assignedTo ? serverTimestamp() : null,
      enRouteAt: null,
      onSceneAt: null,
      resolvedAt: null,
      closureReport: null,
      responseTimeMinutes: null
    });

    if (assignedTo) {
      await updateDoc(doc(db, 'responders', assignedTo), {
        available: false,
        currentIncident: docRef.id
      });
    }

    return docRef.id;
  } catch (error) {
    console.error("Error creating incident: ", error);
    throw error;
  }
}

export async function updateIncidentStatus(id, status) {
  try {
    const updates = { status, updatedAt: serverTimestamp() };
    if (status === 'assigned') {
      updates.assignedAt = serverTimestamp();
    } else if (status === 'in_progress') {
      updates.enRouteAt = serverTimestamp();
    } else if (status === 'on_scene') {
      updates.onSceneAt = serverTimestamp();
    } else if (status === 'resolved') {
      updates.resolvedAt = serverTimestamp();
    }
    
    await updateDoc(doc(db, 'incidents', id), updates);

    // Auto-generate AI closure report asynchronously if resolved
    if (status === 'resolved') {
      // Fetch fresh document to get timestamps and data
      const docSnap = await getDoc(doc(db, 'incidents', id));
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Calculate response time
        let responseMinutes = 0;
        if (data.createdAt && data.resolvedAt) {
          const created = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
          const resolved = data.resolvedAt.toDate ? data.resolvedAt.toDate() : new Date(data.resolvedAt);
          responseMinutes = Math.round((resolved - created) / 60000);
        }
        
        // Don't block UI thread, let this run in background
        generateClosureReport(data, responseMinutes).then(async (report) => {
          await updateDoc(doc(db, 'incidents', id), {
            closureReport: report,
            responseTimeMinutes: responseMinutes
          });
        }).catch(err => console.error("Error generating closure report in background:", err));
      }
    }
  } catch (error) {
    console.error("Error updating incident: ", error);
    throw error;
  }
}
