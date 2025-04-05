// Content filtering variables and functions
let isContentFilteringEnabled = false;
let filterTopic = '';
let videoObserver = null;

function isVideoRelated(videoElement) {
    if (!filterTopic) return true;
    
    const title = videoElement.querySelector('#video-title')?.textContent?.toLowerCase() || '';
    const description = videoElement.querySelector('#description-text')?.textContent?.toLowerCase() || '';
    const metadata = videoElement.querySelector('#metadata')?.textContent?.toLowerCase() || '';
    const channelName = videoElement.querySelector('#channel-name')?.textContent?.toLowerCase() || '';
    
    const topics = filterTopic.split(',').map(topic => topic.trim().toLowerCase());
    
    return topics.some(topic => {
        if (!topic) return false;
        const searchTerms = topic.split(' ');
        const content = `${title} ${description} ${metadata} ${channelName}`;
        return searchTerms.every(term => content.includes(term));
    });
}

function filterVideos() {
    const videoElements = document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer');
    videoElements.forEach(video => {
        if (isContentFilteringEnabled && !isVideoRelated(video)) {
            video.style.display = 'none';
        } else {
            video.style.display = '';
        }
    });
}

function setupVideoFilterObserver() {
    if (videoObserver) {
        videoObserver.disconnect();
    }

    const containers = [
        document.querySelector('#contents'),
        document.querySelector('#items'),
        document.querySelector('#dismissible'),
        document.querySelector('ytd-rich-grid-renderer'),
        document.querySelector('ytd-watch-next-secondary-results-renderer')
    ];

    containers.forEach(container => {
        if (container) {
            if (!videoObserver) {
                videoObserver = new MutationObserver(() => {
                    filterVideos();
                });
            }
            videoObserver.observe(container, {
                childList: true,
                subtree: true
            });
        }
    });
}

// Message listener for content filtering
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'enableFilter') {
        isContentFilteringEnabled = true;
        filterTopic = message.topic || '';
        setupVideoFilterObserver();
        filterVideos();
        sendResponse({ success: true });
    } else if (message.action === 'disableFilter') {
        isContentFilteringEnabled = false;
        filterTopic = '';
        if (videoObserver) {
            videoObserver.disconnect();
            videoObserver = null;
        }
        filterVideos();
        sendResponse({ success: true });
    } else if (message.action === 'updateFilter') {
        filterTopic = message.topic || '';
        if (isContentFilteringEnabled) {
            filterVideos();
        }
        sendResponse({ success: true });
    }
    return true;
});

// Initialize content filtering
chrome.storage.sync.get(['isContentFilteringEnabled', 'filterTopic'], (data) => {
    if (data.isContentFilteringEnabled) {
        isContentFilteringEnabled = true;
        filterTopic = data.filterTopic || '';
        setupVideoFilterObserver();
        filterVideos();
    }
});

// Common variables
let videoId = new URLSearchParams(window.location.search).get("v");
const isVideoPage = window.location.pathname === '/watch';
const isHomePage = window.location.pathname === '/';
const apiUrl = "http://localhost:3031";
const flaskApiUrl = "http://127.0.0.1:5000";
const youtubeApiKey = "AIzaSyCD9ws46HMxYj753MU5fxVMMHHOs8x0QJw";
const firebaseApiKey = "AIzaSyACEE7fHRZGwEbw8GlBZhL2AUpLZgzfPWY";

// Auth state
let currentUser = JSON.parse(localStorage.getItem('ytExtensionAuth')) || null;

// Timer variables
let timer;
let startTime;
let isTimerVisible = true;
let isVideoPlaying = false;
let currentVideoId = '';
let accumulatedTime = 0;

// Load CSS
const loadStyles = () => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = chrome.runtime.getURL('popup.css');
    document.head.appendChild(link);
};

