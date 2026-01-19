// Multi-agent AI system with voting mechanism

class AIAgentSystem {
  constructor() {
    // Added 'grok' as a new agent
    this.agents = ['openai', 'gemini', 'anthropic', 'grok'];
    this.lastCallTime = {}; // Track last call time for rate limiting
    this.rateLimitDelay = 1000; // 1 second delay between calls
  }

  /**
   * Wait for rate limit
   */
  async waitForRateLimit(agent) {
    const now = Date.now();
    const lastCall = this.lastCallTime[agent] || 0;
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastCallTime[agent] = Date.now();
  }

  /**
   * Generate responses from all agents
   */
  async generateResponses(prompt, context) {
    const apiKeys = await StorageManager.getAPIKeys();
    const responses = {};

    const promises = this.agents.map(async (agent) => {
      try {
        const response = await this.callAgent(agent, prompt, context, apiKeys);
        responses[agent] = response;
      } catch (error) {
        console.error(`Error calling ${agent}:`, error);
        responses[agent] = { error: error.message };
      }
    });

    await Promise.all(promises);
    return responses;
  }

  /**
   * Have agents vote on the best response
   */
  async voteOnBestResponse(responses, prompt, context) {
    const apiKeys = await StorageManager.getAPIKeys();
    const votes = {};

    const votePromises = this.agents.map(async (agent) => {
      // Filter out agents that failed to generate a response
      if (responses[agent] && responses[agent].error) return;

      try {
        const vote = await this.getVote(agent, responses, prompt, context, apiKeys);
        votes[agent] = vote;
      } catch (error) {
        console.error(`Error getting vote from ${agent}:`, error);
        votes[agent] = null;
      }
    });

    await Promise.all(votePromises);

    const voteCounts = {};
    Object.values(votes).forEach(vote => {
      if (vote && vote !== 'error') {
        voteCounts[vote] = (voteCounts[vote] || 0) + 1;
      }
    });

    // Determine winner based on votes
    const validAgents = Object.keys(voteCounts);
    if (validAgents.length === 0) {
      // Fallback if no valid votes: Pick the first successful response
      return {
        selectedResponse: Object.values(responses).find(r => !r.error) || "No valid response generated.",
        winner: Object.keys(responses).find(k => !responses[k].error) || "none"
      };
    }

    const winner = validAgents.reduce((a, b) =>
      voteCounts[a] > voteCounts[b] ? a : b
    );

    return {
      selectedResponse: responses[winner],
      votes,
      voteCounts,
      winner
    };
  }

  /**
   * Main method: Generate and vote on best response
   */
  async getBestResponse(fieldType, question, userProfile, jobDescription, learningData) {
    const context = this.buildContext(fieldType, question, userProfile, jobDescription, learningData);
    const prompt = this.buildPrompt(fieldType, question, context);

    const responses = await this.generateResponses(prompt, context);
    const result = await this.voteOnBestResponse(responses, prompt, context);

    return {
      ...result,
      allResponses: responses
    };
  }

  /**
   * Build context for AI agents
   */
  buildContext(fieldType, question, userProfile, jobDescription, learningData) {
    // FIX: Using positiveExamples correctly as per learning.js output
    const similarResponses = learningData.positiveExamples || [];

    return {
      fieldType,
      question,
      resume: userProfile.resume,
      linkedIn: userProfile.linkedIn,
      jobDescription,
      similarResponses
    };
  }

  /**
   * Build prompt for generating response
   */
  buildPrompt(fieldType, question, context) {
    let prompt = `You are helping fill out a job application. Generate a professional, human-like response to the following question.\n\n`;
    prompt += `Field Type: ${fieldType}\n`;
    prompt += `Question: ${question}\n\n`;

    const relevantJobInfo = this.extractRelevantJobInfo(context.jobDescription);
    prompt += `Job Description Summary:\n${relevantJobInfo}\n\n`;

    prompt += `Candidate Resume Data:\n${JSON.stringify(context.resume, null, 2)}\n\n`;

    if (context.linkedIn) {
      prompt += `LinkedIn Profile Data:\n${JSON.stringify(context.linkedIn, null, 2)}\n\n`;
    }

    if (context.similarResponses.length > 0) {
      prompt += `Past successful responses for context:\n`;
      context.similarResponses.forEach((r, i) => {
        prompt += `${i + 1}. Q: ${r.question}\n   A: ${r.response}\n`;
      });
      prompt += `\n`;
    }

    prompt += `Response Requirements:\n`;
    prompt += `- Professional, tailored, and concise.\n`;
    prompt += `- Natural and human-like (no generic templates).\n`;
    prompt += `- Strictly use details from the provided resume.\n\n`;
    prompt += `Response:`;

    return prompt;
  }

