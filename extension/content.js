(() => {
  let videoId = new URLSearchParams(window.location.search).get("v");
  if (!videoId) return;
  const apiUrl = "http://localhost:3000";
  const flaskApiUrl = "http://127.0.0.1:5000";
  const userId = "user123";
  const apiKey = "AIzaSyCD9ws46HMxYj753MU5fxVMMHHOs8x0QJw";

  // Load CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = chrome.runtime.getURL('popup.css');
  document.head.appendChild(link);

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

  // Tab switching logic
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
      
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });

  // Fetch video details
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

  // Monitor video ID changes
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

  // Notes functionality
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
                  ${formatTimestamp(note.timestamp)}
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

        // Add delete functionality
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

  // MCQ navigation
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

  // Helper functions
  const formatTimestamp = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

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

  // Initialize
  if (videoId) {
    fetchVideoDetails(videoId);
    loadNotes();
  }
  monitorVideoIdChanges();
})();