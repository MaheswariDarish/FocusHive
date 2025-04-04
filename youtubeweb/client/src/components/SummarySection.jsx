import React, { useState, useEffect } from "react";
import { Edit2, Save, X } from "lucide-react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import "./SummarySection.css";

const SummarySection = ({ userId, videoId }) => {
    const [summary, setSummary] = useState("");
    const [editedSummary, setEditedSummary] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSummary = async () => {
            setLoading(true);
            try {
                const docId = `${userId}_${videoId}`;
                const summaryRef = doc(db, "summaries", docId);
                const docSnap = await getDoc(summaryRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setSummary(data.summary || "");
                    setEditedSummary(data.summary || "");
                } else {
                    setSummary("");
                    setEditedSummary("");
                }
            } catch (err) {
                console.error("Error fetching summary:", err);
                setStatus("Failed to load summary.");
            } finally {
                setLoading(false);
            }
        };

        if (userId && videoId) {
            fetchSummary();
        }
    }, [userId, videoId]);

    const handleSave = async () => {
        const docId = `${userId}_${videoId}`;
        const summaryRef = doc(db, "summaries", docId);

        try {
            await setDoc(summaryRef, {
                summary: editedSummary,
                videoId,
                userId,
            });

            setSummary(editedSummary);
            setIsEditing(false);
            setStatus("Summary saved!");
        } catch (err) {
            console.error("Error saving summary:", err);
            setStatus("Failed to save summary.");
        }
    };

    const handleCancel = () => {
        setEditedSummary(summary);
        setIsEditing(false);
        setStatus(null);
    };

    if (loading) return <p>Loading summary...</p>;

    return (
        <div className="summary-section">
            <div className="summary-header">
                <h2>Summary</h2>
                {!isEditing ? (
                    <button className="edit-button" onClick={() => setIsEditing(true)}>
                        <Edit2 size={16} />
                        Edit 
                    </button>
                ) : (
                    <div className="edit-actions">
                        <button className="save-button" onClick={handleSave}>
                            <Save size={16} />
                            Save
                        </button>
                        <button className="cancel-button" onClick={handleCancel}>
                            <X size={16} />
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            <div className="summary-content">
                {isEditing ? (
                    <textarea
                        value={editedSummary}
                        onChange={(e) => setEditedSummary(e.target.value)}
                        placeholder="Write your summary here..."
                        className="summary-textarea"
                    />
                ) : (
                    <p>{summary || "No summary available. Click edit to add one."}</p>
                )}
            </div>

            {status && <p className="summary-status">{status}</p>}
        </div>
    );
};

export default SummarySection;
