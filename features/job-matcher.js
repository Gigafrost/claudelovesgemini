// Job match analysis feature

class JobMatcher {
  /**
   * Analyze how well the user's profile matches a job
   */
  static async analyzeMatch(jobDescription, jobTitle, userProfile) {
    const analysis = {
      overallScore: 0,
      scores: {
        skills: 0,
        experience: 0,
        education: 0,
        keywords: 0
      },
      matches: {
        skills: [],
        experience: [],
        education: []
      },
      missing: {
        skills: [],
        requirements: []
      },
      recommendation: '',
      shouldApply: false
    };

    // Extract job requirements
    const jobRequirements = this.extractRequirements(jobDescription);

    // Analyze skills match
    analysis.scores.skills = this.analyzeSkills(
      userProfile.resume?.skills || [],
      jobRequirements.skills,
      analysis.matches.skills,
      analysis.missing.skills
    );

    // Analyze experience match
    analysis.scores.experience = this.analyzeExperience(
      userProfile.resume?.experience || [],
      jobDescription,
      jobRequirements,
      analysis.matches.experience
    );

    // Analyze education match
    analysis.scores.education = this.analyzeEducation(
      userProfile.resume?.education || [],
      jobRequirements.education,
      analysis.matches.education
    );

    // Analyze keyword match
    analysis.scores.keywords = this.analyzeKeywords(
      userProfile,
      jobDescription
    );

    // Calculate overall score (weighted average)
    analysis.overallScore = Math.round(
      (analysis.scores.skills * 0.35) +
      (analysis.scores.experience * 0.35) +
      (analysis.scores.education * 0.15) +
      (analysis.scores.keywords * 0.15)
    );

    // Generate recommendation
    analysis.recommendation = this.generateRecommendation(analysis.overallScore, analysis);
    analysis.shouldApply = analysis.overallScore >= 60;

    return analysis;
  }

  /**
   * Extract requirements from job description
   */
  static extractRequirements(jobDescription) {
    const requirements = {
      skills: [],
      experience: {
        years: 0,
        domains: []
      },
      education: {
        level: '',
        field: ''
      },
      required: [],
      preferred: []
    };

    const text = jobDescription.toLowerCase();

    // Extract years of experience
    const yearsMatch = text.match(/(\d+)\+?\s*years?\s*of\s*experience/i);
    if (yearsMatch) {
      requirements.experience.years = parseInt(yearsMatch[1]);
    }

    // Common technical skills
    const commonSkills = [
      'javascript', 'python', 'java', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin',
      'react', 'angular', 'vue', 'node', 'express', 'django', 'flask', 'spring',
      'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'redis',
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins',
      'git', 'agile', 'scrum', 'rest', 'api', 'microservices',
      'html', 'css', 'typescript', 'graphql', 'redux'
    ];

    for (const skill of commonSkills) {
      if (text.includes(skill.toLowerCase())) {
        requirements.skills.push(skill);
      }
    }

    // Education requirements
    if (text.includes("bachelor") || text.includes("bs") || text.includes("ba")) {
      requirements.education.level = "Bachelor's";
    }
    if (text.includes("master") || text.includes("ms") || text.includes("ma")) {
      requirements.education.level = "Master's";
    }
    if (text.includes("phd") || text.includes("doctorate")) {
      requirements.education.level = "PhD";
    }

    return requirements;
  }

  /**
   * Analyze skills match
   */
  static analyzeSkills(userSkills, requiredSkills, matches, missing) {
    if (requiredSkills.length === 0) return 80; // No specific requirements

    const userSkillsLower = userSkills.map(s => s.toLowerCase());
    let matchCount = 0;

    for (const requiredSkill of requiredSkills) {
      const found = userSkillsLower.some(userSkill =>
        userSkill.includes(requiredSkill.toLowerCase()) ||
        requiredSkill.toLowerCase().includes(userSkill)
      );

      if (found) {
        matchCount++;
        matches.push(requiredSkill);
      } else {
        missing.push(requiredSkill);
      }
    }

    return Math.round((matchCount / requiredSkills.length) * 100);
  }

