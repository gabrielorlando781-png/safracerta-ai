const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
require('dotenv').config();

async function test() {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    console.log("Testing Gemini with model: gemini-2.0-flash");
    
    try {
        const uploadsDir = 'public/uploads';
        if (!fs.existsSync(uploadsDir)) {
            console.log("No uploads directory found.");
            return;
        }
        const files = fs.readdirSync(uploadsDir);
        const imageFile = files.find(f => f.endsWith('.jpg') || f.endsWith('.png'));
        
        if (!imageFile) {
            console.log("No image files in uploads to test.");
            return;
        }
        
        const photoPath = `${uploadsDir}/${imageFile}`;
        console.log("Using test image:", photoPath);

        const imagePart = {
            inlineData: {
                data: Buffer.from(fs.readFileSync(photoPath)).toString("base64"),
                mimeType: "image/jpeg"
            }
        };

        const result = await model.generateContent(["Identify this plant disease", imagePart]);
        const response = await result.response;
        console.log("SUCCESS! Response received.");
        console.log("Response Preview:", response.text().substring(0, 200) + "...");
    } catch (err) {
        console.error("Gemini Error:", err.message);
    }
}

test();
