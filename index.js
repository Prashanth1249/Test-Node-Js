const express = require("express");
const admin = require("firebase-admin");
const serviceAccount = require("./whizzyanalytics2-1-612da161fda5.json");

// Initialize Firestore
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();

// GET /getRiders — same logic as your cloud function
app.get("/getRiders", async (req, res) => {
  try {
    const ridersSnapshot = await db.collection("Riders").get();

    const ridersList = ridersSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name || null,
      isActive: doc.data().isActive || null,
      supervisor: doc.data().supervisor || null,
    }));

    res.status(200).json({
      count: ridersList.length,
      riders: ridersList,
    });
  } catch (error) {
    console.error("❌ Error fetching riders:", error);
    res.status(500).json({ error: "Failed to fetch riders" });
  }
});

// Start server
// app.listen(3000, () => {
//   console.log("✅ Server running on http://localhost:3000");
// });
 const PORT = process.env.PORT || 3000;

 app.listen(PORT, () => {
   console.log(`✅ Server running on http://localhost:${PORT}`);
 });
