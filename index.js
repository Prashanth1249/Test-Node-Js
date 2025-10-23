const express = require("express");
const admin = require("firebase-admin");

// ✅ Parse JSON from env variable
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const app = express();

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
