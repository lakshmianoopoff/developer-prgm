import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../services/firebase';

export function useIncidents(options = {}) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const onNewIncidentRef = useRef(options.onNewIncident);
  useEffect(() => {
    onNewIncidentRef.current = options.onNewIncident;
  }, [options.onNewIncident]);

  useEffect(() => {
    let isInitialLoad = true;
    const q = query(collection(db, 'incidents'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });

      if (!isInitialLoad && onNewIncidentRef.current) {
        querySnapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            onNewIncidentRef.current({ id: change.doc.id, ...change.doc.data() });
          }
        });
      }

      setIncidents(data);
      setLoading(false);
      isInitialLoad = false;
    }, (err) => {
       console.error("Error fetching incidents", err);
       setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { incidents, loading };
}
