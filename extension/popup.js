document.addEventListener('DOMContentLoaded', async () => {
    const watchHistory = document.getElementById('watchHistory');
    const toggleButton = document.getElementById('toggleTimer');
    
    // Format time function
    function formatTime(seconds) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
  
    // Toggle timer visibility
    toggleButton.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab.url.includes('youtube.com')) {
          chrome.tabs.sendMessage(tab.id, { action: 'toggleTimer' });
        }
      });
    });
    
    // Get watch history from storage
    chrome.storage.local.get(['watchHistory'], (result) => {
      const history = result.watchHistory || [];
      
      if (history.length === 0) {
        watchHistory.innerHTML = '<p>No videos watched yet</p>';
        return;
      }
  
      history
        .sort((a, b) => b.lastWatched - a.lastWatched)
        .forEach(video => {
          const videoItem = document.createElement('div');
          videoItem.className = 'video-item';
          videoItem.innerHTML = `
            <div>
              <p class="video-title">${video.title}</p>
              <div class="video-info">
                <span>Watch time: ${formatTime(video.watchTime)}</span>
                <span>•</span>
                <span>Last watched: ${new Date(video.lastWatched).toLocaleDateString()}</span>
              </div>
            </div>
          `;
          
          videoItem.addEventListener('click', () => {
            chrome.tabs.create({ url: video.url });
          });
          
          watchHistory.appendChild(videoItem);
        });
    });
  });