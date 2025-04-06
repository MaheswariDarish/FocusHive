from flask import Flask, request, jsonify
from flask_cors import CORS  # Import CORS
from youtube_transcript_api import YouTubeTranscriptApi
from dotenv import load_dotenv
import google.generativeai as genai
import os
import json
import requests

load_dotenv()
# Initialize Flask app
app = Flask(__name__)

# Enable CORS for the entire app
CORS(app)  # This will allow all origins. You can also restrict to specific origins.

# Set up Gemini API
os.environ["GOOGLE_API_KEY"] = os.getenv("API_KEY")
genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
model = genai.GenerativeModel("models/gemini-1.5-flash")

# Cache for transcripts
transcript_cache = {}

def format_mcqs(input_string):
    mcq_sections = input_string.strip().split("## MCQ")[1:]
    formatted_mcqs = []

    for section in mcq_sections:
        lines = section.strip().split("\n")
        question_line = next((line for line in lines if line.startswith("Question: ")), None)
        if question_line is None:
            raise ValueError(f"Missing question in section: {section}")
        question = question_line.replace("Question: ", "").strip()

        options_lines = [line for line in lines if line.startswith(("A)", "B)", "C)", "D)"))]
        if len(options_lines) != 4:
            raise ValueError(f"Invalid number of options in section: {section}")

        options = [line.split(") ", 1)[1].strip() for line in options_lines]
        correct_answer_line = next((line for line in lines if line.startswith("Correct Answer: ")), None)
        if correct_answer_line is None:
            raise ValueError(f"Missing correct answer in section: {section}")
        correct_option = correct_answer_line.replace("Correct Answer: ", "").strip()

        formatted_options = [
            {"text": option, "correct": idx == ord(correct_option) - ord('A')}
            for idx, option in enumerate(options)
        ]

        formatted_mcqs.append({
            "question": question,
            "options": formatted_options
        })

    return json.dumps({"mcqs": formatted_mcqs}, indent=2)

def fetch_transcript(video_id):
    if video_id in transcript_cache:
        return transcript_cache[video_id]
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
    keywords = data.get('keywords', [])  # Get keywords from request
    user_id = "user123"

    if not video_id:
        return jsonify({'error': 'No video ID provided'}), 400

    try:
        transcript_text = fetch_transcript(video_id)
    except Exception as e:
        return jsonify({'error': f'Error fetching transcript: {str(e)}'}), 400

    try:
        if keywords and len(keywords) > 0:
            # Create a focused prompt for keyword-based summarization
            keywords_str = ", ".join(keywords)
            prompt = f"""Summarize the transcript below with a focus on these keywords: {keywords_str}.

                         - For each keyword, explain its context and relevance.
                         - If keywords are related, mention how.
                         - If a keyword is missing, note: "[keyword] not found."
                         - If none are found, give a general summary instead.

                        Transcript:
                           {transcript_text}"""
        else:
            # Use the original prompt for general summarization
            prompt = f"Summarize the transcript clearly and concisely. Include key concepts, examples, and explanations.Transcript: {transcript_text}"

        response = model.generate_content(prompt).text.strip()
        print("summary:", response)

        # Send summary, userId, and videoId to the respective endpoint
        summary_data = {
            "userId": user_id, 
            "videoId": video_id, 
            "summary": response,
            "keywords": keywords  # Include keywords in the saved data
        }
        requests.post("http://127.0.0.1:5000/generate-summary", json=summary_data)
    except Exception as e:
        return jsonify({'error': f'Error generating summary: {str(e)}'}), 500

    return jsonify({'result': response})

if __name__ == '__main__':
    app.run(debug=True)
