"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatAI = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors");
const openai_1 = require("openai");
const sdk_1 = require("@anthropic-ai/sdk");
admin.initializeApp();
const corsHandler = cors({ origin: true });
// Initialize AI clients
const openai = new openai_1.default({
    apiKey: ((_a = functions.config().openai) === null || _a === void 0 ? void 0 : _a.key) || process.env.OPENAI_API_KEY
});
const anthropic = new sdk_1.default({
    apiKey: ((_b = functions.config().anthropic) === null || _b === void 0 ? void 0 : _b.key) || process.env.ANTHROPIC_API_KEY
});
exports.chatAI = functions.https.onRequest((request, response) => {
    corsHandler(request, response, async () => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        try {
            // Verify authentication
            const authHeader = request.headers.authorization;
            if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
                response.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const token = authHeader.split('Bearer ')[1];
            try {
                await admin.auth().verifyIdToken(token);
            }
            catch (error) {
                response.status(401).json({ error: 'Invalid token' });
                return;
            }
            const { messages, model = 'gpt-4o', channelId, workspaceId } = request.body;
            if (!messages || !Array.isArray(messages)) {
                response.status(400).json({ error: 'Messages array is required' });
                return;
            }
            let result;
            // Determine provider from model
            if (model.startsWith('claude')) {
                // Use Anthropic
                const anthropicResponse = await anthropic.messages.create({
                    model: model,
                    max_tokens: 4096,
                    messages: messages.map(msg => ({
                        role: msg.role === 'user' ? 'user' : 'assistant',
                        content: msg.content
                    }))
                });
                result = {
                    content: anthropicResponse.content[0].type === 'text'
                        ? anthropicResponse.content[0].text
                        : 'Response not available',
                    usage: {
                        prompt_tokens: ((_a = anthropicResponse.usage) === null || _a === void 0 ? void 0 : _a.input_tokens) || 0,
                        completion_tokens: ((_b = anthropicResponse.usage) === null || _b === void 0 ? void 0 : _b.output_tokens) || 0,
                        total_tokens: (((_c = anthropicResponse.usage) === null || _c === void 0 ? void 0 : _c.input_tokens) || 0) + (((_d = anthropicResponse.usage) === null || _d === void 0 ? void 0 : _d.output_tokens) || 0)
                    }
                };
            }
            else {
                // Use OpenAI
                const actualModel = model === 'gpt-5' ? 'gpt-4o' :
                    model === 'gpt-5-mini' ? 'gpt-4o-mini' :
                        model === 'gpt-5-nano' ? 'gpt-3.5-turbo' :
                            model === 'gpt-4.1' ? 'gpt-4-turbo' :
                                model === 'gpt-4.1-mini' ? 'gpt-4o-mini' :
                                    model;
                const openaiResponse = await openai.chat.completions.create({
                    model: actualModel,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 4096
                });
                result = {
                    content: ((_f = (_e = openaiResponse.choices[0]) === null || _e === void 0 ? void 0 : _e.message) === null || _f === void 0 ? void 0 : _f.content) || 'No response generated',
                    usage: {
                        prompt_tokens: ((_g = openaiResponse.usage) === null || _g === void 0 ? void 0 : _g.prompt_tokens) || 0,
                        completion_tokens: ((_h = openaiResponse.usage) === null || _h === void 0 ? void 0 : _h.completion_tokens) || 0,
                        total_tokens: ((_j = openaiResponse.usage) === null || _j === void 0 ? void 0 : _j.total_tokens) || 0
                    }
                };
            }
            response.json({
                success: true,
                data: result
            });
        }
        catch (error) {
            console.error('Error processing AI chat:', error);
            response.status(500).json({
                success: false,
                error: error.message || 'Failed to process AI message'
            });
        }
    });
});
