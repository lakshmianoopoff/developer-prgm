import { collection, writeBatch, doc, getDocs, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

const hoursAgo = (hours) => {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

const minutesAgo = (minutes) => {
  return new Date(Date.now() - minutes * 60 * 1000);
}

const dummyUsers = [
  {
    uid: "demo-admin-001",
    name: "Dr. Rajesh Kumar",
    email: "rajesh.kumar@campus.edu",
    role: "admin",
    department: "Administration",
    available: true,
    createdAt: Timestamp.fromDate(new Date())
  },
  {
    uid: "demo-responder-001",
    name: "Nurse Priya Menon",
    email: "priya.menon@campus.edu",
    role: "responder",
    department: "medical",
    available: true,
    currentIncident: null,
    createdAt: Timestamp.fromDate(new Date())
  },
  {
    uid: "demo-responder-002",
    name: "Officer Arun Das",
    email: "arun.das@campus.edu",
    role: "responder",
    department: "security",
    available: false,
    currentIncident: "demo-incident-001",
    createdAt: Timestamp.fromDate(new Date())
  },
  {
    uid: "demo-responder-003",
    name: "Suresh Pillai",
    email: "suresh.pillai@campus.edu",
    role: "responder",
    department: "maintenance",
    available: true,
    currentIncident: null,
    createdAt: Timestamp.fromDate(new Date())
  },
  {
    uid: "demo-responder-004",
    name: "Dr. Anitha Nair",
    email: "anitha.nair@campus.edu",
    role: "responder",
    department: "medical",
    available: false,
    currentIncident: "demo-incident-003",
    createdAt: Timestamp.fromDate(new Date())
  },
  {
    uid: "demo-reporter-001",
    name: "Lakshmi S",
    email: "lakshmi.s@student.campus.edu",
    role: "reporter",
    department: "Computer Science",
    available: true,
    createdAt: Timestamp.fromDate(new Date())
  },
  {
    uid: "demo-reporter-002",
    name: "Arjun Krishnan",
    email: "arjun.k@student.campus.edu",
    role: "reporter",
    department: "Electronics",
    available: true,
    createdAt: Timestamp.fromDate(new Date())
  },
  {
    uid: "demo-reporter-003",
    name: "Meera Thomas",
    email: "meera.t@student.campus.edu",
    role: "reporter",
    department: "Civil Engineering",
    available: true,
    createdAt: Timestamp.fromDate(new Date())
  }
];

const dummyResponders = [
  {
    uid: "demo-responder-001",
    name: "Nurse Priya Menon",
    department: "medical",
    available: true,
    currentIncident: null,
    email: "priya.menon@campus.edu"
  },
  {
    uid: "demo-responder-002",
    name: "Officer Arun Das",
    department: "security",
    available: false,
    currentIncident: "demo-incident-001",
    email: "arun.das@campus.edu"
  },
  {
    uid: "demo-responder-003",
    name: "Suresh Pillai",
    department: "maintenance",
    available: true,
    currentIncident: null,
    email: "suresh.pillai@campus.edu"
  },
  {
    uid: "demo-responder-004",
    name: "Dr. Anitha Nair",
    department: "medical",
    available: false,
    currentIncident: "demo-incident-003",
    email: "anitha.nair@campus.edu"
  }
];

const dummyIncidents = [
  {
    id: "demo-incident-001",
    title: "Student Collapsed in Library",
    description: "A third year B.Tech student collapsed near the reference section on the second floor of the main library. Suspected heat exhaustion. Student is conscious but disoriented. Requires immediate medical attention.",
    type: "medical",
    severity: "critical",
    status: "in_progress",
    location: "Main Library, Second Floor, Block B",
    coordinates: { lat: 10.3559, lng: 76.2130 },
    reportedBy: "demo-reporter-001",
    reporterName: "Lakshmi S",
    assignedTo: "demo-responder-002",
    assignedName: "Officer Arun Das",
    geminiTriage: {
      severity: "critical",
      type: "medical",
      summary: "Student collapsed with suspected heat exhaustion requiring immediate medical response.",
      instructions: [
        "Clear the area around the student immediately",
        "Do not move the student unless in immediate danger",
        "Loosen tight clothing and provide fresh air",
        "Monitor consciousness and breathing every 2 minutes",
        "Prepare for ambulance arrival at main entrance"
      ],
      estimatedResponseTime: "3-5 minutes",
      resourcesNeeded: [
        "Medical team",
        "First aid kit",
        "Stretcher",
        "Ambulance on standby"
      ]
    },
    alertDraft: "🚨 CRITICAL ALERT\nStudent collapsed at Main Library Block B. Possible heat exhaustion. Medical team dispatched.\n- ResQ Campus Command",
    alertSent: true,
    alertApprovedBy: "Dr. Rajesh Kumar",
    alertSentAt: Timestamp.fromDate(hoursAgo(2)),
    closureReport: null,
    createdAt: Timestamp.fromDate(hoursAgo(2)),
    updatedAt: Timestamp.fromDate(hoursAgo(1.5)),
    assignedAt: Timestamp.fromDate(hoursAgo(1.8)),
    enRouteAt: Timestamp.fromDate(hoursAgo(1.7)),
    onSceneAt: Timestamp.fromDate(hoursAgo(1.5)),
    resolvedAt: null,
    responseTimeMinutes: null
  },
  {
    id: "demo-incident-002",
    title: "Water Leakage in Canteen",
    description: "Severe water leakage from overhead pipe in the main canteen near the serving counter. Water is pooling on the floor creating a slip hazard for students. Canteen operations partially disrupted.",
    type: "maintenance",
    severity: "moderate",
    status: "resolved",
    location: "Main Canteen, Ground Floor, Block A",
    coordinates: { lat: 10.3562, lng: 76.2135 },
    reportedBy: "demo-reporter-002",
    reporterName: "Arjun Krishnan",
    assignedTo: "demo-responder-003",
    assignedName: "Suresh Pillai",
    geminiTriage: {
      severity: "moderate",
      type: "maintenance",
      summary: "Water pipe leakage causing floor hazard in canteen requiring maintenance intervention.",
      instructions: [
        "Place wet floor warning signs immediately",
        "Redirect students away from affected area",
        "Locate and shut the water supply valve",
        "Contact plumbing team for pipe repair",
        "Document damage with photographs"
      ],
      estimatedResponseTime: "10-15 minutes",
      resourcesNeeded: [
        "Maintenance team",
        "Plumbing tools",
        "Wet floor signs",
        "Mop and drainage equipment"
      ]
    },
    alertDraft: "🟡 MODERATE ALERT\nWater leakage at Main Canteen Block A. Slip hazard present. Maintenance team responding.\n- ResQ Campus Command",
    alertSent: true,
    alertApprovedBy: "Dr. Rajesh Kumar",
    alertSentAt: Timestamp.fromDate(hoursAgo(5)),
    closureReport: "At 08:45 AM, a water leakage was reported at the Main Canteen Block A by student Arjun Krishnan. The overhead pipe burst caused significant water pooling creating a slip hazard. Suresh Pillai from the maintenance team responded and resolved the incident in 23 minutes.",
    createdAt: Timestamp.fromDate(hoursAgo(6)),
    updatedAt: Timestamp.fromDate(hoursAgo(5)),
    assignedAt: Timestamp.fromDate(hoursAgo(5.8)),
    enRouteAt: Timestamp.fromDate(hoursAgo(5.7)),
    onSceneAt: Timestamp.fromDate(hoursAgo(5.5)),
    resolvedAt: Timestamp.fromDate(hoursAgo(5)),
    responseTimeMinutes: 23
  },
  {
    id: "demo-incident-003",
    title: "Fire Alarm Triggered — Chemistry Lab",
    description: "Fire alarm has been triggered in the Chemistry laboratory on the third floor of the Science block. Smoke detected near the storage area. Lab was occupied by approximately 30 students during practical session. Evacuation in progress.",
    type: "fire",
    severity: "critical",
    status: "assigned",
    location: "Chemistry Lab, Third Floor, Science Block",
    coordinates: { lat: 10.3555, lng: 76.2125 },
    reportedBy: "demo-reporter-003",
    reporterName: "Meera Thomas",
    assignedTo: "demo-responder-004",
    assignedName: "Dr. Anitha Nair",
    geminiTriage: {
      severity: "critical",
      type: "fire",
      summary: "Fire alarm with smoke detected in occupied Chemistry lab requiring immediate evacuation and fire response.",
      instructions: [
        "Activate full campus evacuation protocol immediately",
        "Call fire department — do not wait to assess",
        "Ensure all 30 students evacuate via stairwell only",
        "Do not use elevators during evacuation",
        "Account for all students at assembly point C",
        "Keep fire extinguisher ready but do not enter lab"
      ],
      estimatedResponseTime: "2-3 minutes",
      resourcesNeeded: [
        "Fire department",
        "Security team",
        "First aid team",
        "Fire extinguisher",
        "Student headcount roster"
      ]
    },
    alertDraft: "🚨 CRITICAL ALERT\nFire alarm + smoke at Chemistry Lab Science Block 3F. Evacuation in progress. Fire dept notified.\n- ResQ Campus Command",
    alertSent: false,
    alertApprovedBy: null,
    alertSentAt: null,
    closureReport: null,
    createdAt: Timestamp.fromDate(minutesAgo(30)),
    updatedAt: Timestamp.fromDate(minutesAgo(25)),
    assignedAt: Timestamp.fromDate(minutesAgo(28)),
    enRouteAt: null,
    onSceneAt: null,
    resolvedAt: null,
    responseTimeMinutes: null
  },
  {
    id: "demo-incident-004",
    title: "Broken Chair Injury — Classroom 204",
    description: "A student sustained a minor cut on their arm after a plastic chair broke during class in Room 204, Block C. The injury is superficial and the student is stable. First aid needed.",
    type: "medical",
    severity: "minor",
    status: "resolved",
    location: "Classroom 204, Second Floor, Block C",
    coordinates: { lat: 10.3565, lng: 76.2140 },
    reportedBy: "demo-reporter-001",
    reporterName: "Lakshmi S",
    assignedTo: "demo-responder-001",
    assignedName: "Nurse Priya Menon",
    geminiTriage: {
      severity: "minor",
      type: "medical",
      summary: "Minor injury from broken furniture requiring basic first aid treatment.",
      instructions: [
        "Apply pressure to the cut with clean cloth",
        "Clean wound with antiseptic solution",
        "Apply bandage if wound is superficial",
        "Monitor student for signs of shock",
        "Remove broken chair from classroom"
      ],
      estimatedResponseTime: "5-10 minutes",
      resourcesNeeded: [
        "First aid kit",
        "Antiseptic solution",
        "Bandages"
      ]
    },
    alertDraft: "🟢 MINOR ALERT\nStudent minor injury at Classroom 204 Block C. First aid team responding.\n- ResQ Campus Command",
    alertSent: true,
    alertApprovedBy: "Dr. Rajesh Kumar",
    alertSentAt: Timestamp.fromDate(hoursAgo(8)),
    closureReport: "At 06:30 AM, a minor injury was reported at Classroom 204 Block C by student Lakshmi S. A student sustained a superficial cut from a broken chair. Nurse Priya Menon responded and resolved the incident in 8 minutes.",
    createdAt: Timestamp.fromDate(hoursAgo(9)),
    updatedAt: Timestamp.fromDate(hoursAgo(8)),
    assignedAt: Timestamp.fromDate(hoursAgo(8.8)),
    enRouteAt: Timestamp.fromDate(hoursAgo(8.7)),
    onSceneAt: Timestamp.fromDate(hoursAgo(8.5)),
    resolvedAt: Timestamp.fromDate(hoursAgo(8)),
    responseTimeMinutes: 8
  },
  {
    id: "demo-incident-005",
    title: "Suspicious Person Near Girls Hostel",
    description: "Security guard reported an unknown individual loitering near the entrance of the girls hostel for over 20 minutes. Person has no campus ID and refused to identify themselves. Situation is tense but non-violent currently.",
    type: "security",
    severity: "moderate",
    status: "active",
    location: "Girls Hostel Main Gate, North Campus",
    coordinates: { lat: 10.3570, lng: 76.2145 },
    reportedBy: "demo-reporter-002",
    reporterName: "Arjun Krishnan",
    assignedTo: null,
    assignedName: null,
    geminiTriage: {
      severity: "moderate",
      type: "security",
      summary: "Unknown individual without ID loitering near girls hostel requiring security intervention.",
      instructions: [
        "Send two security officers to the location",
        "Do not approach alone — wait for backup",
        "Request ID and reason for presence",
        "Contact local police if person refuses to comply",
        "Ensure hostel warden is informed and gates secured"
      ],
      estimatedResponseTime: "5-8 minutes",
      resourcesNeeded: [
        "Security team (2 officers)",
        "Police contact on standby",
        "CCTV footage access"
      ]
    },
    alertDraft: "🟡 MODERATE ALERT\nSuspicious individual at Girls Hostel Gate. No campus ID. Security team needed immediately.\n- ResQ Campus Command",
    alertSent: false,
    alertApprovedBy: null,
    alertSentAt: null,
    closureReport: null,
    createdAt: Timestamp.fromDate(minutesAgo(15)),
    updatedAt: Timestamp.fromDate(minutesAgo(15)),
    assignedAt: null,
    enRouteAt: null,
    onSceneAt: null,
    resolvedAt: null,
    responseTimeMinutes: null
  },
  {
    id: "demo-incident-006",
    title: "Power Outage — Computer Lab",
    description: "Complete power failure in Computer Lab 101 during ongoing examination. 45 students affected. UPS systems failed to activate. Exam temporarily suspended.",
    type: "maintenance",
    severity: "minor",
    status: "resolved",
    location: "Computer Lab 101, Block D",
    coordinates: { lat: 10.3548, lng: 76.2120 },
    reportedBy: "demo-reporter-003",
    reporterName: "Meera Thomas",
    assignedTo: "demo-responder-003",
    assignedName: "Suresh Pillai",
    geminiTriage: {
      severity: "minor",
      type: "maintenance",
      summary: "Power failure in exam hall requiring immediate electrical maintenance response.",
      instructions: [
        "Check main circuit breaker for the block",
        "Contact electrical maintenance immediately",
        "Inform examination controller to pause exam",
        "Provide alternative venue if outage exceeds 15 min",
        "Document exam progress for rescheduling"
      ],
      estimatedResponseTime: "10-20 minutes",
      resourcesNeeded: [
        "Electrical maintenance team",
        "Backup generator access",
        "Examination controller"
      ]
    },
    alertDraft: "🟢 MINOR ALERT\nPower failure at Computer Lab 101 Block D during exam. Maintenance team dispatched.\n- ResQ Campus Command",
    alertSent: true,
    alertApprovedBy: "Dr. Rajesh Kumar",
    alertSentAt: Timestamp.fromDate(hoursAgo(12)),
    closureReport: "At 02:15 AM, a power outage was reported at Computer Lab 101 Block D by student Meera Thomas. A tripped circuit breaker caused complete power failure affecting an ongoing examination. Suresh Pillai from maintenance restored power in 18 minutes.",
    createdAt: Timestamp.fromDate(hoursAgo(13)),
    updatedAt: Timestamp.fromDate(hoursAgo(12)),
    assignedAt: Timestamp.fromDate(hoursAgo(12.8)),
    enRouteAt: Timestamp.fromDate(hoursAgo(12.7)),
    onSceneAt: Timestamp.fromDate(hoursAgo(12.5)),
    resolvedAt: Timestamp.fromDate(hoursAgo(12)),
    responseTimeMinutes: 18
  }
];

export const seedDemoData = async () => {
  try {
    const batch = writeBatch(db);
    
    // Seed users
    dummyUsers.forEach(user => {
      const userRef = doc(db, 'users', user.uid);
      batch.set(userRef, user, { merge: true });
    });
    
    // Seed responders
    dummyResponders.forEach(responder => {
      const responderRef = doc(db, 'responders', responder.uid);
      batch.set(responderRef, responder, { merge: true });
    });
    
    // Seed incidents
    dummyIncidents.forEach(incident => {
      const incidentRef = doc(db, 'incidents', incident.id);
      batch.set(incidentRef, incident, { merge: true });
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  }
};

export const clearDemoData = async () => {
  try {
    const collections = ['users', 'responders', 'incidents'];
    let deleteCount = 0;
    
    for (const coll of collections) {
      const querySnapshot = await getDocs(collection(db, coll));
      const batch = writeBatch(db);
      
      querySnapshot.forEach((document) => {
        if (document.id.startsWith('demo-')) {
          batch.delete(doc(db, coll, document.id));
          deleteCount++;
        }
      });
      
      if (deleteCount > 0) {
        await batch.commit();
      }
    }
    
    return true;
  } catch (error) {
    console.error('Clear data failed:', error);
    throw error;
  }
};
