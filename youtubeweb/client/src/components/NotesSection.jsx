import React, { useState } from "react";
import { Plus } from "lucide-react";
import NoteCard from "./NoteCard";
import "./NotesSection.css";

const NotesSection = ({ userId, notes, videoId, onCreate, onEdit, onDelete }) => {
    const [newNote, setNewNote] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const handleAddNote = () => {
        if (newNote.trim()) {
            onCreate(newNote);
            setNewNote("");
            setIsCreating(false);
        }
    };

    return (
        <div className="notes-section">
            <div className="notes-header">
                <h2>Notes ({notes.length})</h2>
                <button className="create-note-button" onClick={() => setIsCreating(true)}>
                    <Plus size={16} />
                    Create Note
                </button>
            </div>

            {isCreating && (
                <div className="create-note-form">
                    <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Write your note here..."
                        className="note-textarea"
                    />
                    <div className="form-actions">
                        <button className="save-button" onClick={handleAddNote}>
                            Save
                        </button>
                        <button
                            className="cancel-button"
                            onClick={() => {
                                setNewNote("");
                                setIsCreating(false);
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="notes-list">
                {notes.map((note) => (
                    <NoteCard
                        key={note.id}
                        note={note}
                        videoId={videoId} // Pass videoId to NoteCard
                        onEdit={onEdit}
                        onDelete={onDelete}
                        userId={userId}
                    />
                ))}
            </div>
        </div>
    );
};

export default NotesSection;