  /**
   * Extract key sections to save tokens
   */
  extractRelevantJobInfo(jobDescription) {
    if (!jobDescription || jobDescription.length <= 1500) return jobDescription;
    
    const text = jobDescription.toLowerCase();
    const sections = [];
    
    const respMatch = text.search(/responsibilities|duties|what you'll do/i);
    if (respMatch !== -1) sections.push(jobDescription.substring(respMatch, respMatch + 600));

    const reqMatch = text.search(/requirements|qualifications|what we're looking for/i);
    if (reqMatch !== -1) sections.push(jobDescription.substring(reqMatch, reqMatch + 600));

    return sections.length > 0 ? sections.join('\n\n') : jobDescription.substring(0, 1500) + '...';
  }

  /**
   * Normalize API key config. Supports either a plain string key or an object
   * like { key, model } / { apiKey, model } / { token, model }.
   */
  normalizeKeyConfig(raw, defaultModel) {
    if (!raw) return { key: null, model: defaultModel };
    if (typeof raw === 'string') return { key: raw, model: defaultModel };

    // Object form
    const key = raw.key || raw.apiKey || raw.token || null;
    const model = raw.model || defaultModel;
    return { key, model };
  }

  /**
   * Call an agent WITHOUT fallback (useful for voting, where fallback would
   * misattribute who cast the vote).
   */
  async callAgentNoFallback(agent, prompt, context, apiKeys) {
    await this.waitForRateLimit(agent);

    switch (agent) {
      case 'openai': return await this.callOpenAI(prompt, apiKeys.openai);
      case 'gemini': return await this.callGemini(prompt, apiKeys.gemini);
      case 'anthropic': return await this.callAnthropic(prompt, apiKeys.anthropic);
      case 'grok': return await this.callGrok(prompt);
      default: throw new Error(`Unknown agent: ${agent}`);
    }
  }

  /**
   * Call specific AI agent
   */
  async callAgent(agent, prompt, context, apiKeys) {
    await this.waitForRateLimit(agent);

    try {
      switch (agent) {
        case 'openai': return await this.callOpenAI(prompt, apiKeys.openai);
        case 'gemini': return await this.callGemini(prompt, apiKeys.gemini);
        case 'anthropic': return await this.callAnthropic(prompt, apiKeys.anthropic);
        case 'grok': return await this.callGrok(prompt); // Puter implementation
        default: throw new Error(`Unknown agent: ${agent}`);
      }
    } catch (error) {
      return await this.tryFallbackAgent(agent, prompt, context, apiKeys, error);
    }
  }

  /**
   * Fallback logic
   */
  async tryFallbackAgent(failedAgent, prompt, context, apiKeys, originalError) {
    const fallbacks = this.agents.filter(a => a !== failedAgent);
    for (const fallback of fallbacks) {
      if (fallback !== 'grok' && !apiKeys[fallback]) continue;
      try {
        return await this.callAgent(fallback, prompt, context, apiKeys);
      } catch (err) { continue; }
    }
    throw originalError;
  }

  async callOpenAI(prompt, apiKey) {
    const { key, model } = this.normalizeKeyConfig(apiKey, 'gpt-3.5-turbo');
    if (!key) throw new Error('OpenAI key missing');

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.7 })
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = data?.error?.message || `OpenAI request failed (${resp.status})`;
      throw new Error(msg);
    }

    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('OpenAI returned an empty response');
    return text.trim();
  }

  async callGemini(prompt, apiKey) {
    const { key, model } = this.normalizeKeyConfig(apiKey, 'gemini-pro');
    if (!key) throw new Error('Gemini key missing');

    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = data?.error?.message || `Gemini request failed (${resp.status})`;
      throw new Error(msg);
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned an empty response');
    return text.trim();
  }

  async callAnthropic(prompt, apiKey) {
    const { key, model } = this.normalizeKeyConfig(apiKey, 'claude-3-haiku-20240307');
    if (!key) throw new Error('Anthropic key missing');

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 500, messages: [{ role: 'user', content: prompt }] })
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = data?.error?.message || `Anthropic request failed (${resp.status})`;
      throw new Error(msg);
    }

    const text = data?.content?.[0]?.text;
    if (!text) throw new Error('Anthropic returned an empty response');
    return text.trim();
  }

  /**
   * Call Grok via Puter.js (Free access)
   */
  async callGrok(prompt) {
    if (typeof puter === 'undefined') throw new Error('Puter SDK not loaded');
    // Using Puter's Grok 4.1 Fast model
    const response = await puter.ai.chat(prompt, { model: 'x-ai/grok-4.1-fast' });
    return response.message.content.trim();
  }

  async getVote(votingAgent, responses, originalPrompt, context, apiKeys) {
    const otherAgents = this.agents.filter(a => a !== votingAgent && responses[a] && !responses[a].error);
    if (otherAgents.length === 0) return 'error';

    let votePrompt = `Evaluate the following AI responses for a job application. Which one is best?\n\nContext:\n${originalPrompt}\n\n`;
    otherAgents.forEach((agent, i) => {
      votePrompt += `Option ${i+1} (${agent}):\n${responses[agent]}\n\n`;
    });
    votePrompt += `Reply ONLY with the name of the winning agent: ${otherAgents.join(', ')}`;

    try {
      const voteResp = await this.callAgentNoFallback(votingAgent, votePrompt, context, apiKeys);
      const cleaned = voteResp.toLowerCase();
      return otherAgents.find(a => cleaned.includes(a.toLowerCase())) || otherAgents[0];
    } catch (e) { return 'error'; }
  }
}

window.AIAgentSystem = new AIAgentSystem();