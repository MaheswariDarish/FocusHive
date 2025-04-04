const admin = require("firebase-admin");
const cors = require("cors");
const express = require("express");
const { OAuth2Client } = require('google-auth-library');
require("dotenv").config();

const port = 3031;
const app = express();

// Initialize Google OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// CORS configuration
app.use(cors({
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json());

// Initialize Firebase Admin
var serviceAccount = require("./permissions.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://ytextension-500ff-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = admin.firestore();

// Authentication Middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Auth Routes
app.post("/auth/google", async (req, res) => {
  try {
    const { userInfo } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Authorization header required" });
    }

    const accessToken = authHeader.split('Bearer ')[1];
    
    if (!accessToken || !userInfo) {
      return res.status(400).json({ message: "Access token and user info are required" });
    }

    try {
      // Verify the access token using Google's tokeninfo endpoint
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`
      );
      
      if (!response.ok) {
        throw new Error('Invalid access token');
      }
      
      const tokenData = await response.json();
      const userId = tokenData.sub;

      if (!userId) {
        throw new Error('Invalid token data');
      }

      // Create or update user in Firebase
      try {
        await admin.auth().updateUser(userId, {
          email: userInfo.email,
          displayName: userInfo.name,
          photoURL: userInfo.picture
        });
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          await admin.auth().createUser({
            uid: userId,
            email: userInfo.email,
            displayName: userInfo.name,
            photoURL: userInfo.picture
          });
        } else {
          throw error;
        }
      }

      // Create a custom token
      const customToken = await admin.auth().createCustomToken(userId);
      
      // Store user session
      await db.collection('users').doc(userId).set({
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        lastLogin: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      res.status(200).json({ 
        customToken,
        uid: userId,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture
      });

    } catch (error) {
      console.error("Token verification error:", error);
      res.status(401).json({ message: "Invalid token" });
    }

  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ 
      message: "Authentication failed",
      error: error.message 
    });
  }
});

// Timer Analytics Routes
app.post("/analytics/watch-time", authenticate, async (req, res) => {
  try {
    const { videoId, watchTime, title, url, lastWatched } = req.body;
    const userId = req.user.uid;

    if (!videoId || watchTime === undefined) {
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

app.get("/analytics/watch-time/:videoId", authenticate, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user.uid;
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

// Notes Routes
app.get("/notes/:videoId", authenticate, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user.uid;
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

app.delete("/notes/:videoId/:noteIndex", authenticate, async (req, res) => {
  try {
    const { videoId, noteIndex } = req.params;
    const userId = req.user.uid;
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

app.post("/save-note", authenticate, async (req, res) => {
  try {
    const { videoId, content, timestamp } = req.body;
    const userId = req.user.uid;

    if (!videoId || !content || !timestamp) {
      return res.status(400).send({ message: "Missing required fields" });
    }

    const docId = `${userId}_${videoId}`;
    const noteRef = db.collection("notes").doc(docId);
    const existingDoc = await noteRef.get();

    if (existingDoc.exists) {
      const updatedNotes = [...existingDoc.data().notes, { content, timestamp }];
      await noteRef.update({ 
        notes: updatedNotes,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      await noteRef.set({
        userId,
        videoId,
        notes: [{ content, timestamp }],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    res.status(200).send({ message: "Note saved successfully" });
  } catch (error) {
    console.error("Error saving note:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

// Summary Routes
app.post("/generate-summary", authenticate, async (req, res) => {
  try {
    const { videoId, summary } = req.body;
    const userId = req.user.uid;

    if (!videoId || !summary) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const summaryRef = db.collection("summaries").doc(`${userId}_${videoId}`);
    await summaryRef.set({
      userId,
      videoId,
      summary,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ message: "Summary saved successfully", summary });
  } catch (error) {
    console.error("Error saving summary:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/fetch-summary/:videoId", authenticate, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user.uid;
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

// Save Summary Route
app.post("/save-summary", authenticate, async (req, res) => {
  try {
    const { videoId, summary } = req.body;
    const userId = req.user.uid;

    if (!videoId || !summary) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Save summary to Firestore
    await db.collection("summaries").doc(`${userId}_${videoId}`).set({
      userId,
      videoId,
      summary,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    res.status(200).json({ message: "Summary saved successfully" });
  } catch (error) {
    console.error("Error saving summary:", error);
    res.status(500).json({ message: "Failed to save summary" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});