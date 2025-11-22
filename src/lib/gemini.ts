import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn('GEMINI_API_KEY is missing. Check your .env.local file.');
}

const genAI = new GoogleGenerativeAI(apiKey || 'placeholder');

// Export configured models
export const geminiFlash = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
export const geminiPro = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
