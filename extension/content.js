(() => {
  let videoId = new URLSearchParams(window.location.search).get("v");
  if (!videoId) return;
  const apiUrl = "http://localhost:3000";
  const userId = "user123";
  const apiKey = "AIzaSyCD9ws46HMxYj753MU5fxVMMHHOs8x0QJw";

  

  // Fetch video details using YouTube API
  const fetchVideoDetails = async (videoId) => {
    const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${apiKey}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.items.length > 0) {
        const videoDetails = data.items[0].snippet;
        const title = videoDetails.title;

        const header = document.querySelector(".notes-header");
        header.innerHTML = `
          <h3>${title}</h3>
          <button id="close-panel">✕</button>
        `;

        
        document.getElementById("close-panel").addEventListener("click", () => {
          notesPanel.style.display = "none";
        });
      }
    } catch (error) {
      console.error("Error fetching video details:", error);
    }
  };

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

  
  const scrollToBottom = () => {
    const noteList = document.getElementById("note-list");
    if (noteList) noteList.scrollTop = noteList.scrollHeight;
  };

  
  const addNoteButton = document.createElement("button");
  addNoteButton.textContent = "Add Note";
  addNoteButton.id = "yt-add-note-button";
  Object.assign(addNoteButton.style, {
    position: "absolute",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "#0073e6",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "10px 20px",
    fontSize: "16px",
    cursor: "pointer",
    zIndex: 9999,
  });

  const playerControls = document.querySelector(".ytp-right-controls");
  playerControls.appendChild(addNoteButton);

  const notesPanel = document.createElement("div");
  notesPanel.id = "yt-notes-panel";
  notesPanel.style.display = "none";
  notesPanel.innerHTML = `
    <div class="notes-header">
      <h3>Notes</h3>
      <button id="close-panel">✕</button>
    </div>
    <div id="note-list"></div>
    <textarea id="yt-notes-text" placeholder="Write your note here..."></textarea>
    <button id="yt-save-note">Save Note</button>
  `;
  document.body.appendChild(notesPanel);

  
  addNoteButton.addEventListener("click", () => {
    videoId = new URLSearchParams(window.location.search).get("v");
    if (!videoId) return;
    notesPanel.style.display = "flex";
    loadNotes();
    setTimeout(scrollToBottom, 100);
  });

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
                <button class="delete-note" data-index="${index}"></button>
              </div>
              <div note-content-text>
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
              } else {
                console.error("Failed to delete note");
              }
            } catch (error) {
              console.error("Error deleting note:", error);
            }
          });
        });
      } else {
        console.error("Failed to load notes");
      }
    } catch (error) {
      console.error("Error loading notes:", error);
    }
  };

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
      const response = await fetch("http://localhost:3000/save-note", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(noteData),
      });

      if (response.ok) {
        loadNotes(); 
        document.getElementById("yt-notes-text").value = ""; // Clear input field
      } else {
        const error = await response.json();
        console.error("Error saving note:", error.message);
        alert("Failed to save note. Please try again.");
      }
    } catch (error) {
      console.error("Error saving note:", error);
      alert("An error occurred while saving the note. Please try again.");
    }
  });

  const formatTimestamp = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  if (videoId) {
    fetchVideoDetails(videoId);
    loadNotes();
  }
  monitorVideoIdChanges();
  
})();