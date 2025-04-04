import React from "react";
import "./ChatHistory.css";

const ChatHistory = ({ history, onSelect, onDelete }) => (
  <div className="chat-history">
    <h2>Chat History</h2>
    <ul className="history-list">
      {history.map((item, index) => (
        <li key={index} className="history-item">
          <div onClick={() => onSelect(index)}>
            <span className="history-icon">💬</span>
            <span>Chat {index + 1}</span>
          </div>
          <button onClick={(e) => {
            e.stopPropagation();
            onDelete(index);
          }} 
          className="delete-btn"
          title="Delete chat">
            🗑️
          </button>
        </li>
      ))}
      {history.length === 0 && (
        <li className="history-item" style={{ cursor: 'default', opacity: 0.7 }}>
          <div>
            <span className="history-icon">📝</span>
            <span>No saved chats yet</span>
          </div>
        </li>
      )}
    </ul>
  </div>
);

export default ChatHistory;