// Multi-agent AI system with voting mechanism

class AIAgentSystem {
  constructor() {
    this.agents = ['openai', 'gemini', 'anthropic'];
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
   * Generate responses from all three AI agents
   */
  async generateResponses(prompt, context) {
    const apiKeys = await StorageManager.getAPIKeys();
    const responses = {};

    // Generate response from each agent in parallel
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

    // Each agent votes (excluding their own response)
    const votePromises = this.agents.map(async (agent) => {
      try {
        const vote = await this.getVote(agent, responses, prompt, context, apiKeys);
        votes[agent] = vote;
      } catch (error) {
        console.error(`Error getting vote from ${agent}:`, error);
        votes[agent] = null;
      }
    });

    await Promise.all(votePromises);

    // Count votes
    const voteCounts = {};
    Object.values(votes).forEach(vote => {
      if (vote && vote !== 'error') {
        voteCounts[vote] = (voteCounts[vote] || 0) + 1;
      }
    });

    // Return response with most votes
    const winner = Object.keys(voteCounts).reduce((a, b) =>
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

    // Generate responses from all agents
    const responses = await this.generateResponses(prompt, context);

    // Vote on best response
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
    // The LearningSystem.getRelevantLearning method already filters for positive matches
    // and returns { positiveExamples: [...], patterns: [...] }
    const similarResponses = learningData.positiveExamples || [];

    return {
      fieldType,
      question,
      resume: userProfile.resume,
      linkedIn: userProfile.linkedIn,
      jobDescription,
      similarResponses,
      patterns: learningData.patterns || []
    };
  }

  /**
   * Build prompt for generating response
   */
  buildPrompt(fieldType, question, context) {
    let prompt = `You are helping fill out a job application. Generate a professional, human-like response to the following question.\n\n`;
    prompt += `Field Type: ${fieldType}\n`;
    prompt += `Question: ${question}\n\n`;

    // Token budgeting: Extract most relevant sections from job description
    const relevantJobInfo = this.extractRelevantJobInfo(context.jobDescription);
    prompt += `Job Description:\n${relevantJobInfo}\n\n`;

    prompt += `Candidate Resume:\n${JSON.stringify(context.resume, null, 2)}\n\n`;

    if (context.linkedIn) {
      prompt += `LinkedIn Profile:\n${JSON.stringify(context.linkedIn, null, 2)}\n\n`;
    }

    if (context.similarResponses.length > 0) {
      prompt += `Examples of good responses for similar questions:\n`;
      context.similarResponses.forEach((r, i) => {
        prompt += `${i + 1}. Q: ${r.question}\n   A: ${r.response}\n\n`;
      });
    }

    prompt += `Generate a response that:\n`;
    prompt += `- Is tailored to this specific job and question\n`;
    prompt += `- Sounds natural and human-written\n`;
    prompt += `- Highlights relevant experience from the resume\n`;
    prompt += `- Is concise but complete\n`;
    prompt += `- Avoids generic or template-like language\n\n`;
    prompt += `Response:`;

    return prompt;
  }

  /**
   * Extract relevant sections from job description to save tokens
   */
  extractRelevantJobInfo(jobDescription) {
    if (!jobDescription || jobDescription.length <= 1500) {
      return jobDescription; // Short enough, use as-is
    }

    // Look for key sections
    const sections = [];
    const text = jobDescription.toLowerCase();

    // Find Responsibilities section
    const responsibilitiesStart = text.search(/responsibilities|duties|what you'll do/i);
    if (responsibilitiesStart !== -1) {
      const section = jobDescription.substring(responsibilitiesStart, responsibilitiesStart + 600);
      sections.push(section);
    }

    // Find Requirements section
    const requirementsStart = text.search(/requirements|qualifications|what we're looking for/i);
    if (requirementsStart !== -1) {
      const section = jobDescription.substring(requirementsStart, requirementsStart + 600);
      sections.push(section);
    }

    // If we found sections, return them; otherwise truncate
    if (sections.length > 0) {
      return sections.join('\n\n');
    }

    return jobDescription.substring(0, 1500) + '...';
  }

  /**
   * Call a specific AI agent with rate limiting and fallback
   */
  async callAgent(agent, prompt, context, apiKeys) {
    // Wait for rate limit
    await this.waitForRateLimit(agent);

    try {
      switch (agent) {
        case 'openai':
          return await this.callOpenAI(prompt, apiKeys.openai);
        case 'gemini':
          return await this.callGemini(prompt, apiKeys.gemini);
        case 'anthropic':
          return await this.callAnthropic(prompt, apiKeys.anthropic);
        default:
          throw new Error(`Unknown agent: ${agent}`);
      }
    } catch (error) {
      console.error(`[AI Agent] ${agent} failed:`, error);

      // Try fallback chain
      return await this.tryFallbackAgent(agent, prompt, context, apiKeys, error);
    }
  }

  /**
   * Try fallback agent if primary fails
   */
  async tryFallbackAgent(failedAgent, prompt, context, apiKeys, originalError) {
    // Determine fallback order
    const fallbackOrder = {
      'gemini': ['openai', 'anthropic'],
      'openai': ['gemini', 'anthropic'],
      'anthropic': ['gemini', 'openai']
    };

    const fallbacks = fallbackOrder[failedAgent] || [];

    for (const fallback of fallbacks) {
      // Check if fallback agent has API key
      if (!apiKeys[fallback]) continue;

      try {
        console.log(`[AI Agent] Trying fallback: ${fallback}`);
        await this.waitForRateLimit(fallback);

        switch (fallback) {
          case 'openai':
            return await this.callOpenAI(prompt, apiKeys.openai);
          case 'gemini':
            return await this.callGemini(prompt, apiKeys.gemini);
          case 'anthropic':
            return await this.callAnthropic(prompt, apiKeys.anthropic);
        }
      } catch (fallbackError) {
        console.error(`[AI Agent] Fallback ${fallback} also failed:`, fallbackError);
        continue; // Try next fallback
      }
    }

    // All fallbacks failed, throw original error
    throw originalError;
  }

  /**
   * Call OpenAI API (free tier via ChatGPT API)
   */
  async callOpenAI(prompt, apiKey) {
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  /**
   * Call Google Gemini API (free tier)
   */
  async callGemini(prompt, apiKey) {
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
  }

  /**
   * Call Anthropic Claude API (free tier via API)
   */
  async callAnthropic(prompt, apiKey) {
    if (!apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text.trim();
  }

  /**
   * Get vote from an agent (agent cannot vote for itself)
   */
  async getVote(votingAgent, responses, originalPrompt, context, apiKeys) {
    // Build voting prompt
    const otherAgents = this.agents.filter(a => a !== votingAgent);
    const votePrompt = this.buildVotingPrompt(otherAgents, responses, originalPrompt, context);

    try {
      const voteResponse = await this.callAgent(votingAgent, votePrompt, context, apiKeys);

      // Extract the vote (should be one of the agent names)
      const vote = this.parseVote(voteResponse, otherAgents);
      return vote;
    } catch (error) {
      console.error(`Error getting vote from ${votingAgent}:`, error);
      return 'error';
    }
  }

  /**
   * Build prompt for voting
   */
  buildVotingPrompt(candidateAgents, responses, originalPrompt, context) {
    let prompt = `You are evaluating responses to a job application question. Choose the best response.\n\n`;
    prompt += `Original Question Context:\n${originalPrompt}\n\n`;
    prompt += `Here are the candidate responses:\n\n`;

    candidateAgents.forEach((agent, index) => {
      const response = responses[agent];
      if (response && !response.error) {
        prompt += `Option ${index + 1} (${agent}):\n${response}\n\n`;
      }
    });

    prompt += `Evaluate each response based on:\n`;
    prompt += `- Relevance to the question and job description\n`;
    prompt += `- Natural, human-like language\n`;
    prompt += `- Appropriate use of candidate's experience\n`;
    prompt += `- Conciseness and clarity\n`;
    prompt += `- Professional tone\n\n`;
    prompt += `Respond with ONLY the name of the agent whose response is best: ${candidateAgents.join(', ')}\n`;
    prompt += `Your answer (agent name only):`;

    return prompt;
  }

  /**
   * Parse vote from response
   */
  parseVote(voteResponse, candidateAgents) {
    const response = voteResponse.toLowerCase();
    for (const agent of candidateAgents) {
      if (response.includes(agent.toLowerCase())) {
        return agent;
      }
    }
    // Default to first candidate if can't parse
    return candidateAgents[0];
  }
}

// Make available globally
window.AIAgentSystem = new AIAgentSystem();
