from flask import Flask, request, jsonify
from flask_cors import CORS  # Import CORS
from youtube_transcript_api import YouTubeTranscriptApi
import google.generativeai as genai
import os
import json

# Initialize Flask app
app = Flask(__name__)

# Enable CORS for the entire app
CORS(app)  # This will allow all origins. You can also restrict to specific origins.

# Set up Gemini API
os.environ["GOOGLE_API_KEY"] = "AIzaSyDUklL1ux4c1DuLGEr01UK-fatCW4dAI5A"
genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
model = genai.GenerativeModel("models/gemini-1.5-pro")



# Cache for transcripts
transcript_cache = {}

def format_mcqs(input_string):
    # Split the input into separate MCQs
    mcq_sections = input_string.strip().split("## MCQ")[1:]

    # Prepare the list to hold formatted MCQs
    formatted_mcqs = []

    for section in mcq_sections:
        # Split the section into individual lines
        lines = section.strip().split("\n")

        # Extract question
        question_line = next((line for line in lines if line.startswith("Question: ")), None)
        if question_line is None:
            raise ValueError(f"Missing question in section: {section}")
        question = question_line.replace("Question: ", "").strip()

        # Extract options (A, B, C, D)
        options_lines = [line for line in lines if line.startswith(("A)", "B)", "C)", "D)"))]
        if len(options_lines) != 4:
            raise ValueError(f"Invalid number of options in section: {section}")

        options = [line.split(") ", 1)[1].strip() for line in options_lines]

        # Extract correct answer
        correct_answer_line = next((line for line in lines if line.startswith("Correct Answer: ")), None)
        if correct_answer_line is None:
            raise ValueError(f"Missing correct answer in section: {section}")
        correct_option = correct_answer_line.replace("Correct Answer: ", "").strip()

        # Format options with the correct one marked
        formatted_options = [
            {"text": option, "correct": idx == ord(correct_option) - ord('A')}
            for idx, option in enumerate(options)
        ]

        # Add the formatted question and options to the list
        formatted_mcqs.append({
            "question": question,
            "options": formatted_options
        })

    # Convert to JSON format with indentation
    return json.dumps({"mcqs": formatted_mcqs}, indent=2)


def fetch_transcript(video_id):
    """
    Fetches the transcript for a given video ID.
    Caches the transcript to avoid redundant API calls.
    """
    if video_id in transcript_cache:
        return transcript_cache[video_id]

    # Fetch the transcript and cache it
    transcript = YouTubeTranscriptApi.get_transcript(video_id)
    transcript_text = " ".join([entry['text'] for entry in transcript])
    transcript_cache[video_id] = transcript_text
    return transcript_text


@app.route('/generate_mcqs', methods=['POST'])
def generate_mcqs():
    data = request.get_json()
    video_id = data.get('video_id')

    if not video_id:
        return jsonify({'error': 'No video ID provided'}), 400

    try:
        transcript_text = fetch_transcript(video_id)
    except Exception as e:
        return jsonify({'error': f'Error fetching transcript: {str(e)}'}), 400

    try:
        prompt = f"""
    You are an AI assistant helping the user generate multiple-choice questions (MCQs) based on the following text:
    '{transcript_text}'
    Please generate 5 MCQs from the text. Each question should have:
    - A clear question
    - Four answer options (labeled A, B, C, D)
    - The correct answer clearly indicated
    Format:
    ## MCQ
    Question: [question]
    A) [option A]
    B) [option B]
    C) [option C]
    D) [option D]
    Correct Answer: [correct option]
    """
        unformatted_response = model.generate_content(prompt).text.strip()
        
        
        response = format_mcqs(unformatted_response)
      
        print("Formatted MCQs Response:", response)

    except Exception as e:
        return jsonify({'error': f'Error generating MCQs: {str(e)}'}), 500

    return jsonify({'result': response})



@app.route('/generate_summary', methods=['POST'])
def generate_summary():
    data = request.get_json()
    video_id = data.get('video_id')

    if not video_id:
        return jsonify({'error': 'No video ID provided'}), 400

    try:
        # Fetch transcript from cache or API
        transcript_text = fetch_transcript(video_id)
    except Exception as e:
        return jsonify({'error': f'Error fetching transcript: {str(e)}'}), 400

    try:
        prompt = f"Generate a summary from this transcript: {transcript_text}"
        response =  model.generate_content(prompt).text.strip()
      
        print("summary:", response)
    except Exception as e:
        return jsonify({'error': f'Error generating summary: {str(e)}'}), 500

    return jsonify({'result': response})


if __name__ == '__main__':
    app.run(debug=True)
