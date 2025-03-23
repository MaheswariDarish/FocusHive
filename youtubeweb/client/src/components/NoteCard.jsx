import React, { useState } from "react";
import { Edit2, Trash2, Save, X } from "lucide-react";
import "./NoteCard.css";

const NoteCard = ({ note, onEdit, onDelete }) => {
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

    return (
        <div className="note-card">
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