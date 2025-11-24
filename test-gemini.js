const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error('No API key found in .env.local');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function testModel(modelName) {
    console.log(`Testing model: ${modelName}...`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hello, are you there?');
        const response = await result.response;
        console.log(`✅ ${modelName} SUCCESS: ${response.text()}`);
        return true;
    } catch (error) {
        console.log(`❌ ${modelName} FAILED: ${error.message}`);
        return false;
    }
}

async function run() {
    const modelsToTest = [
        'gemini-2.5-pro',
        'gemini-2.0-flash',
        'gemini-1.5-pro',
        'gemini-1.5-flash'
    ];

    console.log('Starting model availability check...');

    for (const model of modelsToTest) {
        await testModel(model);
    }
}

run();
