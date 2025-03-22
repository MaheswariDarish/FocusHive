import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import './NoteTile.css';

const NoteTile = ({ video, onClick }) => {
    const [description, setDescription] = useState(null);
    const [showDescription, setShowDescription] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [title, setTitle] = useState('Loading...');

    useEffect(() => {
        if (!video?.id) return;

        const fetchVideoTitle = async () => {
            try {
                const response = await fetch(
                    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${video.id}&key=${import.meta.env.VITE_YOUTUBE_API_KEY}`
                );
                const data = await response.json();
                const snippet = data.items[0]?.snippet;

                if (snippet) {
                    setTitle(snippet.title || 'Untitled Video');
                } else {
                    setTitle('Video Not Found');
                }
            } catch (error) {
                console.error("Error fetching video title:", error);
                setTitle('Error Loading Video');
            }
        };

        fetchVideoTitle();
    }, [video?.id]);

    const fetchVideoDescription = async () => {
        if (!video.id || description) {
            setShowDescription(!showDescription);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${video.id}&key=${import.meta.env.VITE_YOUTUBE_API_KEY}`
            );
            const data = await response.json();
            const snippet = data.items[0]?.snippet;

            setDescription(snippet?.description || 'No description available');
        } catch (error) {
            console.error("Error fetching video description:", error);
            setDescription('Failed to load description');
        }
        setIsLoading(false);
        setShowDescription(true);
    };

    return (
        <div className="note-tile">
            <div className="note-tile-content" onClick={onClick}>
                <div className="note-tile-header">
                    <h3 className="note-tile-title">{title}</h3>
                </div>

                {!showDescription ? (
                    <p className="note-short">
                        {description?.slice(0, 100)}...
                    </p>
                ) : (
                    <>
                        <hr className="note-divider" />
                        <p className="note-full">{description}</p>
                    </>
                )}

                <div className="note-actions">
                    <button
                        className="view-more-button"
                        onClick={(e) => {
                            e.stopPropagation();
                            fetchVideoDescription();
                        }}
                    >
                        {isLoading ? (
                            <span>Loading...</span>
                        ) : (
                            <>
                                {showDescription ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                {showDescription ? 'Show Less' : 'View More'}
                            </>
                        )}
                    </button>

                    <a
                        href={`https://www.youtube.com/watch?v=${video.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="watch-link"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ExternalLink size={14} />
                        Watch
                    </a>
                </div>
            </div>
        </div>
    );
};

export default NoteTile;