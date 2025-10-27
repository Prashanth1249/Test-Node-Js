require('dotenv').config();
const express = require("express");
const cors = require("cors"); 
const admin = require("firebase-admin");
const bodyParser = require("body-parser");

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
// app.use(express.json());
app.use(cors({
  origin: "*", // 👈 if your frontend runs on Vite dev server
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(bodyParser.json({ limit: "50mb" }));


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
    console.log(req.body);
    console.log(req);
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

app.post("/insertThousandRiders", async (req, res) => {
  try {
    const collectionName = "DummyRiders-Express";  
    const collectionRef = db.collection(collectionName);

    let batch = db.batch();
    let counter = 0;

    for (let i = 1; i <= 1000; i++) {
      const docId = i.toString();               
      const docRef = collectionRef.doc(docId);

      batch.set(docRef, {
        name: `Rider_${i}`,
        isActive: true,
        supervisor: "Manager A",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      counter++;
      if (counter === 500 || i === 1000) {
        await batch.commit();
        batch = db.batch();
        counter = 0;
      }
    }

    return res.status(201).json({
      message: `✅ Successfully inserted 1000 riders into collection '${collectionName}' with document IDs 1 to 1000`
    });
  } catch (error) {
    console.error("❌ Error inserting dummy riders:", error);
    return res.status(500).json({ error: "Failed to insert dummy riders" });
  }
});


app.post("/bulkAddVehicles", async (req, res) => {
  try {
    const vehicles = req.body;

    if (!Array.isArray(vehicles) || vehicles.length === 0) {
      return res.status(400).json({ error: "Body must be a non-empty array" });
    }

    console.log(`Received ${vehicles.length} vehicle records.`);

    const chunkSize = 500;
    const chunks = [];

    for (let i = 0; i < vehicles.length; i += chunkSize) {
      chunks.push(vehicles.slice(i, i + chunkSize));
    }

    
    for (const [index, chunk] of chunks.entries()) {
      const batch = db.batch();

      chunk.forEach((vehicle) => {
        const docRef = db.collection("Vehicles").doc(vehicle["Plate Number"]); 
        batch.set(docRef, {
          plateNumber: vehicle["Plate Number"] || null,
          make: vehicle["Make"] || null,
          model: vehicle["Model"] || null,
          ownershipType: vehicle["Ownership Type"] || null,
          from: vehicle["From"] || null,
          to: vehicle["To"] || null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();
      console.log(`✅ Chunk ${index + 1}/${chunks.length} inserted (${chunk.length} records)`);
    }

    res.status(200).json({
      success: true,
      message: `${vehicles.length} vehicles inserted successfully in ${chunks.length} chunks.`,
    });
  } catch (error) {
    console.error("❌ Error inserting vehicles:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/getVehicles", async (req, res) => {
  try {
    //const snapshot = await db.collection("Vehicles").get();
    const snapshot = await db.collection("Vehicles").limit(100).get();

    if (snapshot.empty) {
      return res.status(200).json({
        success: true,
        total: 0,
        vehicles: [],
        message: "No vehicles found."
      });
    }

    const vehicles = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        plateNumber: data.plateNumber || "",
        make: data.make || "",
        model: data.model || "",
        ownershipType: data.ownershipType || "",
        from: data.from || "",
        to: data.to || ""
      };
    });

    res.status(200).json({
      success: true,
      total: vehicles.length,
      vehicles
    });
  } catch (error) {
    console.error("❌ Error fetching vehicles:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/updateVehicle/:plateNumber", async (req, res) => {
  try {
    const plateNumber = req.params.plateNumber;
    const updateData = req.body;

    if (!plateNumber) {
      return res.status(400).json({ error: "Vehicle plate number is required" });
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "Request body must contain update data" });
    }

    const docRef = db.collection("Vehicles").doc(plateNumber);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return res.status(404).json({ error: `Vehicle ${plateNumber} not found` });
    }

    await docRef.update({
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      success: true,
      message: `✅ Vehicle ${plateNumber} updated successfully`,
      updatedFields: updateData,
    });
  } catch (error) {
    console.error("❌ Error updating vehicle:", error);
    return res.status(500).json({ error: "Failed to update vehicle" });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
