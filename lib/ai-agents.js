// Multi-agent AI system with voting mechanism

class AIAgentSystem {
  constructor() {
    this.agents = ['openai', 'gemini', 'anthropic'];
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
    // Find similar past responses
    const similarResponses = learningData.responses
      .filter(r => r.fieldType === fieldType && r.rating === 'positive')
      .slice(-5); // Last 5 positive examples

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
    prompt += `Job Description:\n${context.jobDescription}\n\n`;
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
   * Call a specific AI agent
   */
  async callAgent(agent, prompt, context, apiKeys) {
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
