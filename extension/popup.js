document.addEventListener('DOMContentLoaded', () => {
    let mcqs = [];
    let currentMCQIndex = 0;

    const getVideoIdFromUrl = (url) => {
        const urlParams = new URL(url).searchParams;
        return urlParams.get("v");
    };

    const handleGenerate = async (type) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            const videoId = getVideoIdFromUrl(activeTab.url);

            if (!videoId) {
                document.getElementById("output").value = "Error: No video ID found in the URL.";
                return;
            }

            const apiEndpoint = `http://127.0.0.1:5000/${type}`;
            fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ video_id: videoId }),
            })
            .then((response) => response.json())
            .then((data) => {
                if (data.result) {
                    // Parse the result to an object if it's a string
                    

                    if (type === "generate_mcqs") {
                        const result = JSON.parse(data.result);
                        if (result.mcqs && result.mcqs.length > 0) {
                            mcqs = result.mcqs;
                            currentMCQIndex = 0;
                            displayMCQ(mcqs[currentMCQIndex]);
                            toggleSliderButtons();
                        } else {
                            document.getElementById("output").value = "No MCQs generated. Please try again.";
                        }
                    } else if (type === "generate_summary") {
                        
                        document.getElementById("output").value = data.result || "No result available.";
                    }
                } else {
                    document.getElementById("output").value = "Error: No result received from server.";
                }
            })
            .catch((error) => {
                document.getElementById("output").value = `Error: ${error.message}`;
                console.error(error);
            });
        });
    };

    document.getElementById("generate-mcqs-btn").addEventListener("click", () => handleGenerate("generate_mcqs"));
    document.getElementById("generate-summary-btn").addEventListener("click", () => handleGenerate("generate_summary"));

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
        mcqContainer.innerHTML = ''; // Clear previous content
        const mcqDiv = document.createElement('div');
        mcqDiv.classList.add('mcq');
        mcqDiv.innerHTML = `
            <p>${mcq.question}</p>
            <ul class="mcq-options">
                ${mcq.options.map((option, idx) => {
                    return `<li class="mcq-option" data-correct="${option.correct}" data-option="${idx}">${option.text}</li>`;
                }).join('')}
            </ul>
        `;
        mcqContainer.appendChild(mcqDiv);

        // Attach click event to options
        const mcqOptions = mcqDiv.querySelectorAll('.mcq-option');
        mcqOptions.forEach(option => {
            option.addEventListener('click', function () {
                selectAnswer(option, mcqOptions);
            });
        });
    }

    function selectAnswer(option, options) {
        const selectedOptionIdx = option.getAttribute('data-option');
        const correctOptionIdx = Array.from(options).findIndex(opt => opt.getAttribute('data-correct') === "true");

        // Reset all options to their default state
        options.forEach(opt => {
            opt.classList.remove('correct', 'incorrect');
        });

        // Highlight the selected option and the correct one
        options.forEach((opt, idx) => {
            if (idx == selectedOptionIdx) {
                opt.classList.add(opt.getAttribute('data-correct') === "true" ? 'correct' : 'incorrect');
            } else if (idx === correctOptionIdx) {
                opt.classList.add('correct');
            }
        });

        // Disable further clicks on options
        options.forEach(opt => opt.removeEventListener('click', selectAnswer));
    }

    function toggleSliderButtons() {
        const prevBtn = document.getElementById("prev-btn");
        const nextBtn = document.getElementById("next-btn");

        prevBtn.disabled = currentMCQIndex === 0;
        nextBtn.disabled = currentMCQIndex === mcqs.length - 1;
    }
});


document.getElementById("open-notes").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab.url.includes("youtube.com/watch")) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            document.getElementById("yt-notes-panel").style.display = "flex";
          },
        });
      } else {
        alert("Please open a YouTube video to use this feature.");
      }
    });
  });
  