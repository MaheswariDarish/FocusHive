// Background script for FocusHive Chrome Extension

// Event listener for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("FocusHive Extension Installed");
  chrome.storage.local.set({ watchHistory: [] });
});

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  // Handle Google Sign-In
  if (request.action === "googleSignIn") {
    chrome.identity.getAuthToken({ 
      interactive: true,
      scopes: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ]
    }, async function(token) {
      if (chrome.runtime.lastError) {
        console.error("Error getting auth token:", chrome.runtime.lastError);
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }

      try {
        // Get user info using the token
        const userInfoResponse = await fetch(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        if (!userInfoResponse.ok) {
          throw new Error('Failed to get user info');
        }

        const userInfo = await userInfoResponse.json();
        
        // Send response with both token and user info
        sendResponse({ 
          token: token,
          user: {
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture
          }
        });

      } catch (error) {
        console.error("Authentication error:", error);
        sendResponse({ error: error.message });
      }
    });
    return true; // Required for asynchronous response
  }

  // Other message handlers...
  if (request.action === "toggleTimer") {
    chrome.tabs.sendMessage(sender.tab.id, { action: "toggleTimer" });
  }

  if (request.type === "generate_mcqs" || request.type === "generate_summary") {
    const videoId = request.videoId;
    
    if (!videoId) {
      sendResponse({ error: "Video ID is missing" });
      return true;
    }

    const endpoint = request.type === "generate_mcqs" ? "/generate_mcqs" : "/generate_summary";
    
    fetch(`http://127.0.0.1:5000${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ video_id: videoId })
    })
    .then(response => response.json())
    .then(data => {
      sendResponse({ result: data.result || null, error: data.error || null });
    })
    .catch(error => {
      sendResponse({ error: error.message || "An unexpected error occurred" });
    });

    return true;
  }
});