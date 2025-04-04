import React, { useEffect, useState } from "react";
import { FaTimes, FaYoutube } from "react-icons/fa";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { fetchVideoCategory } from "../api/youtubeapi";
import "./Analytics.css";

const WatchHistory = () => {
  const [watchHistory, setWatchHistory] = useState([]);
  const [categoryCount, setCategoryCount] = useState({});
  const [user, setUser] = useState(null);

  // Fetch current logged-in user
  useEffect(() => {
    axios
      .get("http://localhost:5000/auth/user", { withCredentials: true })
      .then((res) => setUser(res.data))
      .catch(() => setUser(null));
  }, []);
//   useEffect(() => {
//     setUser({ uid: "102750888703041297402"
//  }); // Replace with your actual userId from Firestore
//   }, []);
console.log(user);
  // Function to format Firestore timestamp to DD-MM-YYYY
  const formatDate = (timestamp) => {
    if (timestamp?.seconds) {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString("en-GB");
    }
    return null;
  };

  // Fetch user-specific watch history
  useEffect(() => {
    const fetchWatchHistory = async () => {
      if (!user || !user.uid) return;

      try {
        const q = query(collection(db, "analytics"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        let lastValidDate = "01-01-2024";

        const data = querySnapshot.docs.map((doc) => {
          const docData = doc.data();
          let formattedDate = formatDate(docData.lastWatched) || lastValidDate;

          if (formattedDate) lastValidDate = formattedDate;

          return {
            id: doc.id,
            ...docData,
            lastWatched: formattedDate,
          };
        });

        data.sort((a, b) => {
          return (
            new Date(b.lastWatched.split("-").reverse().join("-")) -
            new Date(a.lastWatched.split("-").reverse().join("-"))
          );
        });

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
  }, [user]);

  // Handle delete
  const handleCloseEditForm = (id) => {
    setWatchHistory(watchHistory.filter((video) => video.id !== id));
  };

  // Count categories
  useEffect(() => {
    const countCategories = watchHistory.reduce((acc, video) => {
      acc[video.category] = (acc[video.category] || 0) + 1;
      return acc;
    }, {});
    setCategoryCount(countCategories);
  }, [watchHistory]);

  return (
    <div className="watch-container">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="watch-history-container">
        {/* Watch History */}
        <div className="history-section">
          <h2>Watch History</h2>
          <div className="history-list">
            {watchHistory.length === 0 ? (
              <p className="empty-history-message">Nothing here. Go watch some videos!</p>
            ) : (
              watchHistory.map((video) => (
                <div key={video.id} className="history-item">
                  <FaTimes className="close-icon" onClick={() => handleCloseEditForm(video.id)} />
                  <div className="video-info">
                    <h3>{video.title}</h3>
                    <p className="watch-time">{video.lastWatched}</p>
                    <a href={video.url} target="_blank" rel="noopener noreferrer">
                      <FaYoutube className="youtube-icon" />
                    </a>
                  </div>
                </div>
              ))
            )}
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
                  <div
                    className="progress-fill"
                    style={{ width: `${count * 25}%`, backgroundColor: "#192524" }}
                  ></div>
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
