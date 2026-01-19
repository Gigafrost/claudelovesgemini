// ATS-compliant resume tailoring feature

class ResumeTailor {
  /**
   * Generate a tailored resume for a specific job
   */
  static async generateTailoredResume(jobDescription, jobTitle, userProfile) {
    const { resume } = userProfile;

    if (!resume) {
      throw new Error('No resume data available');
    }

    // Extract job requirements
    const jobKeywords = this.extractJobKeywords(jobDescription);
    const jobSkills = this.extractSkills(jobDescription);

    // Build tailored resume
    const tailoredResume = {
      contact: resume.contact,
      summary: await this.generateTailoredSummary(resume, jobDescription, jobTitle),
      experience: this.rankAndTailorExperience(resume.experience, jobKeywords, jobSkills),
      education: resume.education,
      skills: this.prioritizeSkills(resume.skills, jobSkills),
      certifications: resume.certifications
    };

    // Format as ATS-compliant text
    const formattedResume = this.formatATSCompliant(tailoredResume, jobTitle);

    return {
      tailored: tailoredResume,
      formatted: formattedResume,
      atsScore: this.calculateATSScore(formattedResume, jobKeywords)
    };
  }

  /**
   * Extract keywords from job description
   */
  static extractJobKeywords(jobDescription) {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'will', 'be', 'this', 'that', 'these', 'those'];

