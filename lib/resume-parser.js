// Resume parser and data extractor

class ResumeParser {
  /**
   * Parse resume text/data into structured format
   */
  static parseResume(resumeText) {
    const resume = {
      raw: resumeText,
      contact: this.extractContact(resumeText),
      summary: this.extractSummary(resumeText),
      experience: this.extractExperience(resumeText),
      education: this.extractEducation(resumeText),
      skills: this.extractSkills(resumeText),
      certifications: this.extractCertifications(resumeText)
    };

    return resume;
  }

  /**
   * Extract contact information
   */
  static extractContact(text) {
    const contact = {};

    // Email
    const emailMatch = text.match(/[\w\.-]+@[\w\.-]+\.\w+/);
    if (emailMatch) contact.email = emailMatch[0];

    // Phone
    const phoneMatch = text.match(/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) contact.phone = phoneMatch[0];

    // LinkedIn
    const linkedInMatch = text.match(/linkedin\.com\/in\/[\w-]+/);
    if (linkedInMatch) contact.linkedin = linkedInMatch[0];

    return contact;
  }

  /**
   * Extract professional summary
   */
  static extractSummary(text) {
    const summaryPatterns = [
      /summary[:\s]+([\s\S]+?)(?=\n\n|\nexperience|education)/i,
      /professional summary[:\s]+([\s\S]+?)(?=\n\n|\nexperience|education)/i,
      /about[:\s]+([\s\S]+?)(?=\n\n|\nexperience|education)/i
    ];

    for (const pattern of summaryPatterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }

    return null;
  }

  /**
   * Extract work experience
   */
  static extractExperience(text) {
    const experience = [];
    const experienceSection = text.match(/experience[:\s]+([\s\S]+?)(?=\neducation|\nskills|\ncertifications|$)/i);

    if (!experienceSection) return experience;

    const section = experienceSection[1];

    // Split by job entries (look for dates)
    const datePattern = /\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|(?:0?[1-9]|1[0-2])\/\d{4}|\d{4})\s*[-–—]\s*(present|current|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|(?:0?[1-9]|1[0-2])\/\d{4}|\d{4})/gi;

    const entries = section.split(/\n(?=[A-Z])/);

    for (const entry of entries) {
      const dateMatch = entry.match(datePattern);
      if (dateMatch) {
        const lines = entry.split('\n').filter(l => l.trim());
        const job = {
          title: lines[0]?.trim() || '',
          company: lines[1]?.trim() || '',
          dates: dateMatch[0],
          description: lines.slice(2).join(' ').trim()
        };
        experience.push(job);
      }
    }

    return experience;
  }

  /**
   * Extract education
   */
  static extractEducation(text) {
    const education = [];
    const educationSection = text.match(/education[:\s]+([\s\S]+?)(?=\nexperience|\nskills|\ncertifications|$)/i);

    if (!educationSection) return education;

    const section = educationSection[1];
    const entries = section.split(/\n(?=[A-Z])/);

    for (const entry of entries) {
      const lines = entry.split('\n').filter(l => l.trim());
      if (lines.length > 0) {
        education.push({
          degree: lines[0]?.trim() || '',
          school: lines[1]?.trim() || '',
          details: lines.slice(2).join(' ').trim()
        });
      }
    }

    return education;
  }

  /**
   * Extract skills
   */
  static extractSkills(text) {
    const skillsSection = text.match(/skills[:\s]+([\s\S]+?)(?=\nexperience|\neducation|\ncertifications|$)/i);

    if (!skillsSection) return [];

    const section = skillsSection[1];

    // Split by commas, semicolons, bullets, or newlines
    const skills = section
      .split(/[,;\n•·]/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length < 50);

    return skills;
  }

  /**
   * Extract certifications
   */
  static extractCertifications(text) {
    const certifications = [];
    const certSection = text.match(/certifications?[:\s]+([\s\S]+?)(?=\nexperience|\neducation|\nskills|$)/i);

    if (!certSection) return certifications;

    const section = certSection[1];
    const entries = section.split('\n').filter(l => l.trim());

    for (const entry of entries) {
      if (entry.trim()) {
        certifications.push(entry.trim());
      }
    }

    return certifications;
  }

  /**
   * Extract relevant experience for a job description
   */
  static findRelevantExperience(resume, jobDescription) {
    const jobKeywords = this.extractKeywords(jobDescription);
    const relevantExperience = [];

    for (const job of resume.experience) {
      const jobText = `${job.title} ${job.description}`.toLowerCase();
      const matchCount = jobKeywords.filter(keyword =>
        jobText.includes(keyword.toLowerCase())
      ).length;

      if (matchCount > 0) {
        relevantExperience.push({
          ...job,
          relevanceScore: matchCount
        });
      }
    }

    return relevantExperience.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Extract keywords from text
   */
  static extractKeywords(text) {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were'];

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.includes(word))
      .filter((word, index, self) => self.indexOf(word) === index);
  }

  /**
   * Parse LinkedIn profile data
   */
  static parseLinkedInProfile(profileData) {
    return {
      name: profileData.name || '',
      headline: profileData.headline || '',
      summary: profileData.summary || '',
      experience: profileData.experience || [],
      education: profileData.education || [],
      skills: profileData.skills || [],
      certifications: profileData.certifications || [],
      languages: profileData.languages || []
    };
  }
}

// Make available globally
window.ResumeParser = ResumeParser;
