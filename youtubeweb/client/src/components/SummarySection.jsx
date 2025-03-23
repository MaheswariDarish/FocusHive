import React, { useState } from "react";
import { Edit2, Save, X } from "lucide-react";
import "./SummarySection.css";

const SummarySection = ({ summary, onUpdateSummary }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedSummary, setEditedSummary] = useState(summary);

    const handleSave = () => {
        onUpdateSummary(editedSummary);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditedSummary(summary);
        setIsEditing(false);
    };

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
        </div>
    );
};

export default SummarySection;