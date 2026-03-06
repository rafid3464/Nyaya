/**
 * Nyaya AI Service — Calls the local Python AI inference server
 * Replaces the Gemini service with a local ML model endpoint.
 */

const axios = require('axios');

const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:8001';

/**
 * Get legal guidance from the local AI model
 * @param {string} question - The user's legal question
 * @param {string} context - Optional document text for context
 * @returns {Promise<{answer: string}>}
 */
async function getLocalAIResponse(question, context = '') {
    try {
        const response = await axios.post(`${AI_SERVER_URL}/ask`, {
            question,
            context
        }, {
            timeout: 300000, // 5 min timeout — first GPU request needs warmup
            headers: { 'Content-Type': 'application/json' }
        });

        return { answer: response.data.answer };
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            throw new Error(
                'AI Server is not running. Please start it with: cd ai_model && python inference_server.py'
            );
        }
        if (error.response) {
            throw new Error(`AI Server error: ${error.response.data?.detail || error.response.statusText}`);
        }
        throw new Error(`AI Service error: ${error.message}`);
    }
}

module.exports = { getLocalAIResponse };
