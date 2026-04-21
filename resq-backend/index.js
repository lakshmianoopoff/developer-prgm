const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Haversine formula for distance calculation
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

app.post('/api/trigger-alerts', async (req, res) => {
  try {
    const { incidentId, title, severity, type, coordinates } = req.body;
    
    if (!coordinates) {
      return res.status(400).json({ error: "No coordinates provided for geofencing." });
    }

    // Mocking the Firebase Admin user fetch
    const mockUsers = [
      { email: 'nearby-responder@campus.edu', lat: coordinates.lat + 0.01, lng: coordinates.lng + 0.01 }, // ~1.5km
      { email: 'far-responder@campus.edu', lat: coordinates.lat + 0.05, lng: coordinates.lng + 0.05 }, // ~7.8km (Out of bounds)
      { email: 'staff@campus.edu', lat: coordinates.lat - 0.02, lng: coordinates.lng + 0.01 } // ~2.5km
    ];

    const RADIUS_KM = 5.0;
    
    // Geospatial Filtering
    const nearbyUsers = mockUsers.filter(u => {
      const dist = calculateDistance(coordinates.lat, coordinates.lng, u.lat, u.lng);
      return dist <= RADIUS_KM;
    });

    // Mock Email Trigger (Nodemailer could be used here)
    console.log(`[BACKEND NOTIFICATION ENGINE] Dispatched emails to ${nearbyUsers.length} users within ${RADIUS_KM}km radius for Incident: ${title}`);
    nearbyUsers.forEach(u => console.log(` - Email sent to: ${u.email}`));

    res.status(200).json({ success: true, notifiedCount: nearbyUsers.length });
  } catch (err) {
    console.error("Alert trigger failed:", err);
    res.status(500).json({ error: "Failed to trigger alerts" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`ResQ Notification Backend running on port ${PORT}`);
});
