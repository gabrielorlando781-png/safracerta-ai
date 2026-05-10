const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function testGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("API Key found:", apiKey ? "Yes" : "No");
    if (!apiKey) return;

    try {
        const genAI = new GoogleGenerativeAI(apiKey); // SDK default should be fine, but let's check if it uses v1beta
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent("Respond with 'OK' if you can hear me.");
        const response = await result.response;
        console.log("Gemini Response:", response.text());
    } catch (err) {
        console.error("Gemini Error:", err.message);
    }
}

testGemini();
