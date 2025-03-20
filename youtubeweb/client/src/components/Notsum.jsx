import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import "./Notsum.css";
import { FaEdit, FaTrash, FaTimes } from "react-icons/fa";

const Notsum = () => {
  const [notes, setNotes] = useState([
    {
      title: "Understanding Quantum Physics",
      date: "3/15/2024",
      category: "Summary",
      shortDesc: "An introduction to quantum mechanics.",
      fullDesc:
        "Quantum physics describes atomic and subatomic behavior with key concepts like wave-particle duality, quantum entanglement, and the uncertainty principle.",
    },
    {
      title: "Modern Web Development",
      date: "3/14/2024",
      category: "Notes",
      shortDesc: "Overview of web development practices.",
      fullDesc:
        "This includes frontend, backend technologies, frameworks, and the evolution of modern web development tools.",
    },
  ]);

  const [currentNote, setCurrentNote] = useState({
    title: "",
    shortDesc: "",
    fullDesc: "",
  });

  const [editingIndex, setEditingIndex] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");

  // Handle input change
  const handleChange = (e) => {
    setCurrentNote({ ...currentNote, [e.target.name]: e.target.value });
  };

  // Save or update note
  const handleSaveNote = () => {
    if (editingIndex !== null) {
      const updatedNotes = notes.map((note, index) =>
        index === editingIndex ? currentNote : note
      );
      setNotes(updatedNotes);
      setEditingIndex(null);
      setShowEditForm(false);
    }
  };

  // Edit note (opens form)
  const handleEdit = (index) => {
    setCurrentNote(notes[index]);
    setEditingIndex(index);
    setShowEditForm(true);
  };

  // Close edit form manually
  const handleCloseEditForm = () => {
    setShowEditForm(false);
    setEditingIndex(null);
  };

  // Delete note
  const handleDelete = (index) => {
    setNotes(notes.filter((_, i) => i !== index));
    setShowEditForm(false);
  };

  // Expand/collapse full description
  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  // Filtered notes based on search and category
  const filteredNotes = notes.filter((note) => {
    return (
      (filterCategory === "All" || note.category === filterCategory) &&
      (note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.shortDesc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.fullDesc.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <div className="notsum-container">
      <Sidebar />
      <div className="content-wrapper">
        {/* Left Side - Notes List */}
        <div className="notes-list">
          <h1>Notes & Summaries</h1>

          {/* Search and Filter */}
          <div className="search-filter-container">
            <input
              type="text"
              className="search-bar"
              placeholder="Search notes and summaries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="filter-dropdown"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="All">All</option>
              <option value="Summary">Summaries</option>
              <option value="Notes">Notes</option>
            </select>
          </div>

          {/* Notes Display */}
          {filteredNotes.map((note, index) => (
            <div key={index} className="note-card">
              <h3>{note.title}</h3>
              <p className="note-date">{note.date}</p>
              <p className="note-short">{note.shortDesc}</p>

              {expandedIndex === index && (
  <>
    <hr className="note-divider" />
    <p className="note-full">{note.fullDesc}</p>
  </>
)}
<span className="view-more-btn" onClick={() => toggleExpand(index)}>
  {expandedIndex === index ? "Hide" : "View More"}
</span>


              <div className="note-actions">
                <FaEdit className="edit-icon" onClick={() => handleEdit(index)} />
                <FaTrash className="delete-icon" onClick={() => handleDelete(index)} />
              </div>
            </div>
          ))}
        </div>

        {/* Right Side - Edit Form (Only Visible When Editing) */}
        {showEditForm && (
          <div className="edit-form">
            {/* Close Icon */}
            <FaTimes className="close-icon" onClick={handleCloseEditForm} />

            <h2>Edit Note</h2>
            <input
              type="text"
              name="title"
              value={currentNote.title}
              onChange={handleChange}
              placeholder="Title"
            />
            <input
              type="text"
              name="shortDesc"
              value={currentNote.shortDesc}
              onChange={handleChange}
              placeholder="Short Description"
            />
            <textarea
              name="fullDesc"
              value={currentNote.fullDesc}
              onChange={handleChange}
              placeholder="Full Description"
            ></textarea>
            <button onClick={handleSaveNote}>Update Note</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notsum;
