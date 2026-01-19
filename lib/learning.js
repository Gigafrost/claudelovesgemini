// Learning system that improves responses based on user feedback

class LearningSystem {
  /**
   * Record user feedback on a response
   */
  static async recordFeedback(fieldId, fieldType, question, response, feedback) {
    const rating = feedback === 'check' ? 'positive' : 'negative';

    await StorageManager.saveResponse(fieldType, question, response, rating);

    // If negative feedback, trigger pattern analysis
    if (rating === 'negative') {
      await this.analyzeNegativePattern(fieldType, question, response);
    }

    return { success: true, rating };
  }

  /**
   * Analyze patterns in negative feedback
   */
  static async analyzeNegativePattern(fieldType, question, response) {
    const learningData = await StorageManager.getLearningData();

    // Find similar negative responses
    const negativeResponses = learningData.responses.filter(
      r => r.fieldType === fieldType &&
           r.rating === 'negative' &&
           this.isSimilarQuestion(r.question, question)
    );

    if (negativeResponses.length >= 3) {
      // Pattern detected - store it
      const pattern = {
        fieldType,
        questionPattern: this.extractPattern(negativeResponses.map(r => r.question)),
        commonIssues: this.identifyCommonIssues(negativeResponses),
        timestamp: new Date().toISOString()
      };

      learningData.patterns.push(pattern);
      await StorageManager.saveLearningData(learningData);
    }
  }

  /**
   * Check if two questions are similar
   */
  static isSimilarQuestion(q1, q2) {
    const keywords1 = this.extractKeywords(q1);
    const keywords2 = this.extractKeywords(q2);

    const commonKeywords = keywords1.filter(k => keywords2.includes(k));
    return commonKeywords.length >= 2;
  }

  /**
   * Extract keywords from question
   */
  static extractKeywords(question) {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'what', 'when', 'where', 'why', 'how', 'do', 'does', 'did', 'you', 'your'];

    return question
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.includes(word));
  }

  /**
   * Extract common pattern from multiple questions
   */
  static extractPattern(questions) {
    const allKeywords = questions.map(q => this.extractKeywords(q));
    const commonKeywords = allKeywords[0].filter(k =>
      allKeywords.every(keywords => keywords.includes(k))
    );

    return commonKeywords.join(' ');
  }

  /**
   * Identify common issues in negative responses
   */
  static identifyCommonIssues(responses) {
    const issues = [];

    // Check for common problems
    const avgLength = responses.reduce((sum, r) => sum + r.response.length, 0) / responses.length;

    if (avgLength < 50) {
      issues.push('Responses too short');
    } else if (avgLength > 500) {
      issues.push('Responses too long');
    }

    // Check for generic phrases
    const genericPhrases = [
      'i am writing to',
      'i would like to',
      'i am interested in',
      'i believe i would be',
      'proven track record',
      'team player',
      'detail-oriented'
    ];

    const hasGeneric = responses.some(r =>
      genericPhrases.some(phrase => r.response.toLowerCase().includes(phrase))
    );

    if (hasGeneric) {
      issues.push('Contains generic phrases');
    }

    return issues;
  }

  /**
   * Get relevant learning data for a field type
   */
  static async getRelevantLearning(fieldType, question) {
    const learningData = await StorageManager.getLearningData();

    // Get positive examples for similar questions
    const relevantResponses = learningData.responses
      .filter(r =>
        r.fieldType === fieldType &&
        r.rating === 'positive' &&
        this.isSimilarQuestion(r.question, question)
      )
      .slice(-5); // Last 5 positive examples

    // Get relevant patterns
    const relevantPatterns = learningData.patterns
      .filter(p => p.fieldType === fieldType);

    return {
      positiveExamples: relevantResponses,
      patterns: relevantPatterns
    };
  }

  /**
   * Suggest improvements based on learning
   */
  static async suggestImprovements(fieldType, question, response) {
    const learningData = await this.getRelevantLearning(fieldType, question);
    const suggestions = [];

    // Check against known patterns
    for (const pattern of learningData.patterns) {
      if (pattern.commonIssues.includes('Responses too short') && response.length < 50) {
        suggestions.push('Consider providing more detail in your response');
      }
      if (pattern.commonIssues.includes('Responses too long') && response.length > 500) {
        suggestions.push('Consider making your response more concise');
      }
      if (pattern.commonIssues.includes('Contains generic phrases')) {
        // Check if current response has generic phrases
        const genericPhrases = ['proven track record', 'team player', 'detail-oriented'];
        if (genericPhrases.some(phrase => response.toLowerCase().includes(phrase))) {
          suggestions.push('Try to use more specific examples instead of generic phrases');
        }
      }
    }

    return suggestions;
  }
}

// Make available globally
window.LearningSystem = LearningSystem;