// Create timer element
const createTimerElement = () => {
    const timerElement = document.createElement('div');
    timerElement.id = 'yt-timer';
    timerElement.innerHTML = `
        <div class="timer-display">00:00:00</div>
        <button class="timer-toggle">Hide</button>
    `;
    document.body.appendChild(timerElement);

    // Timer toggle
    const toggleButton = timerElement.querySelector('.timer-toggle');
    toggleButton.addEventListener('click', () => {
        isTimerVisible = !isTimerVisible;
        timerElement.style.opacity = isTimerVisible ? '1' : '0';
        toggleButton.textContent = isTimerVisible ? 'Hide' : 'Show';
    });

    return timerElement;
};

// Create panel button
const createPanelButton = () => {
    const panelButton = document.createElement("button");
    panelButton.textContent = "Study Panel";
    panelButton.id = "yt-panel-button";
    const playerControls = document.querySelector(".ytp-right-controls");
    if (playerControls) {
        playerControls.appendChild(panelButton);
    }
    return panelButton;
};

// Create unified panel
const createUnifiedPanel = () => {
    const unifiedPanel = document.createElement("div");
    unifiedPanel.id = "yt-unified-panel";
    unifiedPanel.style.display = "none";
    unifiedPanel.innerHTML = `
        <div class="panel-header">
            <div class="panel-header-top">
                <h3 id="video-title">Loading...</h3>
                <button id="panel-auth-btn" class="panel-auth-button">${currentUser ? 'Sign Out' : 'Sign In'}</button>
            </div>
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

    // Add event listener for the auth button
    const authButton = unifiedPanel.querySelector('#panel-auth-btn');
    authButton.addEventListener('click', () => {
        if (currentUser) {
            signOut();
        } else {
            authContainer.style.display = 'block';
        }
    });

    return unifiedPanel;
};

// Create auth container
const createAuthContainer = () => {
    const authContainer = document.createElement('div');
    authContainer.id = 'yt-auth-container';
    authContainer.style.display = 'none';
    authContainer.style.position = 'fixed';
    authContainer.style.top = '20px';
    authContainer.style.right = '20px';
    authContainer.style.zIndex = '9999';
    authContainer.style.maxWidth = '300px';
    
    const authContent = currentUser ? `
        <div class="auth-modal">
            <div class="auth-user-info">
                <img src="${currentUser.picture}" alt="User profile picture">
                <div>
                    <p>Signed in as <strong>${currentUser.name}</strong></p>
                    <p>${currentUser.email}</p>
                </div>
            </div>
            <button id="sign-out-btn">Sign out</button>
        </div>
    ` : `
        <div class="auth-modal">
            <div class="auth-content">
                <h3>Sign in to save notes</h3>
                <p>Generate summaries and MCQs without signing in</p>
                <button id="google-signin-btn">Sign in with Google</button>
                <button id="skip-auth-btn">Continue without signing in</button>
            </div>
        </div>
    `;
    
    authContainer.innerHTML = authContent;
    document.body.appendChild(authContainer);
    return authContainer;
};

// Handle navigation
function handleNavigation() {
    const currentPath = window.location.pathname;
    const isVideoPage = currentPath === '/watch';
    const isHomePage = currentPath === '/';

    if (isVideoPage) {
        // Show timer and panel
        if (timerElement) timerElement.style.display = 'block';
        if (panelButton) panelButton.style.display = 'block';
        
        // Update video ID and load data
        const newVideoId = new URLSearchParams(window.location.search).get("v");
        if (newVideoId && newVideoId !== videoId) {
            // Clear existing content before loading new data
            clearPanelContent();
            
            // Update video ID
            videoId = newVideoId;
            
            // Update video title in panel
            fetchVideoDetails(videoId);
            
            // Load new video's data
            loadNotes();
            loadSummary();
            loadWatchTime();
            setupVideoObserver();
        }
    } else if (isHomePage) {
        // Hide timer and panel
        if (timerElement) timerElement.style.display = 'none';
        if (panelButton) panelButton.style.display = 'none';
        if (unifiedPanel) unifiedPanel.style.display = 'none';
    }
}

// Function to clear panel content
function clearPanelContent() {
    // Clear notes
    const noteList = document.getElementById("note-list");
    if (noteList) {
        noteList.innerHTML = "<p>No notes yet. Add your first note below!</p>";
    }
    
    // Clear notes textarea
    const notesTextarea = document.getElementById("yt-notes-text");
    if (notesTextarea) {
        notesTextarea.value = "";
    }
    
    // Clear summary
    const summaryText = document.getElementById("summary-text");
    if (summaryText) {
        summaryText.value = "";
    }
    
    // Clear MCQs
    const mcqContainer = document.getElementById("mcq-container");
    if (mcqContainer) {
        mcqContainer.innerHTML = "";
    }
    
    // Reset MCQ state
    currentMCQIndex = 0;
    mcqs = [];
    
    // Reset MCQ navigation buttons
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
}

// Initialize UI elements
loadStyles();
const timerElement = createTimerElement();
const panelButton = createPanelButton();
const unifiedPanel = createUnifiedPanel();
const authContainer = createAuthContainer();

// Set initial visibility based on current page
handleNavigation();

// Setup video observer immediately
setupVideoObserver();

// Add URL change observer for non-click navigation
const urlObserver = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        handleNavigation();
        // Re-setup video observer when URL changes
        setupVideoObserver();
    }
});

// Start observing URL changes
let lastUrl = window.location.href;
urlObserver.observe(document, { subtree: true, childList: true });

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

// Video Details
const fetchVideoDetails = async (videoId) => {
    const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${youtubeApiKey}`;
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

// Authentication Functions using Chrome Identity API
const handleGoogleSignIn = () => {
    // Show loading state
    authContainer.innerHTML = `
        <div class="auth-modal">
            <div class="auth-loading">
                <p>Signing in...</p>
            </div>
        </div>
    `;

    chrome.runtime.sendMessage({ action: "googleSignIn" }, async (response) => {
        if (response.error) {
            console.error("Authentication failed:", response.error);
            authContainer.innerHTML = `
                <div class="auth-modal">
                    <div class="auth-content">
                        <h3>Sign in to save notes</h3>
                        <p style="color: red;">Sign in failed. Please try again.</p>
                        <button id="google-signin-btn">Sign in with Google</button>
                        <button id="skip-auth-btn">Continue without signing in</button>
                    </div>
                </div>
            `;
            document.getElementById('google-signin-btn').addEventListener('click', handleGoogleSignIn);
            document.getElementById('skip-auth-btn').addEventListener('click', () => {
                authContainer.style.display = 'none';
            });
            return;
        }

        try {
            const result = await fetch(`${apiUrl}/auth/google`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${response.token}`
                },
                body: JSON.stringify({ 
                    userInfo: {
                        email: response.user.email,
                        name: response.user.name,
                        picture: response.user.picture
                    }
                })
            });

            const data = await result.json();
            if (result.ok) {
                // Exchange custom token for ID token using Firebase Auth REST API
                const idTokenResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${firebaseApiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        token: data.customToken,
                        returnSecureToken: true
                    })
                });

                if (!idTokenResponse.ok) {
                    const errorData = await idTokenResponse.json();
                    throw new Error(errorData.error?.message || 'Failed to exchange custom token for ID token');
                }

                const idTokenData = await idTokenResponse.json();
                currentUser = {
                    ...data,
                    idToken: idTokenData.idToken
                };
                
                localStorage.setItem('ytExtensionAuth', JSON.stringify(currentUser));
                authContainer.style.display = 'none';
                
                // Update panel auth button
                const panelAuthBtn = document.querySelector('#panel-auth-btn');
                if (panelAuthBtn) {
                    panelAuthBtn.textContent = 'Sign Out';
                }
                
                // Update auth container with user info
                authContainer.innerHTML = `
                    <div class="auth-modal">
                        <div class="auth-user-info">
                            <img src="${data.picture}" alt="User profile picture">
                            <div>
                                <p>Signed in as <strong>${data.name}</strong></p>
                                <p>${data.email}</p>
                            </div>
                        </div>
                        <button id="sign-out-btn">Sign out</button>
                    </div>
                `;
                
                document.getElementById('sign-out-btn').addEventListener('click', signOut);
                
                // Reload user-specific data
                loadNotes();
                loadSummary();
                loadWatchTime();
            } else {
                throw new Error(data.message || "Authentication failed");
            }
        } catch (error) {
            console.error('Error during authentication:', error);
            authContainer.innerHTML = `
                <div class="auth-modal">
                    <div class="auth-content">
                        <h3>Sign in to save notes</h3>
                        <p style="color: red;">${error.message}</p>
                        <button id="google-signin-btn">Sign in with Google</button>
                        <button id="skip-auth-btn">Continue without signing in</button>
                    </div>
                </div>
            `;
            document.getElementById('google-signin-btn').addEventListener('click', handleGoogleSignIn);
            document.getElementById('skip-auth-btn').addEventListener('click', () => {
                authContainer.style.display = 'none';
            });
        }
    });
};

const signOut = () => {
    localStorage.removeItem('ytExtensionAuth');
    currentUser = null;
    
    // Update auth container to sign-in state
    authContainer.innerHTML = `
        <div class="auth-modal">
            <div class="auth-content">
                <h3>Sign in to save notes</h3>
                <p>Generate summaries and MCQs without signing in</p>
                <button id="google-signin-btn">Sign in with Google</button>
                <button id="skip-auth-btn">Continue without signing in</button>
            </div>
        </div>
    `;
    
    // Update panel auth button
    const panelAuthBtn = document.querySelector('#panel-auth-btn');
    if (panelAuthBtn) {
        panelAuthBtn.textContent = 'Sign In';
    }
    
    // Reattach event listeners
    document.getElementById('google-signin-btn').addEventListener('click', handleGoogleSignIn);
    document.getElementById('skip-auth-btn').addEventListener('click', () => {
        authContainer.style.display = 'none';
    });
    
    // Clear user-specific data from UI
    document.getElementById("note-list").innerHTML = "";
    document.getElementById("summary-text").value = "";
    resetTimer();
};

// Notes Functions
const loadNotes = async () => {
    if (!videoId) return;

    try {
        const headers = currentUser ? { 'Authorization': `Bearer ${currentUser.idToken}` } : {};
        const response = await fetch(`${apiUrl}/notes/${videoId}`, { headers });
        
        if (response.ok) {
            const data = await response.json();
            const noteList = document.getElementById("note-list");
            noteList.innerHTML = "";

            if (data.notes && data.notes.length > 0) {
                data.notes.forEach((note, index) => {
                    const noteDiv = document.createElement("div");
                    noteDiv.classList.add("note");
                    noteDiv.innerHTML = `
                        <div class="note-content">
                            <div class="note-content-button">
                                <button onclick="window.location.href='https://www.youtube.com/watch?v=${videoId}&t=${note.timestamp}s'">
                                    ${formatTime(note.timestamp)}
                                </button>
                                ${currentUser ? `<button class="delete-note" data-index="${index}">Delete</button>` : ''}
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
                                `${apiUrl}/notes/${videoId}/${index}`,
                                { 
                                    method: "DELETE",
                                    headers: { 'Authorization': `Bearer ${currentUser.idToken}` }
                                }
                            );
                            if (deleteResponse.ok) {
                                loadNotes();
                            }
                        } catch (error) {
                            console.error("Error deleting note:", error);
                        }
                    });
                });
            } else {
                noteList.innerHTML = "<p>No notes yet. Add your first note below!</p>";
            }
        } else if (response.status === 401) {
            authContainer.style.display = 'block';
        }
    } catch (error) {
        console.error("Error loading notes:", error);
    }
};

