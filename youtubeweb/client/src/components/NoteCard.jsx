import React, { useState } from "react";
import { Edit2, Trash2, Save, X } from "lucide-react";
import "./NoteCard.css";

const NoteCard = ({ note, videoId, onEdit, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(note.text);

    const handleSave = () => {
        if (editedText.trim() !== note.text) {
            onEdit(note.id, editedText);
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditedText(note.text);
        setIsEditing(false);
    };

    // Convert timestamp from HH:MM:SS to seconds (for YouTube link)
    const timestampToSeconds = (timestamp) => {
        const [hours, minutes, seconds] = timestamp.split(":").map(Number);
        return hours * 3600 + minutes * 60 + seconds;
    };

    const openYouTubeAtTimestamp = () => {
        const seconds = timestampToSeconds(note.timestamp);
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}&t=${seconds}s`;
        window.open(youtubeUrl, "_blank");
    };

    return (
        <div className="note-card">
            {/* Timestamp as a button */}
            <div className="note-header">
                <button className="note-timestamp" onClick={openYouTubeAtTimestamp}>
                    {note.timestamp} {/* Displays HH:MM:SS format */}
                </button>
            </div>

            <div className="note-content">
                {isEditing ? (
                    <textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        className="note-textarea"
                        placeholder="Write your note here..."
                    />
                ) : (
                    <p>{note.text}</p>
                )}
            </div>
            
            <div className="note-actions">
                {isEditing ? (
                    <>
                        <button className="save-button" onClick={handleSave}>
                            <Save size={16} />
                            Save
                        </button>
                        <button className="cancel-button" onClick={handleCancel}>
                            <X size={16} />
                            Cancel
                        </button>
                    </>
                ) : (
                    <>
                        <button className="edit-button" onClick={() => setIsEditing(true)}>
                            <Edit2 size={16} />
                            Edit
                        </button>
                        <button className="delete-button" onClick={() => onDelete(note.id)}>
                            <Trash2 size={16} />
                            Delete
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default NoteCard;
