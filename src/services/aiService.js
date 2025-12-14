const logger = require('../utils/logger');

// Minimal AI service with OpenAI integration
const isEnabled = () => {
    return !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
};

const generateQuery = async (prompt, schema = null) => {
    if (!process.env.OPENAI_API_KEY) {
        return {
            success: false,
            message: 'OpenAI API key not configured. Set OPENAI_API_KEY environment variable.'
        };
    }

    try {
        const systemPrompt = `You are a MongoDB query assistant. Generate a MongoDB query object based on the user's natural language request. Return only valid JSON for the query object, no explanations.

Schema information: ${schema ? JSON.stringify(schema) : 'No schema provided'}

Examples:
- "Find users older than 25" -> {"filter": {"age": {"$gt": 25}}}
- "Get products in electronics category" -> {"filter": {"category": "Electronics"}}`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 200,
                temperature: 0.1
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const queryText = data.choices[0]?.message?.content?.trim();

        if (!queryText) {
            throw new Error('No query generated');
        }

        // Validate it's JSON
        JSON.parse(queryText);

        logger.info('AI generated query successfully');
        return {
            success: true,
            query: queryText
        };
    } catch (error) {
        logger.error('AI generate query error', error);
        return {
            success: false,
            message: 'Failed to generate query: ' + error.message
        };
    }
};

const suggestImprovements = async (query) => {
    if (!process.env.OPENAI_API_KEY) {
        return { success: false, message: 'OpenAI API key not configured' };
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'Suggest improvements for this MongoDB query. Return a JSON array of suggestion strings.' },
                    { role: 'user', content: query }
                ],
                max_tokens: 300,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const suggestionsText = data.choices[0]?.message?.content?.trim();

        let suggestions = [];
        try {
            suggestions = JSON.parse(suggestionsText);
        } catch (e) {
            suggestions = [suggestionsText];
        }

        return { success: true, suggestions };
    } catch (error) {
        logger.error('AI suggest improvements error', error);
        return { success: false, message: 'Failed to get suggestions' };
    }
};

const explainQuery = async (query) => {
    if (!process.env.OPENAI_API_KEY) {
        return { success: false, explanation: 'OpenAI API key not configured' };
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'Explain this MongoDB query in simple terms.' },
                    { role: 'user', content: query }
                ],
                max_tokens: 300,
                temperature: 0.2
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const explanation = data.choices[0]?.message?.content?.trim() || 'No explanation available';

        return { success: true, explanation };
    } catch (error) {
        logger.error('AI explain query error', error);
        return { success: false, explanation: 'Failed to explain query' };
    }
};

const explainError = async (errorMessage) => {
    if (!process.env.OPENAI_API_KEY) {
        return { success: true, explanation: errorMessage };
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'Explain this MongoDB error in simple terms and suggest a fix.' },
                    { role: 'user', content: errorMessage }
                ],
                max_tokens: 300,
                temperature: 0.2
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const explanation = data.choices[0]?.message?.content?.trim() || errorMessage;

        return { success: true, explanation };
    } catch (error) {
        logger.error('AI explain error error', error);
        return { success: true, explanation: errorMessage };
    }
};

module.exports = {
    isEnabled,
    generateQuery,
    suggestImprovements,
    explainQuery,
    explainError
};