// Save note functionality
document.getElementById("yt-save-note").addEventListener("click", async () => {
    if (!currentUser) {
        authContainer.style.display = 'block';
        return;
    }
    
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
        timestamp: currentTime
    };

    try {
        const response = await fetch(`${apiUrl}/save-note`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${currentUser.idToken}`
            },
            body: JSON.stringify(noteData),
        });

        if (response.ok) {
            loadNotes();
            document.getElementById("yt-notes-text").value = "";
        } else {
            throw new Error("Failed to save note");
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
let currentMCQIndex = 0;
let mcqs = [];

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
            mcqs = JSON.parse(data.result).mcqs;
            currentMCQIndex = 0;
            displayMCQ(currentMCQIndex);
            
            // Enable/disable navigation buttons
            document.getElementById("prev-btn").disabled = currentMCQIndex === 0;
            document.getElementById("next-btn").disabled = currentMCQIndex === mcqs.length - 1;
        }
    } catch (error) {
        console.error("Error generating MCQs:", error);
        alert("Failed to generate MCQs. Please try again.");
    }
});

document.getElementById("next-btn").addEventListener("click", () => {
    if (currentMCQIndex < mcqs.length - 1) {
        currentMCQIndex++;
        displayMCQ(currentMCQIndex);
        document.getElementById("prev-btn").disabled = false;
        document.getElementById("next-btn").disabled = currentMCQIndex === mcqs.length - 1;
    }
});

document.getElementById("prev-btn").addEventListener("click", () => {
    if (currentMCQIndex > 0) {
        currentMCQIndex--;
        displayMCQ(currentMCQIndex);
        document.getElementById("prev-btn").disabled = currentMCQIndex === 0;
        document.getElementById("next-btn").disabled = false;
    }
});

function displayMCQ(index) {
    const mcqContainer = document.getElementById("mcq-container");
    const mcq = mcqs[index];
    
    mcqContainer.innerHTML = `
        <div class="mcq-question">
            <h3>Question ${index + 1} of ${mcqs.length}</h3>
            <p>${mcq.question}</p>
            <div class="mcq-options">
                ${mcq.options.map((option, i) => `
                    <div class="mcq-option">
                        <input type="radio" name="mcq-${index}" value="${i}" id="option-${i}">
                        <label for="option-${i}" class="option-label">${option.text}</label>
                    </div>
                `).join('')}
            </div>
            <div class="mcq-feedback"></div>
        </div>
    `;

    // Add event listeners to radio buttons
    const radioButtons = mcqContainer.querySelectorAll('input[type="radio"]');
    const optionLabels = mcqContainer.querySelectorAll('.option-label');
    
    radioButtons.forEach(radio => {
        radio.addEventListener('change', () => {
            const selectedAnswer = parseInt(radio.value);
            const feedback = mcqContainer.querySelector('.mcq-feedback');
            
            // Reset all labels to default color
            optionLabels.forEach(label => {
                label.style.color = 'inherit';
            });
            
            if (mcq.options[selectedAnswer].correct) {
                // If correct, show the selected answer in green
                optionLabels[selectedAnswer].style.color = 'green';
                feedback.innerHTML = '<p style="color: green;">Correct!</p>';
            } else {
                // If incorrect, show the selected answer in red
                optionLabels[selectedAnswer].style.color = 'red';
                
                // Find and show the correct answer in green
                const correctIndex = mcq.options.findIndex(opt => opt.correct);
                optionLabels[correctIndex].style.color = 'green';
                
                feedback.innerHTML = '<p style="color: red;">Incorrect. The correct answer is highlighted in green.</p>';
            }
            
            // Disable all radio buttons after an answer is selected
            radioButtons.forEach(btn => btn.disabled = true);
        });
    });
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
            
            // Save summary to Firestore if user is signed in
            if (currentUser) {
                try {
                    await fetch(`${apiUrl}/save-summary`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${currentUser.idToken}`
                        },
                        body: JSON.stringify({
                            videoId,
                            summary: data.result
                        })
                    });
                } catch (error) {
                    console.error("Error saving summary:", error);
                }
            }
        }
    } catch (error) {
        console.error("Error generating summary:", error);
        alert("Failed to generate summary. Please try again.");
    }
});

