import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaChartBar, FaFileAlt } from "react-icons/fa"; // Importing icons
import { useNavigate } from "react-router-dom"; // Import useNavigate
import "./Sidebar.css"; 

const Sidebar = () => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate(); // Initialize navigate

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

    return (
        <div className="container">
            <div className="head">
                <p>FocusHive</p>
            </div>
            <div className="menu-item" onClick={() => navigate("/dashboard")}>
                <FaChartBar className="menu-icon" /> {/* Analytics Icon */}
                <p className="menu-text">Dashboard</p>
            </div>
            <div className="menu-item" onClick={() => navigate("/analytics")}>
                <FaChartBar className="menu-icon" /> {/* Analytics Icon */}
                <p className="menu-text">Analytics</p>
            </div>

            <div className="menu-item" onClick={() => navigate("/notes")}>
                <FaFileAlt className="menu-icon" /> {/* Notes & Summaries Icon */}
                <p className="menu-text">Notes & Summaries</p>
            </div>
            <div className="Profile" onClick={handleLogout}>
                Logout
            </div>
        </div>
    );
};

export default Sidebar;