    const keywords = jobDescription
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.includes(word));

    // Count frequency
    const frequency = {};
    keywords.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // Return sorted by frequency
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word)
      .slice(0, 30);
  }

  /**
   * Extract skills from job description
   */
  static extractSkills(jobDescription) {
    const commonSkills = [
      // Programming languages
      'javascript', 'python', 'java', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin', 'go', 'rust', 'typescript',
      // Frameworks
      'react', 'angular', 'vue', 'node', 'express', 'django', 'flask', 'spring', 'rails',
      // Databases
      'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'redis', 'cassandra', 'elasticsearch',
      // Cloud
      'aws', 'azure', 'gcp', 'cloud', 'serverless', 'lambda',
      // DevOps
      'docker', 'kubernetes', 'jenkins', 'ci/cd', 'terraform', 'ansible',
      // Tools
      'git', 'github', 'gitlab', 'jira', 'confluence',
      // Methodologies
      'agile', 'scrum', 'kanban', 'tdd', 'bdd',
      // Other
      'rest', 'api', 'microservices', 'graphql', 'websocket',
      'machine learning', 'ai', 'data science', 'analytics',
      'html', 'css', 'sass', 'webpack', 'redux'
    ];

    const text = jobDescription.toLowerCase();
    return commonSkills.filter(skill => text.includes(skill));
  }

  /**
   * Generate tailored professional summary
   */
  static async generateTailoredSummary(resume, jobDescription, jobTitle) {
    const prompt = `Generate a professional summary (2-3 sentences) for a resume tailored to the following job:

Job Title: ${jobTitle}
Job Description: ${jobDescription.substring(0, 500)}...

Current Summary: ${resume.summary || 'None'}
Experience: ${JSON.stringify(resume.experience?.slice(0, 2))}

Requirements:
1. Highlight most relevant experience and skills for this specific job
2. Include years of experience if applicable
3. Use power words and action verbs
4. Be concise (50-75 words)
5. Focus on value proposition for THIS role
6. Include 2-3 key skills mentioned in job description

Generate the tailored summary:`;

    try {
      const apiKeys = await StorageManager.getAPIKeys();
      const response = await window.AIAgentSystem.callAgent('gemini', prompt, {}, apiKeys);
      return response;
    } catch (error) {
      console.error('Error generating summary:', error);
      return resume.summary || 'Experienced professional with a proven track record of success.';
    }
  }

  /**
   * Rank and tailor experience based on relevance
   */
  static rankAndTailorExperience(experience, jobKeywords, jobSkills) {
    if (!experience || experience.length === 0) return [];

    // Score each experience
    const scoredExperience = experience.map(exp => {
      const expText = `${exp.title} ${exp.description}`.toLowerCase();

      // Count matching keywords
      const keywordMatches = jobKeywords.filter(keyword =>
        expText.includes(keyword)
      ).length;

      // Count matching skills
      const skillMatches = jobSkills.filter(skill =>
        expText.includes(skill.toLowerCase())
      ).length;

      const relevanceScore = (keywordMatches * 2) + (skillMatches * 3);

      return {
        ...exp,
        relevanceScore
      };
    });

    // Sort by relevance (keep most recent if tied)
    scoredExperience.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      // Keep chronological order for same score
      return 0;
    });

    // Enhance descriptions with keywords
    return scoredExperience.map(exp => ({
      ...exp,
      description: this.enhanceDescription(exp.description, jobKeywords, jobSkills)
    }));
  }

  /**
   * Enhance job description with relevant keywords
   */
  static enhanceDescription(description, jobKeywords, jobSkills) {
    // This is a simple version - in production, you'd want AI to rewrite
    // For now, just ensure it's properly formatted
    return description;
  }

  /**
   * Prioritize skills based on job requirements
   */
  static prioritizeSkills(userSkills, jobSkills) {
    if (!userSkills || userSkills.length === 0) return [];

    const userSkillsLower = userSkills.map(s => s.toLowerCase());
    const prioritized = [];
    const other = [];

    // Separate matching and non-matching skills
    userSkills.forEach(skill => {
      const isMatch = jobSkills.some(jobSkill =>
        skill.toLowerCase().includes(jobSkill) ||
        jobSkill.includes(skill.toLowerCase())
      );

      if (isMatch) {
        prioritized.push(skill);
      } else {
        other.push(skill);
      }
    });

    // Return matching skills first, then others
    return [...prioritized, ...other];
  }

  /**
   * Format resume as ATS-compliant text
   */
  static formatATSCompliant(resume, jobTitle) {
    let formatted = '';

    // Contact Information
    if (resume.contact) {
      if (resume.contact.name) formatted += `${resume.contact.name}\n`;
      if (resume.contact.email) formatted += `${resume.contact.email}\n`;
      if (resume.contact.phone) formatted += `${resume.contact.phone}\n`;
      if (resume.contact.linkedin) formatted += `${resume.contact.linkedin}\n`;
      formatted += '\n';
    }

    // Professional Summary
    if (resume.summary) {
      formatted += 'PROFESSIONAL SUMMARY\n';
      formatted += `${resume.summary}\n\n`;
    }

    // Skills
    if (resume.skills && resume.skills.length > 0) {
      formatted += 'SKILLS\n';
      formatted += `${resume.skills.join(' • ')}\n\n`;
    }

    // Professional Experience
    if (resume.experience && resume.experience.length > 0) {
      formatted += 'PROFESSIONAL EXPERIENCE\n\n';
      resume.experience.forEach(exp => {
        formatted += `${exp.title}\n`;
        formatted += `${exp.company}`;
        if (exp.dates) formatted += ` | ${exp.dates}`;
        formatted += '\n';
        if (exp.description) {
          // Format as bullet points
          const bullets = exp.description.split(/[•\-\n]/).filter(b => b.trim());
          bullets.forEach(bullet => {
            if (bullet.trim()) {
              formatted += `• ${bullet.trim()}\n`;
            }
          });
        }
        formatted += '\n';
      });
    }

    // Education
    if (resume.education && resume.education.length > 0) {
      formatted += 'EDUCATION\n\n';
      resume.education.forEach(edu => {
        formatted += `${edu.degree}\n`;
        formatted += `${edu.school}\n`;
        if (edu.details) formatted += `${edu.details}\n`;
        formatted += '\n';
      });
    }

    // Certifications
    if (resume.certifications && resume.certifications.length > 0) {
      formatted += 'CERTIFICATIONS\n';
      resume.certifications.forEach(cert => {
        formatted += `• ${cert}\n`;
      });
      formatted += '\n';
    }

    return formatted;
  }

  /**
   * Calculate ATS compliance score
   */
  static calculateATSScore(resumeText, jobKeywords) {
    const text = resumeText.toLowerCase();
    let score = 0;

    // Check for standard sections (40 points)
    const sections = ['professional summary', 'skills', 'professional experience', 'education'];
    sections.forEach(section => {
      if (text.includes(section.toLowerCase())) score += 10;
    });

    // Check for keyword density (40 points)
    const matchingKeywords = jobKeywords.filter(keyword =>
      text.includes(keyword.toLowerCase())
    ).length;
    const keywordScore = Math.min((matchingKeywords / jobKeywords.length) * 40, 40);
    score += keywordScore;

    // Check formatting (20 points)
    // No special characters or complex formatting
    if (!/[{}[\]<>]/.test(resumeText)) score += 10;
    // Has bullet points
    if (resumeText.includes('•')) score += 10;

    return Math.round(score);
  }

  /**
   * Get ATS optimization tips
   */
  static getATSTips(atsScore) {
    const tips = [];

    if (atsScore < 60) {
      tips.push('Include more keywords from the job description');
      tips.push('Add clear section headings (SKILLS, EXPERIENCE, etc.)');
      tips.push('Use standard fonts and avoid complex formatting');
    }

    if (atsScore < 80) {
      tips.push('Ensure your skills section includes relevant technical skills');
      tips.push('Use bullet points for experience descriptions');
      tips.push('Include quantifiable achievements');
    }

    return tips;
  }
}

// Make available globally
window.ResumeTailor = ResumeTailor;
