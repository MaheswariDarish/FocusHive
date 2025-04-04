import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { ArrowLeft } from "lucide-react";
import SummarySection from "../components/SummarySection";
import NotesSection from "../components/NotesSection";
import "./NotesDetailsPage.css";

const NotesDetailsPage = ({ userId }) => {
    const { videoId } = useParams();
    const navigate = useNavigate();
    const [videoTitle, setVideoTitle] = useState("Loading...");
    const [summary, setSummary] = useState("");
    const [notes, setNotes] = useState([]);

    userId = "user123"; // Hardcoded for now

    const formatTimestamp = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    };

    useEffect(() => {
        const fetchVideoDetails = async () => {
            try {
                const response = await fetch(
                    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${import.meta.env.VITE_YOUTUBE_API_KEY}`
                );
                const data = await response.json();
                const snippet = data.items[0]?.snippet;
                setVideoTitle(snippet?.title || "Untitled Video");
            } catch (error) {
                console.error("Error fetching video details:", error);
                setVideoTitle("Error Loading Video Title");
            }
        };

        fetchVideoDetails();
    }, [videoId]);

    useEffect(() => {
        const docId = `${userId}_${videoId}`;
        const noteRef = doc(db, "notes", docId);

        const unsubscribe = onSnapshot(noteRef, (docSnap) => {
            if (docSnap.exists()) {
                const notesData = docSnap.data().notes || [];
                setNotes(notesData.map((note, index) => ({
                    id: index,
                    text: note.content,
                    timestamp: formatTimestamp(note.timestamp)
                })));
            }
        });

        return () => unsubscribe(); // Cleanup listener on unmount
    }, [videoId, userId]);

    const handleCreateNote = async (text) => {
        try {
            const userInput = prompt("Enter timestamp (hh:mm:ss) or leave empty for 0s:", "00:00:00");
            let timestampInSeconds = 0;
            if (userInput) {
                const timeParts = userInput.split(":").map(Number);
                if (timeParts.length === 3) {
                    const [hh, mm, ss] = timeParts;
                    timestampInSeconds = hh * 3600 + mm * 60 + ss;
                }
            }

            const docId = `${userId}_${videoId}`;
            const noteRef = doc(db, "notes", docId);
            const docSnap = await getDoc(noteRef);

            let existingNotes = docSnap.exists() ? docSnap.data().notes || [] : [];
            existingNotes.push({ content: text, timestamp: timestampInSeconds });

            await setDoc(noteRef, { userId, videoId, notes: existingNotes }, { merge: true });
        } catch (error) {
            console.error("Error creating note:", error);
        }
    };

    const handleEditNote = async (noteIndex, newText) => {
        try {
            const docId = `${userId}_${videoId}`;
            const noteRef = doc(db, "notes", docId);
            const docSnap = await getDoc(noteRef);

            if (docSnap.exists()) {
                let notesData = docSnap.data().notes || [];
                if (noteIndex >= 0 && noteIndex < notesData.length) {
                    notesData[noteIndex].content = newText;
                    await updateDoc(noteRef, { notes: notesData });
                }
            }
        } catch (error) {
            console.error("Error updating note:", error);
        }
    };

    const handleDeleteNote = async (noteIndex) => {
        try {
            const docId = `${userId}_${videoId}`;
            const noteRef = doc(db, "notes", docId);
            const docSnap = await getDoc(noteRef);

            if (docSnap.exists()) {
                let notesData = docSnap.data().notes || [];
                if (noteIndex >= 0 && noteIndex < notesData.length) {
                    notesData.splice(noteIndex, 1);
                    await updateDoc(noteRef, { notes: notesData });
                }
            }
        } catch (error) {
            console.error("Error deleting note:", error);
        }
    };

    // ✅ Export Notes to Google Docs
    const handleExportToDocs = async () => {
        try {
            const response = await fetch("http://localhost:5000/export-doc", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, videoId }),
            });

            const data = await response.json();
            if (data.docLink) {
                window.open(data.docLink, "_blank"); // Open the Google Doc
            } else {
                alert(data.error || "Export failed.");
            }
        } catch (error) {
            console.error("Error exporting notes:", error);
        }
    };

    return (
        <div className="notes-details-page">
            <div className="notes-details-header">
                <button className="back-button" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                    Back
                </button>
                <h1 className="video-title">{videoTitle}</h1>
                {/* Export to Docs Button */}
                <button className="export-button" onClick={handleExportToDocs}>
                    Export to Google Docs
                </button>
            </div>
            <div className="notes-details-content">
                <SummarySection userId={userId} videoId={videoId} />
                <NotesSection
                    notes={notes}
                    videoId={videoId}
                    onCreate={handleCreateNote}
                    onEdit={handleEditNote}
                    onDelete={handleDeleteNote}
                />
            </div>
        </div>
    );
};

export default NotesDetailsPage;
