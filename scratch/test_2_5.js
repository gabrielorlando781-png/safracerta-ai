const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function test() {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    try {
        const result = await model.generateContent("Hello?");
        const response = await result.response;
        console.log("SUCCESS with 2.5 flash:", response.text());
    } catch (err) {
        console.error("FAIL with 2.5 flash:", err.message);
    }
}

test();
