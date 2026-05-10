const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    try {
        const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        console.log("Available Models (v1):", data.models ? data.models.map(m => m.name) : data);
        
        const urlBeta = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const responseBeta = await fetch(urlBeta);
        const dataBeta = await responseBeta.json();
        console.log("Available Models (v1beta):", dataBeta.models ? dataBeta.models.map(m => m.name) : dataBeta);
    } catch (err) {
        console.error("Error:", err.message);
    }
}

listModels();
