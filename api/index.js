const admin = require("firebase-admin");
const cors = require("cors");
const express = require("express");
const axios = require("axios");
const port = 3000;

const app = express();

app.use(cors({
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"],
  credentials: true
}));
app.use(express.json());

var serviceAccount = require("./permissions.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://ytextension-500ff-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = admin.firestore();

// Timer Analytics Routes
app.post("/analytics/watch-time", async (req, res) => {
  try {
    const { userId, videoId, watchTime, title, url, lastWatched } = req.body;

    if (!userId || !videoId || watchTime === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const analyticsRef = db.collection("analytics").doc(`${userId}_${videoId}`);
    
    // Convert lastWatched to Firestore Timestamp
    const lastWatchedDate = new Date(lastWatched);
    
    await analyticsRef.set({
      userId,
      videoId,
      title,
      url,
      watchTime,
      lastWatched: admin.firestore.Timestamp.fromDate(lastWatchedDate),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    res.status(200).json({ message: "Watch time updated successfully" });
  } catch (error) {
    console.error("Error updating watch time:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/analytics/watch-time/:userId/:videoId", async (req, res) => {
  try {
    const { userId, videoId } = req.params;
    const analyticsRef = db.collection("analytics").doc(`${userId}_${videoId}`);
    const doc = await analyticsRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "No watch time data found" });
    }

    res.status(200).json(doc.data());
  } catch (error) {
    console.error("Error fetching watch time:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// Fetch summary from Flask and store in Firestore
app.post("/generate-summary", async (req, res) => {
  try {
    const { userId, videoId, summary } = req.body;

    if (!userId || !videoId || !summary) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Store summary in Firestore
    const summaryRef = db.collection("summaries").doc(`${userId}_${videoId}`);
    await summaryRef.set({ userId, videoId, summary });

    res.status(200).json({ message: "Summary saved successfully", summary });
  } catch (error) {
    console.error("Error generating or storing summary:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Fetch stored summary from Firestore
app.get("/fetch-summary/:userId/:videoId", async (req, res) => {
  try {
    const { userId, videoId } = req.params;
    const summaryRef = db.collection("summaries").doc(`${userId}_${videoId}`);
    const doc = await summaryRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Summary not found" });
    }

    res.status(200).json(doc.data());
  } catch (error) {
    console.error("Error fetching summary:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Notes-related routes

// Fetch notes
app.get("/notes/:userId/:videoId", async (req, res) => {
  try {
    const { userId, videoId } = req.params;
    const docRef = db.collection("notes").doc(`${userId}_${videoId}`);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ notes: [] });
    }

    res.status(200).json(doc.data());
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).send("Error fetching notes");
  }
});

// Delete a note
app.delete("/notes/:userId/:videoId/:noteIndex", async (req, res) => {
  try {
    const { userId, videoId, noteIndex } = req.params;
    const docRef = db.collection("notes").doc(`${userId}_${videoId}`);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).send("No notes found");
    }

    const notes = doc.data().notes;

    if (noteIndex < 0 || noteIndex >= notes.length) {
      return res.status(400).send("Invalid note index");
    }

    notes.splice(noteIndex, 1);
    await docRef.update({ notes });
    res.status(200).send("Note deleted successfully");
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).send("Error deleting note");
  }
});

// Save a new note
app.post("/save-note", async (req, res) => {
  try {
    const { videoId, content, timestamp, userId } = req.body;

    if (!videoId || !content || !timestamp || !userId) {
      return res.status(400).send({ message: "Missing required fields" });
    }

    const noteId = `${userId}_${videoId}`;
    const noteRef = db.collection("notes").doc(noteId);
    const existingDoc = await noteRef.get();

    if (existingDoc.exists) {
      const updatedNotes = [...existingDoc.data().notes, { content, timestamp }];
      await noteRef.update({ notes: updatedNotes });
    } else {
      await noteRef.set({
        userId,
        videoId,
        notes: [{ content, timestamp }],
      });
    }

    res.status(200).send({ message: "Note saved successfully" });
  } catch (error) {
    console.error("Error saving note:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
