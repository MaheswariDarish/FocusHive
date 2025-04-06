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
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUserAndHistory = async () => {
      try {
        const res = await axios.get("http://localhost:5000/auth/user", {
          withCredentials: true,
        });

        const u = res.data;
        const userId = u.id || u.uid;
        setUser({ ...u, id: userId });

        const q = query(collection(db, "analytics"), where("userId", "==", userId));
        const querySnapshot = await getDocs(q);

        const data = await Promise.all(
          querySnapshot.docs.map(async (doc) => {
            const docData = doc.data();
            const rawDate = docData.lastWatched?.seconds
              ? new Date(docData.lastWatched.seconds * 1000)
              : new Date("2024-01-01");

            const category = await fetchVideoCategory(docData.videoId);

            return {
              id: doc.id,
              ...docData,
              category,
              lastWatched: rawDate.toLocaleDateString("en-GB"),
              rawDate,
            };
          })
        );

        data.sort((a, b) => b.rawDate - a.rawDate);
        setWatchHistory(data);
      } catch (err) {
        console.error("Error fetching user or history", err);
      }
    };

    fetchUserAndHistory();
  }, []);

  const filteredVideos = watchHistory.filter((video) => {
    const selected = new Date(selectedDate);
    const vDate = video.rawDate;
    return (
      vDate.getFullYear() === selected.getFullYear() &&
      vDate.getMonth() === selected.getMonth() &&
      vDate.getDate() === selected.getDate()
    );
  });

  const totalSeconds = filteredVideos.reduce((acc, v) => acc + (v.watchTime || 0), 0);
  const totalMinutes = Math.floor(totalSeconds / 60);

  const categoryCount = filteredVideos.reduce((acc, video) => {
    acc[video.category] = (acc[video.category] || 0) + 1;
    return acc;
  }, {});

  const handleCloseEditForm = (id) => {
    setWatchHistory((prev) => prev.filter((video) => video.id !== id));
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (!user) return <div className="watch-container">Loading...</div>;

  return (
    <div className="watch-analytics-container">
      <Sidebar />
      <div className="watch-analytics-main">
        <div className="watch-analytics-header">
          <div className="watch-analytics-date-picker">
            <label htmlFor="date">Select Date:</label>
            <input
              type="date"
              id="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="watch-analytics-total-time">
            <strong>Total Time:</strong>{" "}
            {filteredVideos.length === 0 ? "Nothing to see here" : `${totalMinutes} mins`}
          </div>
        </div>

        <div className="watch-analytics-grid">
          <div className="watch-analytics-history">
            <h2>Watch History</h2>
            <div className="watch-analytics-history-list">
              {filteredVideos.length === 0 ? (
                <p className="watch-analytics-empty-message">
                  Nothing here. Go watch some videos!
                </p>
              ) : (
                filteredVideos.map((video) => (
                  <div key={video.id} className="watch-analytics-history-item">
                    <FaTimes
                      className="watch-analytics-close-icon"
                      onClick={() => handleCloseEditForm(video.id)}
                    />
                    <div className="watch-analytics-video-main">
                      <div className="watch-analytics-video-left">
                        <a href={video.url} target="_blank" rel="noopener noreferrer">
                          <FaYoutube className="watch-analytics-youtube-icon" />
                        </a>
                      </div>
                      <div className="watch-analytics-video-content">
                        <h3>{video.title}</h3>
                        <div className="watch-analytics-meta-row">
  <span className="watch-analytics-watch-time">{video.lastWatched}</span>
  <span className="watch-analytics-duration">{formatDuration(video.watchTime)}</span>
</div>

                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="watch-analytics-category">
            <h2>Category</h2>
            <div className="watch-analytics-category-list">
              {Object.entries(categoryCount).map(([category, count]) => (
                <div key={category} className="watch-analytics-category-item">
                  <span className="watch-analytics-category-name">{category}</span>
                  <div className="watch-analytics-progress-bar">
                    <div
                      className="watch-analytics-progress-fill"
                      style={{ width: `${count * 25}%` }}
                    />
                  </div>
                  <span className="watch-analytics-category-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchHistory;
