// Cover letter generation feature

class CoverLetterGenerator {
  /**
   * Generate a cover letter using the multi-agent system
   */
  static async generate(jobDescription, jobTitle, companyName, userProfile) {
    const prompt = this.buildPrompt(jobDescription, jobTitle, companyName, userProfile);

    try {
      // Use the multi-agent system to generate the cover letter
      const apiKeys = await StorageManager.getAPIKeys();

      // Generate from each agent
      const responses = await window.AIAgentSystem.generateResponses(prompt, {
        jobDescription,
        jobTitle,
        companyName,
        userProfile
      });

      // Vote on best version
      const result = await window.AIAgentSystem.voteOnBestResponse(
        responses,
        prompt,
        { jobDescription, jobTitle, companyName, userProfile }
      );

      return {
        coverLetter: result.selectedResponse,
        allVersions: responses,
        winner: result.winner
      };
    } catch (error) {
      console.error('Error generating cover letter:', error);
      throw error;
    }
  }

  /**
   * Build prompt for cover letter generation
   */
  static buildPrompt(jobDescription, jobTitle, companyName, userProfile) {
    const { resume, linkedIn } = userProfile;

    let prompt = `Generate a professional cover letter for the following job application.\n\n`;
    prompt += `Job Title: ${jobTitle}\n`;
    prompt += `Company: ${companyName}\n\n`;
    prompt += `Job Description:\n${jobDescription}\n\n`;
    prompt += `Candidate Information:\n`;

    if (resume) {
      prompt += `Resume:\n${JSON.stringify(resume, null, 2)}\n\n`;
    }

    if (linkedIn) {
      prompt += `LinkedIn Profile:\n${JSON.stringify(linkedIn, null, 2)}\n\n`;
    }

    prompt += `Requirements for the cover letter:\n`;
    prompt += `1. Length: 250-400 words (3-4 paragraphs)\n`;
    prompt += `2. Opening: Express genuine interest in the role and company\n`;
    prompt += `3. Body: Highlight 2-3 most relevant experiences from the resume that match job requirements\n`;
    prompt += `4. Use specific examples and achievements with quantifiable results when possible\n`;
    prompt += `5. Show knowledge about the company and explain why you want to work there\n`;
    prompt += `6. Closing: Express enthusiasm and include a call to action\n`;
    prompt += `7. Tone: Professional but personable, confident but not arrogant\n`;
    prompt += `8. Avoid: Generic phrases like "I am writing to apply", clichés, repeating the resume verbatim\n`;
    prompt += `9. Format: Standard business letter format with proper greeting and closing\n\n`;
    prompt += `Generate the cover letter:`;

    return prompt;
  }

  /**
   * Format cover letter with proper structure
   */
  static formatCoverLetter(content, userProfile, companyName) {
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const name = userProfile.resume?.contact?.name ||
                 userProfile.linkedIn?.name ||
                 'Your Name';

    const email = userProfile.resume?.contact?.email ||
                  userProfile.linkedIn?.email ||
                  'your.email@example.com';

    const phone = userProfile.resume?.contact?.phone ||
                  userProfile.linkedIn?.phone ||
                  '';

    let formatted = `${name}\n`;
    if (email) formatted += `${email}\n`;
    if (phone) formatted += `${phone}\n`;
    formatted += `\n${today}\n\n`;
    formatted += `Hiring Manager\n`;
    formatted += `${companyName}\n\n`;
    formatted += `Dear Hiring Manager,\n\n`;
    formatted += content;
    formatted += `\n\nSincerely,\n${name}`;

    return formatted;
  }

  /**
   * Check if cover letter is required in the form
   */
  static isCoverLetterRequired(fields) {
    return fields.some(field =>
      field.fieldType === 'coverLetter' ||
      (field.label && field.label.toLowerCase().includes('cover letter'))
    );
  }

  /**
   * Validate cover letter quality
   */
  static validateCoverLetter(coverLetter) {
    const issues = [];
    const wordCount = coverLetter.split(/\s+/).length;

    if (wordCount < 200) {
      issues.push('Cover letter is too short (minimum 200 words)');
    }

    if (wordCount > 500) {
      issues.push('Cover letter is too long (maximum 500 words)');
    }

    // Check for generic phrases
    const genericPhrases = [
      'i am writing to apply',
      'i am writing to express my interest',
      'please find my resume attached',
      'i look forward to hearing from you'
    ];

    const hasGeneric = genericPhrases.some(phrase =>
      coverLetter.toLowerCase().includes(phrase)
    );

    if (hasGeneric) {
      issues.push('Cover letter contains generic phrases that should be avoided');
    }

    return {
      isValid: issues.length === 0,
      issues,
      wordCount
    };
  }
}

// Make available globally
window.CoverLetterGenerator = CoverLetterGenerator;
