import React, { useEffect, useState } from "react";
import { FaTimes, FaYoutube } from "react-icons/fa"; // Importing icons
import Sidebar from "../components/Sidebar";
import { db } from "../firebase"; // Ensure correct Firebase path
import { collection, getDocs } from "firebase/firestore";
import { fetchVideoCategory } from "../api/youtubeapi"; // New API function
import "./Analytics.css";

const WatchHistory = () => {
  const [watchHistory, setWatchHistory] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [categoryCount, setCategoryCount] = useState({});

  // Fetch data from Firebase
  useEffect(() => {
    const fetchWatchHistory = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "analytics"));
        const data = querySnapshot.docs.map((doc) => {
          const docData = doc.data();

          // Convert Firestore timestamp to readable date
          const lastWatched = docData.lastWatched?.seconds
  ? new Date(docData.lastWatched.seconds * 1000).toLocaleDateString()
  : docData.lastWatched || "Unknown Date";  // Use stored string if available


          return {
            id: doc.id,
            ...docData,
            lastWatched, // Store formatted date
          };
        });

        // Fetch categories dynamically
        const updatedData = await Promise.all(
          data.map(async (video) => {
            const category = await fetchVideoCategory(video.videoId);
            return { ...video, category };
          })
        );

        setWatchHistory(updatedData);
      } catch (error) {
        console.error("Error fetching watch history:", error);
      }
    };

    fetchWatchHistory();
  }, []);

  // Handle delete
  const handleCloseEditForm = (id) => {
    setWatchHistory(watchHistory.filter((video) => video.id !== id));
  };

  // Update category count
  useEffect(() => {
    const countCategories = watchHistory.reduce((acc, video) => {
      acc[video.category] = (acc[video.category] || 0) + 1;
      return acc;
    }, {});
    setCategoryCount(countCategories);
  }, [watchHistory]);

  return (
    <div className={`watch-container ${darkMode ? "dark-mode" : ""}`}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="watch-history-container">
        
        {/* Watch History */}
        <div className="history-section">
          <h2>Watch History</h2>
          <div className="history-list">
            {watchHistory.map((video) => (
              <div key={video.id} className="history-item">
                <FaTimes className="close-icon" onClick={() => handleCloseEditForm(video.id)} />
                <div className="video-info">
                  <h3>{video.title}</h3>
                  <p className="watch-time">{video.lastWatched}</p>
                  {/* <p className="category-tag"><strong>Category:</strong> {video.category || "Unknown"}</p> */}
                  {/* YouTube Icon Link */}
                  <a href={video.url} target="_blank" rel="noopener noreferrer">
                    <FaYoutube className="youtube-icon" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Section */}
        <div className="category-section">
          <h2>Category</h2>
          <div className="category-list">
            {Object.entries(categoryCount).map(([category, count]) => (
              <div key={category} className="category-item">
                <span className="category-name">{category}</span>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${count * 25}%`, backgroundColor: "#192524" }}></div>
                </div>
                <span className="category-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchHistory;