// Load saved summary if available
const loadSummary = async () => {
    try {
        const headers = currentUser ? { 'Authorization': `Bearer ${currentUser.idToken}` } : {};
        const response = await fetch(`${apiUrl}/fetch-summary/${videoId}`, { headers });
        
        if (response.ok) {
            const data = await response.json();
            if (data.summary) {
                document.getElementById("summary-text").value = data.summary;
            } else {
                document.getElementById("summary-text").value = "";
            }
        }
    } catch (error) {
        console.error("Error loading summary:", error);
    }
};

// Video History Functions
async function loadWatchTime() {
    try {
        const headers = currentUser ? { 'Authorization': `Bearer ${currentUser.idToken}` } : {};
        const response = await fetch(`${apiUrl}/analytics/watch-time/${videoId}`, { headers });
        
        if (response.ok) {
            const data = await response.json();
            if (data && data.watchTime !== undefined) {
                // Only update accumulated time if it's less than the stored time
                // This ensures we keep the highest watch time
                if (data.watchTime > accumulatedTime) {
                    accumulatedTime = data.watchTime;
                    timerElement.querySelector('.timer-display').textContent = formatTime(accumulatedTime);
                }
            }
        }
    } catch (error) {
        console.error("Error loading watch time:", error);
    }
}

async function saveVideoToHistory() {
    if (!currentUser) return;
    
    const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent;
    if (!videoTitle || !videoId) return;

    const totalElapsed = startTime 
        ? accumulatedTime + ((Date.now() - startTime) / 1000)
        : accumulatedTime;

    try {
        await fetch(`${apiUrl}/analytics/watch-time`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.idToken}`
            },
            body: JSON.stringify({
                videoId,
                title: videoTitle,
                url: window.location.href,
                watchTime: Math.floor(totalElapsed),
                lastWatched: new Date().toISOString()
            })
        });
    } catch (error) {
        console.error("Error saving watch time:", error);
    }
}

function resetTimer() {
    if (timer) {
        cancelAnimationFrame(timer);
        timer = null;
    }
    startTime = null;
    isVideoPlaying = false;
    // Don't reset accumulatedTime here
    timerElement.querySelector('.timer-display').textContent = formatTime(accumulatedTime);
}

// Event Listeners
panelButton.addEventListener("click", () => {
    unifiedPanel.style.display = unifiedPanel.style.display === "none" ? "flex" : "none";
    if (unifiedPanel.style.display === "flex") {
        loadNotes();
        loadSummary();
    }
});

document.getElementById("close-panel").addEventListener("click", () => {
    unifiedPanel.style.display = "none";
});

// Auth button event listeners
document.getElementById('google-signin-btn')?.addEventListener('click', handleGoogleSignIn);
document.getElementById('skip-auth-btn')?.addEventListener('click', () => {
    authContainer.style.display = 'none';
});
document.getElementById('sign-out-btn')?.addEventListener('click', signOut);

// Video player state observers
function setupVideoObserver() {
    const video = document.querySelector('video');
    if (!video) {
        // If video element is not found, try again after a short delay
        setTimeout(setupVideoObserver, 1000);
        return;
    }

    // Remove any existing event listeners
    video.removeEventListener('play', handlePlay);
    video.removeEventListener('pause', handlePause);
    video.removeEventListener('ended', handleEnded);

    // Add new event listeners
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    // If video is already playing, start the timer
    if (!video.paused) {
        isVideoPlaying = true;
        startTimer();
    }
}

// Separate event handler functions for better management
function handlePlay() {
    isVideoPlaying = true;
    startTimer();
}

function handlePause() {
    isVideoPlaying = false;
    pauseTimer();
}

function handleEnded() {
    isVideoPlaying = false;
    pauseTimer();
}

// Add beforeunload event listener to pause timer when leaving the page
window.addEventListener('beforeunload', () => {
    if (isVideoPlaying) {
        pauseTimer();
    }
});