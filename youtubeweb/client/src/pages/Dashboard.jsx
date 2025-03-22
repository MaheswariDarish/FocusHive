import React, { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import "./Dashboard.css";
import NoteTile from "../components/NoteTile";
const Dashboard = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    axios
      .get("http://localhost:5000/auth/user", { withCredentials: true })
      .then((res) => setUser(res.data))
      .catch(() => setUser(null));
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch("http://localhost:5000/logout", {
        method: "GET",
        credentials: "include", // Include cookies for session-based auth
      });
  
      if (response.ok) {
        
        localStorage.removeItem("user");
        window.location.href = "/"; // Redirect to login
      } else {
        const contentType = response.headers.get("Content-Type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          console.error("Failed to log out:", errorData.message);
        } else {
          console.error("Failed to log out: Received non-JSON response");
        }
      }
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };
  
  
  
  if (!user) {
    return <h2>Loading...</h2>;
  }

  return (
    // <div style={{ textAlign: "center", marginTop: "100px" }}>
    //   <h1>Welcome, {user.displayName}</h1>
    //   <img src={user.photos[0].value} alt="Profile" style={{ borderRadius: "50%" }} />
    //   <br />
    //   <button onClick={handleLogout} style={{ padding: "10px 20px", marginTop: "20px" }}>
    //     Logout
    //   </button>
    // </div>
    <div>
      <Sidebar />
      <div className="username">
        <h1>Welcome,{user.displayName}</h1>
      </div>
      
    </div>

  );
};

export default Dashboard;
