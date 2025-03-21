chrome.runtime.onInstalled.addListener(() => {
  console.log("YouTube Video Helper Extension Installed");
});

// Listen for messages from the popup and handle video ID and API requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "generate_mcqs" || message.type === "generate_summary") {
      // Retrieve the video ID from the message
      const videoId = message.videoId;
      
      // Check if videoId is provided
      if (!videoId) {
          sendResponse({ error: "Video ID is missing" });
          return true; // Don't proceed further if videoId is missing
      }

      // Send request to backend based on the action type (generate MCQs or generate summary)
      const endpoint = message.type === "generate_mcqs" ? "/generate_mcqs" : "/generate_summary";
      console.log(endpoint);

      // Make the API request
      fetch(`http://127.0.0.1:5000${endpoint}`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ video_id: videoId })
      })
      .then(response => response.json())
      .then(data => {
          // Return the result (MCQs or summary) or error message
          sendResponse({
              result: data.result || null,
              error: data.error || null
          });
      })
      .catch(error => {
          // Return any error message that occurs during the API call
          sendResponse({ error: error.message || "An unexpected error occurred" });
      });

      // Return true to indicate asynchronous response
      return true;
  }
});
