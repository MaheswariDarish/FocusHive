import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, where, getDocs, addDoc, doc, deleteDoc, updateDoc } from "firebase/firestore";
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
    const [summaryDocId, setSummaryDocId] = useState(null);

    userId = "user123"; // Hardcoded for now

    // Convert timestamp (seconds) to HH:MM:SS format
    const formatTimestamp = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    };

    useEffect(() => {
        const fetchVideoDetails = async () => {
            try {
                console.log("Fetching video details...");
                const response = await fetch(
                    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${import.meta.env.VITE_YOUTUBE_API_KEY}`
                );
                const data = await response.json();
                const snippet = data.items[0]?.snippet;
                setVideoTitle(snippet?.title || "Untitled Video");
                console.log("Video title fetched:", snippet?.title);
            } catch (error) {
                console.error("Error fetching video details:", error);
                setVideoTitle("Error Loading Video Title");
            }
        };

        const fetchData = async () => {
            try {
                console.log("Fetching data from Firestore...");

                // Fetch summary
                const summaryQuery = query(
                    collection(db, "summaries"),
                    where("userId", "==", userId),
                    where("videoId", "==", videoId)
                );
                const summarySnapshot = await getDocs(summaryQuery);
                if (!summarySnapshot.empty) {
                    const summaryDoc = summarySnapshot.docs[0];
                    setSummary(summaryDoc.data().summary || "");
                    setSummaryDocId(summaryDoc.id);
                }

                // Fetch notes
                const notesQuery = query(
                    collection(db, "notes"),
                    where("userId", "==", userId),
                    where("videoId", "==", videoId)
                );
                const notesSnapshot = await getDocs(notesQuery);

                let fetchedNotes = [];

                notesSnapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.notes) {
                        fetchedNotes = Object.keys(data.notes).map(key => ({
                            id: key,
                            text: data.notes[key].content,
                            timestamp: formatTimestamp(data.notes[key].timestamp) // Convert timestamp
                        }));
                    }
                });

                setNotes(fetchedNotes);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };

        fetchVideoDetails();
        fetchData();
    }, [videoId, userId]);

    useEffect(() => {
        console.log("Updated notes state:", notes);
    }, [notes]);

    const handleCreateNote = async (text, timestamp) => {
        try {
            console.log("Creating new note:", text, "at", timestamp);

            // Convert timestamp from Date to seconds
            const timestampInSeconds = Math.floor(timestamp.getTime() / 1000);

            const noteRef = await addDoc(collection(db, "notes"), {
                userId,
                videoId,
                notes: {
                    [Date.now()]: { content: text, timestamp: timestampInSeconds }
                }
            });

            const newNote = { id: noteRef.id, text, timestamp: formatTimestamp(timestampInSeconds) };
            setNotes(prevNotes => [...prevNotes, newNote]);

            console.log("Note created successfully:", newNote);
        } catch (error) {
            console.error("Error creating note:", error);
        }
    };

    const handleEditNote = async (noteId, newText) => {
        try {
            console.log("Editing note with ID:", noteId, "New text:", newText);

            const noteDocRef = doc(db, "notes", noteId);
            await updateDoc(noteDocRef, {
                [`notes.${noteId}.content`]: newText
            });

            setNotes(prevNotes =>
                prevNotes.map(note =>
                    note.id === noteId ? { ...note, text: newText } : note
                )
            );

            console.log("Note updated successfully.");
        } catch (error) {
            console.error("Error updating note:", error);
        }
    };

    const handleDeleteNote = async (noteId) => {
        try {
            console.log("Deleting note with ID:", noteId);
            
            const noteDocRef = doc(db, "notes", noteId);
            await deleteDoc(noteDocRef);

            setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
            console.log("Note deleted successfully.");
        } catch (error) {
            console.error("Error deleting note:", error);
        }
    };

    const handleUpdateSummary = async (newSummary) => {
        try {
            console.log("Updating summary...");
            if (summaryDocId) {
                await updateDoc(doc(db, "summaries", summaryDocId), {
                    summary: newSummary
                });
                console.log("Summary updated successfully.");
            } else {
                const summaryRef = await addDoc(collection(db, "summaries"), {
                    userId,
                    videoId,
                    summary: newSummary
                });
                setSummaryDocId(summaryRef.id);
                console.log("Summary created successfully:", newSummary);
            }
            setSummary(newSummary);
        } catch (error) {
            console.error("Error updating summary:", error);
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
            </div>

            <div className="notes-details-content">
                <SummarySection summary={summary} onUpdateSummary={handleUpdateSummary} />
                <NotesSection
                    notes={notes}
                    onCreate={handleCreateNote}
                    onEdit={handleEditNote}
                    onDelete={handleDeleteNote}
                />
            </div>
        </div>
    );
};

export default NotesDetailsPage;
