import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../services/firebase';

export function useResponders() {
  const [responders, setResponders] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'responders'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setResponders(data);
    });
    return () => unsubscribe();
  }, []);

  return { responders };
}
