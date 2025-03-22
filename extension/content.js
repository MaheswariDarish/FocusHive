(() => {
  // Common variables
  let videoId = new URLSearchParams(window.location.search).get("v");
  if (!videoId) return;
  const apiUrl = "http://localhost:3000";
  const flaskApiUrl = "http://127.0.0.1:5000";
  const userId = "user123";
  const apiKey = "AIzaSyCD9ws46HMxYj753MU5fxVMMHHOs8x0QJw";

  // Timer variables
  let timer;
  let startTime;
  let isTimerVisible = true;
  let isVideoPlaying = true;
  let currentVideoId = '';
  let accumulatedTime = 0;

  // Load CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = chrome.runtime.getURL('popup.css');
  document.head.appendChild(link);

  // Create timer element
  const timerElement = document.createElement('div');
  timerElement.id = 'yt-timer';
  timerElement.innerHTML = `
    <div class="timer-display">00:00:00</div>
    <button class="timer-toggle">Hide</button>
  `;
  document.body.appendChild(timerElement);

  // Create panel button
  const panelButton = document.createElement("button");
  panelButton.textContent = "Study Panel";
  panelButton.id = "yt-panel-button";
  const playerControls = document.querySelector(".ytp-right-controls");
  playerControls.appendChild(panelButton);

  // Create unified panel
  const unifiedPanel = document.createElement("div");
  unifiedPanel.id = "yt-unified-panel";
  unifiedPanel.style.display = "none";
  unifiedPanel.innerHTML = `
    <div class="panel-header">
      <h3 id="video-title">Loading...</h3>
      <div class="tab-buttons">
        <button class="tab-button active" data-tab="notes">Notes</button>
        <button class="tab-button" data-tab="summary">Summary</button>
        <button class="tab-button" data-tab="mcq">MCQs</button>
      </div>
      <button id="close-panel">✕</button>
    </div>
    
    <div class="tab-content">
      <!-- Notes Tab -->
      <div id="notes-tab" class="tab active">
        <div id="note-list"></div>
        <textarea id="yt-notes-text" placeholder="Write your note here..."></textarea>
        <button id="yt-save-note">Save Note</button>
      </div>

      <!-- Summary Tab -->
      <div id="summary-tab" class="tab">
        <div id="summary-content">
          <textarea id="summary-text" readonly placeholder="Click Generate to create summary"></textarea>
          <button id="generate-summary">Generate Summary</button>
        </div>
      </div>

      <!-- MCQ Tab -->
      <div id="mcq-tab" class="tab">
        <div id="mcq-container"></div>
        <div class="mcq-controls">
          <button id="prev-btn" disabled>Previous</button>
          <button id="generate-mcq">Generate MCQs</button>
          <button id="next-btn" disabled>Next</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(unifiedPanel);

  // Timer Dragging Functionality
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;

  timerElement.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  function dragStart(e) {
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;

    if (e.target === timerElement) {
      isDragging = true;
    }
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      xOffset = currentX;
      yOffset = currentY;
      setTranslate(currentX, currentY, timerElement);
    }
  }

  function dragEnd() {
    isDragging = false;
  }

  function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
  }

  // Timer Functions
  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function startTimer() {
    if (!isVideoPlaying) return;
    
    if (!startTime) {
      startTime = Date.now();
    }
    updateTimer();
  }

  function pauseTimer() {
    if (timer) {
      cancelAnimationFrame(timer);
      timer = null;
    }
    if (startTime) {
      const currentElapsed = (Date.now() - startTime) / 1000;
      accumulatedTime += currentElapsed;
      startTime = null;
      saveVideoToHistory();
    }
  }

  function updateTimer() {
    if (!startTime || !isVideoPlaying) return;
    
    const currentElapsed = (Date.now() - startTime) / 1000;
    const totalElapsed = accumulatedTime + currentElapsed;
    timerElement.querySelector('.timer-display').textContent = formatTime(totalElapsed);
    
    timer = requestAnimationFrame(updateTimer);
  }

  function resetTimer() {
    if (timer) {
      cancelAnimationFrame(timer);
      timer = null;
    }
    startTime = null;
    accumulatedTime = 0;
    timerElement.querySelector('.timer-display').textContent = '00:00:00';
  }

  // Study Panel Functions
  const fetchVideoDetails = async (videoId) => {
    const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${apiKey}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.items.length > 0) {
        const videoDetails = data.items[0].snippet;
        document.getElementById('video-title').textContent = videoDetails.title;
      }
    } catch (error) {
      console.error("Error fetching video details:", error);
    }
  };

  // Monitor video ID changes for study panel
  const monitorVideoIdChanges = () => {
    const observer = new MutationObserver(() => {
      const newVideoId = new URLSearchParams(window.location.search).get("v");
      if (newVideoId && newVideoId !== videoId) {
        videoId = newVideoId;
        fetchVideoDetails(videoId);
        loadNotes();
      }
    });

    const targetNode = document.querySelector("title");
    if (targetNode) {
      observer.observe(targetNode, { childList: true });
    }
  };

  const loadNotes = async () => {
    if (!videoId) return;

    try {
      const response = await fetch(`${apiUrl}/notes/${userId}/${videoId}`);
      if (response.ok) {
        const data = await response.json();
        const noteList = document.getElementById("note-list");
        noteList.innerHTML = "";

        data.notes.forEach((note, index) => {
          const noteDiv = document.createElement("div");
          noteDiv.classList.add("note");
          noteDiv.innerHTML = `
            <div class="note-content">
              <div class="note-content-button">
                <button onclick="window.location.href='https://www.youtube.com/watch?v=${videoId}&t=${note.timestamp}s'">
                  ${formatTime(note.timestamp)}
                </button>
                <button class="delete-note" data-index="${index}">Delete</button>
              </div>
              <div class="note-content-text">
                <p>${note.content}</p>
              </div>
            </div>
          `;
          noteList.appendChild(noteDiv);
        });

        document.querySelectorAll(".delete-note").forEach((button) => {
          button.addEventListener("click", async (event) => {
            const index = event.target.getAttribute("data-index");
            try {
              const deleteResponse = await fetch(
                `${apiUrl}/notes/${userId}/${videoId}/${index}`,
                { method: "DELETE" }
              );
              if (deleteResponse.ok) {
                loadNotes();
              }
            } catch (error) {
              console.error("Error deleting note:", error);
            }
          });
        });
      }
    } catch (error) {
      console.error("Error loading notes:", error);
    }
  };

  // Save note functionality
  document.getElementById("yt-save-note").addEventListener("click", async () => {
    const newNoteContent = document.getElementById("yt-notes-text").value.trim();
    const player = document.querySelector("video");
    const currentTime = Math.floor(player.currentTime);

    if (!newNoteContent) {
      alert("Please write something to add as a note.");
      return;
    }

    const noteData = {
      videoId,
      content: newNoteContent,
      timestamp: currentTime,
      userId,
    };

    try {
      const response = await fetch(`${apiUrl}/save-note`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(noteData),
      });

      if (response.ok) {
        loadNotes();
        document.getElementById("yt-notes-text").value = "";
      }
    } catch (error) {
      console.error("Error saving note:", error);
      alert("An error occurred while saving the note. Please try again.");
    }
  });

  // Tab switching
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
      
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });

  // MCQ functionality
  let mcqs = [];
  let currentMCQIndex = 0;

  document.getElementById("generate-mcq").addEventListener("click", async () => {
    try {
      const response = await fetch(`${flaskApiUrl}/generate_mcqs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ video_id: videoId }),
      });

      const data = await response.json();
      if (data.result) {
        const result = JSON.parse(data.result);
        if (result.mcqs && result.mcqs.length > 0) {
          mcqs = result.mcqs;
          currentMCQIndex = 0;
          displayMCQ(mcqs[currentMCQIndex]);
          toggleSliderButtons();
        }
      }
    } catch (error) {
      console.error("Error generating MCQs:", error);
    }
  });

  document.getElementById("prev-btn").addEventListener("click", () => {
    if (currentMCQIndex > 0) {
      currentMCQIndex--;
      displayMCQ(mcqs[currentMCQIndex]);
      toggleSliderButtons();
    }
  });

  document.getElementById("next-btn").addEventListener("click", () => {
    if (currentMCQIndex < mcqs.length - 1) {
      currentMCQIndex++;
      displayMCQ(mcqs[currentMCQIndex]);
      toggleSliderButtons();
    }
  });

  function displayMCQ(mcq) {
    const mcqContainer = document.getElementById("mcq-container");
    mcqContainer.innerHTML = '';
    const mcqDiv = document.createElement('div');
    mcqDiv.classList.add('mcq');
    mcqDiv.innerHTML = `
      <p>${mcq.question}</p>
      <ul class="mcq-options">
        ${mcq.options.map((option, idx) => `
          <li class="mcq-option" data-correct="${option.correct}" data-option="${idx}">${option.text}</li>
        `).join('')}
      </ul>
    `;
    mcqContainer.appendChild(mcqDiv);

    mcqDiv.querySelectorAll('.mcq-option').forEach(option => {
      option.addEventListener('click', function() {
        selectAnswer(option, mcqDiv.querySelectorAll('.mcq-option'));
      });
    });
  }

  function selectAnswer(option, options) {
    const selectedOptionIdx = option.getAttribute('data-option');
    const correctOptionIdx = Array.from(options).findIndex(opt => opt.getAttribute('data-correct') === "true");

    options.forEach(opt => opt.classList.remove('correct', 'incorrect'));

    options.forEach((opt, idx) => {
      if (idx == selectedOptionIdx) {
        opt.classList.add(opt.getAttribute('data-correct') === "true" ? 'correct' : 'incorrect');
      } else if (idx === correctOptionIdx) {
        opt.classList.add('correct');
      }
    });

    options.forEach(opt => opt.removeEventListener('click', selectAnswer));
  }

  function toggleSliderButtons() {
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    prevBtn.disabled = currentMCQIndex === 0;
    nextBtn.disabled = currentMCQIndex === mcqs.length - 1;
  }

  // Summary functionality
  document.getElementById("generate-summary").addEventListener("click", async () => {
    try {
      const response = await fetch(`${flaskApiUrl}/generate_summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ video_id: videoId }),
      });

      const data = await response.json();
      if (data.result) {
        document.getElementById("summary-text").value = data.result;
      }
    } catch (error) {
      console.error("Error generating summary:", error);
    }
  });

  // Timer toggle
  const toggleButton = timerElement.querySelector('.timer-toggle');
  toggleButton.addEventListener('click', () => {
    isTimerVisible = !isTimerVisible;
    timerElement.style.opacity = isTimerVisible ? '1' : '0';
    toggleButton.textContent = isTimerVisible ? 'Hide' : 'Show';
  });

  // Panel toggle
  panelButton.addEventListener("click", () => {
    unifiedPanel.style.display = unifiedPanel.style.display === "none" ? "flex" : "none";
    if (unifiedPanel.style.display === "flex") {
      loadNotes();
    }
  });

  document.getElementById("close-panel").addEventListener("click", () => {
    unifiedPanel.style.display = "none";
  });

  // Video player state observers
  function setupVideoObserver() {
    const video = document.querySelector('video');
    if (!video) return;

    // Load existing watch time for the current video
    const videoId = getVideoId();
    if (videoId) {
      chrome.storage.local.get(['watchHistory'], (result) => {
        const history = result.watchHistory || [];
        const existingVideo = history.find(v => v.videoId === videoId);
        if (existingVideo) {
          accumulatedTime = existingVideo.watchTime;
          timerElement.querySelector('.timer-display').textContent = formatTime(accumulatedTime);
        }
      });
    }

    video.addEventListener('play', () => {
      isVideoPlaying = true;
      startTimer();
    });

    video.addEventListener('pause', () => {
      isVideoPlaying = false;
      pauseTimer();
    });

    video.addEventListener('ended', () => {
      isVideoPlaying = false;
      pauseTimer();
    });
  }

  // Watch for video changes
  function handleVideoChange() {
    const newVideoId = getVideoId();
    if (newVideoId && newVideoId !== currentVideoId) {
      if (currentVideoId) {
        pauseTimer();
      }
      currentVideoId = newVideoId;
      resetTimer();
      setupVideoObserver();
    }
  }

  // Video History Functions
  function getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v');
  }

  function saveVideoToHistory() {
    const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent;
    const videoId = getVideoId();
    if (!videoTitle || !videoId) return;

    const totalElapsed = startTime 
      ? accumulatedTime + ((Date.now() - startTime) / 1000)
      : accumulatedTime;

    chrome.storage.local.get(['watchHistory'], (result) => {
      const history = result.watchHistory || [];
      const existingVideo = history.find(v => v.videoId === videoId);
      
      if (existingVideo) {
        existingVideo.watchTime = Math.floor(totalElapsed);
        existingVideo.lastWatched = Date.now();
      } else {
        history.push({
          videoId,
          title: videoTitle,
          url: window.location.href,
          watchTime: Math.floor(totalElapsed),
          lastWatched: Date.now()
        });
      }
      
      chrome.storage.local.set({ watchHistory: history });
    });
  }

  // Chrome extension message handling
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleTimer') {
      toggleButton.click();
    }
  });

  // Initialize observers
  const pageObserver = new MutationObserver(() => {
    if (window.location.pathname.includes('/watch')) {
      handleVideoChange();
    }
  });

  pageObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Initialize
  if (videoId) {
    fetchVideoDetails(videoId);
    loadNotes();
  }
  if (window.location.pathname.includes('/watch')) {
    handleVideoChange();
  }
  monitorVideoIdChanges();
})();