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


  document.addEventListener('DOMContentLoaded', function() {
  chrome.storage.sync.get(['hideShorts', 'hideSuggested', 'hideComments'], function(result) {
    document.getElementById('toggleShorts').checked = result.hideShorts || false;
    document.getElementById('toggleSuggested').checked = result.hideSuggested || false;
    document.getElementById('toggleComments').checked = result.hideComments || false;
  });

  document.getElementById('toggleShorts').addEventListener('change', function() {
    chrome.storage.sync.set({ hideShorts: this.checked });
  });

  document.getElementById('toggleSuggested').addEventListener('change', function() {
    chrome.storage.sync.set({ hideSuggested: this.checked });
  });

  document.getElementById('toggleComments').addEventListener('change', function() {
    chrome.storage.sync.set({ hideComments: this.checked });
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const filterInput = document.getElementById('filterInput');
  const filterToggle = document.getElementById('filterToggle');
  const statusText = document.getElementById('statusText');

  // Load saved filter state
  chrome.storage.sync.get(['isContentFilteringEnabled', 'filterTopic'], (data) => {
    if (data.isContentFilteringEnabled) {
      filterToggle.checked = true;
      statusText.textContent = 'Content filtering enabled';
      statusText.classList.add('active');
    }
    if (data.filterTopic) {
      filterInput.value = data.filterTopic;
    }
  });

  // Handle filter input changes
  filterInput.addEventListener('input', () => {
    const topic = filterInput.value.trim();
    chrome.storage.sync.set({ filterTopic: topic });
    
    if (filterToggle.checked && topic) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url?.includes('youtube.com')) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateFilter',
            topic: topic
          });
        }
      });
    }
  });

  // Handle toggle changes
  filterToggle.addEventListener('change', () => {
    const isEnabled = filterToggle.checked;
    const topic = filterInput.value.trim();
    
    chrome.storage.sync.set({ 
      isContentFilteringEnabled: isEnabled,
      filterTopic: topic
    });

    statusText.textContent = isEnabled ? 'Content filtering enabled' : 'Content filtering disabled';
    statusText.classList.toggle('active', isEnabled);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url?.includes('youtube.com')) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: isEnabled ? 'enableFilter' : 'disableFilter',
          topic: isEnabled ? topic : null
        });
      }
    });
  });
});
