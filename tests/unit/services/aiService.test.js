const aiService = require('../../../src/services/aiService');

// Mock fetch globally
global.fetch = jest.fn();

describe('AI Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.OPENAI_API_KEY;
    });

    describe('isEnabled', () => {
        test('should return false when no API keys are set', () => {
            expect(aiService.isEnabled()).toBe(false);
        });

        test('should return true when OPENAI_API_KEY is set', () => {
            process.env.OPENAI_API_KEY = 'test-key';
            expect(aiService.isEnabled()).toBe(true);
        });
    });

    describe('generateQuery', () => {
        test('should return error when AI not enabled', async () => {
            const result = await aiService.generateQuery('test prompt');
            expect(result.success).toBe(false);
            expect(result.message).toContain('not configured');
        });

        test('should call OpenAI API when enabled', async () => {
            process.env.OPENAI_API_KEY = 'test-key';

            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    choices: [{ message: { content: '{"filter": {"age": {"$gt": 25}}}' } }]
                })
            };
            fetch.mockResolvedValue(mockResponse);

            const result = await aiService.generateQuery('Find users older than 25');

            expect(fetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', expect.any(Object));
            expect(result.success).toBe(true);
            expect(result.query).toBe('{"filter": {"age": {"$gt": 25}}}');
        });

        test('should handle API errors gracefully', async () => {
            process.env.OPENAI_API_KEY = 'test-key';

            const mockResponse = {
                ok: false,
                status: 400
            };
            fetch.mockResolvedValue(mockResponse);

            const result = await aiService.generateQuery('test prompt');

            expect(result.success).toBe(false);
            expect(result.message).toContain('API error');
        });
    });

    describe('explainError', () => {
        test('should return original error when AI not enabled', async () => {
            const errorMessage = 'Syntax error';
            const result = await aiService.explainError(errorMessage);

            expect(result.success).toBe(true);
            expect(result.explanation).toBe(errorMessage);
        });
    });
});