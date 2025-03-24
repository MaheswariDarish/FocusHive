const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

export const fetchVideoCategory = async (videoId) => {
    try {
        const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${API_KEY}`;
        const videoRes = await fetch(videoUrl);
        const videoData = await videoRes.json();

        if (videoData.items.length > 0) {
            const categoryId = videoData.items[0].snippet.categoryId;

            const categoryUrl = `https://www.googleapis.com/youtube/v3/videoCategories?part=snippet&id=${categoryId}&key=${API_KEY}`;
            const categoryRes = await fetch(categoryUrl);
            const categoryData = await categoryRes.json();

            if (categoryData.items.length > 0) {
                return categoryData.items[0].snippet.title;
            }
        }
        return "Unknown";
    } catch (error) {
        console.error("Error fetching category:", error);
        return "Error loading";
    }
};
