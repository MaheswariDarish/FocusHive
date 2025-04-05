import React from "react";
import "./ChatMessage.css";

const formatMessage = (text) => {
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s]+)\)/g;
  const formatted = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(linkPattern, `<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>`)
    .replace(/\n/g, "<br>");

  return { __html: formatted };
};

const ChatMessage = ({ sender, text }) => {
  return (
    <div className={`chat-bubble ${sender === "user" ? "user" : "bot"}`}>
      <div className="avatar">
        {sender === "user" ? "👤" : "🤖"}
      </div>
      <div className="message-content" dangerouslySetInnerHTML={formatMessage(text)} />
    </div>
  );
};

export default ChatMessage;