import express from "express";
import { google } from "googleapis";
import { getFirestore } from "firebase-admin/firestore";
import admin from "firebase-admin";
import fs from "fs";

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(fs.readFileSync("firebaseServiceAccount.json", "utf8"));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = getFirestore();

// Auth using service account
const auth = new google.auth.GoogleAuth({
  keyFile: "service-account.json",
  scopes: ["https://www.googleapis.com/auth/documents", "https://www.googleapis.com/auth/drive"],
});
const docs = google.docs({ version: "v1", auth });
const drive = google.drive({ version: "v3", auth });

const router = express.Router();

// Format timestamp to hh:mm:ss
function formatTimestamp(seconds) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  }
  

router.post("/export-doc", async (req, res) => {
  const { userId, videoId, videoTitle } = req.body;

  try {
    // 1. Fetch notes from Firestore
    const docId = `${userId}_${videoId}`;
    const docRef = db.collection("notes").doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "Notes not found." });
    }

    const { notes } = docSnap.data();

    // 2. Create Google Doc
    const docMeta = await docs.documents.create({
      requestBody: {
        title: videoTitle ||  `Notes for ${videoId}`,
      },
    });

    const documentId = docMeta.data.documentId;

   // 3. Format and write content
const contentLines = notes.map((n, i) => {
  const timestamp = n.timestamp || 0;
  const formattedTime = formatTimestamp(timestamp);

  return `${i + 1}. [${formattedTime}] ${n.content}`;
});

const requests = [
  {
    insertText: {
      location: { index: 1 },
      text: `${videoTitle}\n\n` + contentLines.join("\n") + "\n",
    },
  },
];


    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests },
    });

    // 4. Make the doc shareable
    await drive.permissions.create({
      fileId: documentId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    const docLink = `https://docs.google.com/document/d/${documentId}/edit`;
    res.json({ docLink });
  } catch (err) {
    console.error("Export error:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));

    res.status(500).json({ error: "Failed to export notes" });
  }
});

export default router;
