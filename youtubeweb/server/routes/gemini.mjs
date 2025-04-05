// test-gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(""); // 🔁 Replace with your actual API key

async function main() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: "Explain how AI works" }],
        },
      ],
    });

    const response = await result.response;
    console.log("Gemini says:\n", response.text());
  } catch (error) {
    console.error("Error calling Gemini API:", error);
  }
}

main();
