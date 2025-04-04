// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import Sidebar from "../components/Sidebar";
// import ChatMessage from "../components/ChatMessage";
// import ChatHistory from "../components/ChatHistory";
// import "./Dashboard.css";

// const Dashboard = () => {
//   const [user, setUser] = useState(null);
//   const [prompt, setPrompt] = useState("");
//   const [messages, setMessages] = useState([]);
//   const [history, setHistory] = useState([]);
//   const [showHistory, setShowHistory] = useState(true);
 

//   useEffect(() => {
//     axios
//       .get("http://localhost:5000/auth/user", { withCredentials: true })
//       .then((res) => setUser(res.data))
//       .catch(() => setUser(null));
//   }, []);

//   const sendMessage = async () => {
//     if (!prompt.trim()) return;

//     const updatedMessages = [...messages, { sender: "user", text: prompt }];
//     setMessages(updatedMessages);
//     setPrompt("");

//     try {
//       const res = await axios.post("http://localhost:5000/api/ask", { prompt });
//       const reply = res.data.reply;
//       setMessages([...updatedMessages, { sender: "bot", text: reply }]);
//     } catch (err) {
//       setMessages([...updatedMessages, { sender: "bot", text: "Error fetching response." }]);
//     }
//   };

//   const saveChatToHistory = () => {
//     if (messages.length > 0) {
//       setHistory((prev) => [...prev, messages]);
//       setMessages([]);
//     }
//   };

//   const handleSelectHistory = (index) => {
//     setMessages(history[index]);
//   };

//   if (!user) return <h2>Loading...</h2>;

//   return (
//     <div className="dashboard-wrapper">
//       <Sidebar />

//       <div className="main-content">
//         <div className="toggle-history">
//           <button onClick={() => setShowHistory(!showHistory)}>
//             {showHistory ? "Hide" : "Show"} History
//           </button>
//         </div>

//         {showHistory && (
//           <div className="history-panel">
//             <ChatHistory history={history} onSelect={handleSelectHistory} />
//           </div>
//         )}

//         <div className="chat-container">
//           <div className="chat-header">
//             <h2>Hi {user.displayName} 👋</h2>
//           </div>

//           <div className="chat-messages">
//             {messages.map((msg, index) => (
//               <ChatMessage key={index} sender={msg.sender} text={msg.text} />
//             ))}
//           </div>

//           <div className="chat-input">
//             <input
//               type="text"
//               placeholder="Ask anything..."
//               value={prompt}
//               onChange={(e) => setPrompt(e.target.value)}
//               onKeyDown={(e) => e.key === "Enter" && sendMessage()}
//             />
//             <button onClick={sendMessage}>Send</button>
//             <button onClick={saveChatToHistory}>Save Chat</button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Dashboard;

import React, { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import ChatMessage from "../components/ChatMessage";
import ChatHistory from "../components/ChatHistory";
import "./Dashboard.css";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    axios
      .get("http://localhost:5000/auth/user", { withCredentials: true })
      .then((res) => setUser(res.data))
      .catch(() => setUser(null));
  }, []);

  const sendMessage = async () => {
    if (!prompt.trim()) return;

    const updatedMessages = [...messages, { sender: "user", text: prompt }];
    setMessages(updatedMessages);
    setPrompt("");
    setIsTyping(true);

    try {
      const res = await axios.post("http://localhost:5000/api/ask", { prompt });
      const reply = res.data.reply;
      setIsTyping(false);
      setMessages([...updatedMessages, { sender: "bot", text: reply }]);
    } catch (err) {
      setIsTyping(false);
      setMessages([...updatedMessages, { sender: "bot", text: "Error fetching response." }]);
    }
  };

  const saveChatToHistory = () => {
    if (messages.length > 0) {
      setHistory((prev) => [...prev, messages]);
      setMessages([{ sender: "bot", text: "Chat saved! Starting new conversation." }]);
    }
  };

  const deleteFromHistory = (index) => {
    setHistory(history.filter((_, i) => i !== index));
  };

  const handleSelectHistory = (index) => {
    setMessages(history[index]);
    setShowHistory(false);
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle("dark-mode");
  };

  if (!user) return <div className="loading">Loading...</div>;

  return (
    <div className={`dashboard-wrapper ${darkMode ? "dark" : ""}`}>
      <Sidebar />

      <div className="main-content">
        <div className="toggle-history">
          <button onClick={() => setShowHistory(!showHistory)}>
            {showHistory ? "Hide" : "Show"} History
          </button>
          <button className="theme-toggle" onClick={toggleTheme}>
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>

        {showHistory && (
          <div className="history-panel">
            <ChatHistory 
              history={history} 
              onSelect={handleSelectHistory} 
              onDelete={deleteFromHistory}
            />
          </div>
        )}

        <div className="chat-container">
          <div className="chat-header">
            <h2>Hi {user.displayName} 👋</h2>
            <p className="welcome-text">How can I assist you today?</p>
          </div>

          <div className="chat-messages">
            {messages.map((msg, index) => (
              <ChatMessage key={index} sender={msg.sender} text={msg.text} />
            ))}
            {isTyping && (
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
          </div>

          <div className="chat-input">
            <input
              type="text"
              placeholder="Ask anything..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage} className="send-button">Send</button>
            <button onClick={saveChatToHistory} className="save-button">Save Chat</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;