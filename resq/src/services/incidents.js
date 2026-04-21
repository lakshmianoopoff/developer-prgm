import { collection, addDoc, updateDoc, doc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function createIncident(incidentData, geminiTriage) {
  try {
    // Attempt to auto-assign
    let assignedTo = null;
    let assignedName = null;
    
    const respondersRef = collection(db, 'responders');
    const q = query(respondersRef, where("available", "==", true), where("department", "==", geminiTriage.type));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // Assign to the first available matching responder
      const responder = querySnapshot.docs[0];
      assignedTo = responder.id;
      assignedName = responder.data().name;
      
      // Update responder status to unavailable and set currentIncident
      // We will do this after we have the incident ID
    }

    const docRef = await addDoc(collection(db, 'incidents'), {
      ...incidentData,
      geminiTriage,
      status: assignedTo ? "assigned" : "active",
      assignedTo,
      assignedName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      resolvedAt: null
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
    if (status === 'resolved') {
      updates.resolvedAt = serverTimestamp();
    }
    await updateDoc(doc(db, 'incidents', id), updates);
  } catch (error) {
    console.error("Error updating incident: ", error);
    throw error;
  }
}
