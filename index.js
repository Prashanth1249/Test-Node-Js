const express = require("express");
const admin = require("firebase-admin");

const serviceAccount = {
  type: process.env.TYPE,
  project_id: process.env.PROJECT_ID,
  private_key_id: process.env.PRIVATE_KEY_ID,
  private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'), 
  client_email: process.env.CLIENT_EMAIL,
  client_id: process.env.CLIENT_ID,
  auth_uri: process.env.AUTH_URI,
  token_uri: process.env.TOKEN_URI,
  auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.CLIENT_X509_CERT_URL,
  universe_domain: process.env.UNIVERSE_DOMAIN,
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const app = express();

app.get("/getRiders", async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Only GET method is allowed" });
  }

  try {
    const ridersSnapshot = await db.collection("Riders").get();
    const ridersList = ridersSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name || null,
      isActive: doc.data().isActive || null,
      supervisor: doc.data().supervisor || null
    }));

    return res.status(200).json({
      count: ridersList.length,
      riders: ridersList
    });
  } catch (error) {
    console.error("Error fetching riders:", error);
    return res.status(500).json({ error: "Failed to fetch riders" });
  }
});


app.post("/addTestCollectionBulk", async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST method is allowed" });
  }
  try {
    const data = req.body;
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: "Request body must be a non-empty array" });
    }

    if (data.length > 1000) {
      return res.status(400).json({ error: "Maximum 1000 records allowed per request" });
    }

    const batch = db.batch();
    const collectionRef = db.collection("Express-Collection");

    data.forEach((item, index) => {
      const docId = (index + 1).toString();
      const docRef = collectionRef.doc(docId);
      batch.set(docRef, {
        name: item.name || null,
        isActive: item.isActive ?? true,
        supervisor: item.supervisor || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    return res.status(201).json({
      message: `✅ Successfully inserted ${data.length} records into Express-Collection with numeric IDs`
    });
  } catch (error) {
    console.error("❌ Error inserting data:", error);
    return res.status(500).json({ error: "Failed to insert records" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