  /**
   * Analyze experience match
   */
  static analyzeExperience(userExperience, jobDescription, requirements, matches) {
    if (userExperience.length === 0) return 0;

    let score = 0;

    // Calculate total years of experience
    const totalYears = this.calculateTotalYears(userExperience);

    if (requirements.experience.years > 0) {
      if (totalYears >= requirements.experience.years) {
        score += 50;
        matches.push(`${totalYears} years of experience (required: ${requirements.experience.years})`);
      } else {
        score += Math.round((totalYears / requirements.experience.years) * 50);
      }
    } else {
      score += 50; // No specific requirement
    }

    // Check for relevant experience keywords
    const jobKeywords = this.extractKeywords(jobDescription);
    let relevantExperienceCount = 0;

    for (const exp of userExperience) {
      const expText = `${exp.title} ${exp.description}`.toLowerCase();
      const matchingKeywords = jobKeywords.filter(keyword =>
        expText.includes(keyword.toLowerCase())
      );

      if (matchingKeywords.length > 0) {
        relevantExperienceCount++;
        matches.push(`${exp.title} at ${exp.company}`);
      }
    }

    if (userExperience.length > 0) {
      score += Math.round((relevantExperienceCount / userExperience.length) * 50);
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate total years of experience
   */
  static calculateTotalYears(experience) {
    let totalMonths = 0;

    for (const exp of experience) {
      if (exp.dates) {
        const dates = exp.dates.toLowerCase();
        const match = dates.match(/(\w+\s+\d{4})\s*[-–—]\s*(\w+\s+\d{4}|present|current)/i);

        if (match) {
          const startDate = new Date(match[1]);
          const endDate = match[2].includes('present') || match[2].includes('current')
            ? new Date()
            : new Date(match[2]);

          if (!isNaN(startDate) && !isNaN(endDate)) {
            const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                          (endDate.getMonth() - startDate.getMonth());
            totalMonths += months;
          }
        }
      }
    }

    return Math.round(totalMonths / 12);
  }

  /**
   * Analyze education match
   */
  static analyzeEducation(userEducation, requiredEducation, matches) {
    if (!requiredEducation.level) return 80; // No specific requirement

    const educationLevels = {
      "High School": 1,
      "Associate": 2,
      "Bachelor's": 3,
      "Master's": 4,
      "PhD": 5
    };

    const requiredLevel = educationLevels[requiredEducation.level] || 0;

    for (const edu of userEducation) {
      const degree = edu.degree || '';
      let userLevel = 0;

      if (degree.toLowerCase().includes('high school')) userLevel = 1;
      else if (degree.toLowerCase().includes('associate')) userLevel = 2;
      else if (degree.toLowerCase().includes('bachelor')) userLevel = 3;
      else if (degree.toLowerCase().includes('master')) userLevel = 4;
      else if (degree.toLowerCase().includes('phd') || degree.toLowerCase().includes('doctorate')) userLevel = 5;

      if (userLevel >= requiredLevel) {
        matches.push(degree);
        return 100;
      }
    }

    return 50; // Has some education but doesn't meet requirement
  }

  /**
   * Analyze keyword match
   */
  static analyzeKeywords(userProfile, jobDescription) {
    const jobKeywords = this.extractKeywords(jobDescription);
    const resumeText = JSON.stringify(userProfile.resume).toLowerCase();
    const linkedInText = JSON.stringify(userProfile.linkedIn).toLowerCase();

    const matchCount = jobKeywords.filter(keyword =>
      resumeText.includes(keyword.toLowerCase()) ||
      linkedInText.includes(keyword.toLowerCase())
    ).length;

    return Math.round((matchCount / jobKeywords.length) * 100);
  }

  /**
   * Extract keywords from text
   */
  static extractKeywords(text) {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'will', 'be'];

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 4 && !stopWords.includes(word))
      .filter((word, index, self) => self.indexOf(word) === index)
      .slice(0, 50); // Top 50 keywords
  }

  /**
   * Generate recommendation
   */
  static generateRecommendation(score, analysis) {
    if (score >= 80) {
      return "Excellent match! You meet most of the requirements. Strongly recommend applying.";
    } else if (score >= 70) {
      return "Very good match. You meet many of the requirements. Recommend applying.";
    } else if (score >= 60) {
      return "Good match. You meet some key requirements. Worth applying.";
    } else if (score >= 50) {
      return "Fair match. Consider applying if you're willing to learn missing skills.";
    } else if (score >= 40) {
      return "Below average match. You may want to gain more relevant experience first.";
    } else {
      return "Poor match. This role may not be suitable at this time.";
    }
  }
}

// Make available globally
window.JobMatcher = JobMatcher;
