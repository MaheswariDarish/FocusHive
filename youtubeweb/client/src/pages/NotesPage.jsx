import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { Camera as VideoCamera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NoteTile from "../components/NoteTile";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import "./NotesPage.css";

const NotesPage = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    // 🔐 Get current logged-in user
    useEffect(() => {
        axios
            .get("http://localhost:5000/auth/user", { withCredentials: true })
            .then((res) => setUser(res.data))
            .catch(() => setUser(null));
    }, []);

    // 📺 Fetch YouTube title using videoId
    const getYouTubeTitle = async (videoId) => {
        const apiKey =  import.meta.env.VITE_YOUTUBE_API_KEY; // Replace with your API key
        const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`;

        try {
            const response = await axios.get(url);
            return response.data.items[0]?.snippet?.title || "Untitled Video";
        } catch (err) {
            console.error(`Error fetching title for videoId ${videoId}:`, err);
            return "Untitled Video";
        }
    };

    // 📥 Fetch user's notes & summaries
    useEffect(() => {
        if (!user?.id) {
            setError("User ID is required");
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const notesQuery = query(collection(db, "notes"), where("userId", "==", user.id));
                const summariesQuery = query(collection(db, "summaries"), where("userId", "==", user.id));

                const [notesSnapshot, summariesSnapshot] = await Promise.all([
                    getDocs(notesQuery),
                    getDocs(summariesQuery),
                ]);

                const videoMap = new Map();

                for (const doc of notesSnapshot.docs) {
                    const videoId = doc.data().videoId;
                    if (!videoMap.has(videoId)) {
                        const title = await getYouTubeTitle(videoId);
                        videoMap.set(videoId, {
                            id: videoId,
                            docId: doc.id,
                            title,
                        });
                    }
                }

                for (const doc of summariesSnapshot.docs) {
                    const videoId = doc.data().videoId;
                    if (!videoMap.has(videoId)) {
                        const title = await getYouTubeTitle(videoId);
                        videoMap.set(videoId, {
                            id: videoId,
                            docId: doc.id,
                            title,
                        });
                    }
                }

                setVideos(Array.from(videoMap.values()));
                setError(null);
            } catch (error) {
                console.error("Error fetching videos:", error);
                setError("Failed to load your notes and summaries. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    // 🔍 Filtered results by search input
    const filteredVideos = videos.filter((video) =>
        (video.title || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="notes-page">
            <Sidebar />
            <div className="notes-container">
                <div className="notes-content">
                    <div className="notes-header">
                        <VideoCamera className="notes-header-icon" />
                        <h1 className="notes-title">Your Video Notes</h1>
                    </div>

                    <input
                        type="text"
                        className="search-bar"
                        placeholder="Search by video title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    {error && <p className="error-message">{error}</p>}

                    {loading ? (
                        <p>Loading...</p>
                    ) : filteredVideos.length === 0 ? (
                        <p>No matching notes found.</p>
                    ) : (
                        filteredVideos.map((video) => (
                            <NoteTile
                                key={video.docId}
                                video={video}
                                onClick={() => navigate(`/notes/${video.id}`)}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotesPage;
