import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { Camera as VideoCamera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NoteTile from "../components/NoteTile";
import Sidebar from "../components/Sidebar";
import "./NotesPage.css";

const NotesPage = ({ userId }) => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // TODO: Remove this hardcoded value in production
    userId = "user123";

    useEffect(() => {
        if (!userId) {
            setError("User ID is required");
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const notesQuery = query(collection(db, "notes"), where("userId", "==", userId));
                const summariesQuery = query(collection(db, "summaries"), where("userId", "==", userId));

                const [notesSnapshot, summariesSnapshot] = await Promise.all([
                    getDocs(notesQuery),
                    getDocs(summariesQuery),
                ]);

                const videoMap = new Map();

               
                notesSnapshot.docs.forEach((doc) => {
                    const videoId = doc.data().videoId;
                    if (!videoMap.has(videoId)) {
                        videoMap.set(videoId, {
                            id: videoId,
                            docId: doc.id,
                            title: doc.data().title || "Loading...",
                        });
                    }
                });

                
                summariesSnapshot.docs.forEach((doc) => {
                    const videoId = doc.data().videoId;
                    if (!videoMap.has(videoId)) {
                        videoMap.set(videoId, {
                            id: videoId,
                            docId: doc.id,
                            title: doc.data().title || "Loading...",
                        });
                    }
                });

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
    }, [userId]);

    return (
        <div className="notes-page">
            <Sidebar />
            
            <div className="notes-container">
                <div className="notes-content">
                    <div className="notes-header">
                        <VideoCamera className="notes-header-icon" />
                        <h1 className="notes-title">Your Video Notes</h1>
                    </div>

                    {error && (
                        <div className="error-message">
                            <p>{error}</p>
                        </div>
                    )}

                    {loading ? (
                        <div className="loading-skeleton">
                            {[1, 2, 3].map((n) => (
                                <div key={n} className="loading-skeleton-item">
                                    <div className="loading-skeleton-line"></div>
                                    <div className="loading-skeleton-line"></div>
                                </div>
                            ))}
                        </div>
                    ) : videos.length === 0 ? (
                        <div className="empty-state">
                            <VideoCamera className="empty-state-icon" />
                            <h3 className="empty-state-title">No notes yet</h3>
                            <p className="empty-state-text">Start adding video notes to see them here.</p>
                        </div>
                    ) : (
                        videos.map(video => (
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
