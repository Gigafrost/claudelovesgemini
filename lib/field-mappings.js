// Field mapping library for fuzzy field matching

class FieldMapper {
  constructor() {
    // Weighted keyword mappings for different field types
    this.fieldMappings = {
      firstName: {
        keywords: ['first name', 'given name', 'fname', 'forename', 'first', 'firstname'],
        weight: 1.0
      },
      lastName: {
        keywords: ['last name', 'surname', 'lname', 'family name', 'lastname'],
        weight: 1.0
      },
      fullName: {
        keywords: ['full name', 'name', 'your name', 'fullname', 'complete name'],
        weight: 0.9
      },
      email: {
        keywords: ['email', 'e-mail', 'email address', 'mail', 'electronic mail'],
        weight: 1.0
      },
      phone: {
        keywords: ['phone', 'telephone', 'mobile', 'cell', 'contact number', 'phone number'],
        weight: 1.0
      },
      address: {
        keywords: ['address', 'street address', 'home address', 'mailing address'],
        weight: 0.95
      },
      city: {
        keywords: ['city', 'town', 'municipality'],
        weight: 1.0
      },
      state: {
        keywords: ['state', 'province', 'region', 'prefecture'],
        weight: 1.0
      },
      zipCode: {
        keywords: ['zip', 'postal code', 'postcode', 'zip code', 'postal'],
        weight: 1.0
      },
      country: {
        keywords: ['country', 'nation', 'nationality'],
        weight: 1.0
      },
      linkedIn: {
        keywords: ['linkedin', 'linked in', 'linkedin profile', 'linkedin url'],
        weight: 1.0
      },
      github: {
        keywords: ['github', 'git hub', 'github profile', 'github username'],
        weight: 1.0
      },
      website: {
        keywords: ['website', 'personal website', 'portfolio', 'homepage', 'web site'],
        weight: 0.9
      },
      resume: {
        keywords: ['resume', 'cv', 'curriculum vitae', 'upload resume', 'upload cv', 'supporting document', 'upload your background'],
        weight: 1.0
      },
      coverLetter: {
        keywords: ['cover letter', 'covering letter', 'letter of interest', 'motivational letter'],
        weight: 1.0
      },
      whyInterested: {
        keywords: ['why interested', 'why apply', 'why join', 'why work here', 'motivation', 'interest in position'],
        weight: 0.95
      },
      aboutYourself: {
        keywords: ['about yourself', 'tell us about', 'describe yourself', 'personal statement', 'bio', 'biography'],
        weight: 0.9
      },
      experience: {
        keywords: ['experience', 'work experience', 'relevant experience', 'describe your experience', 'background'],
        weight: 0.85
      },
      qualifications: {
        keywords: ['qualification', 'qualifications', 'credentials', 'skills and qualifications'],
        weight: 0.9
      },
      strengths: {
        keywords: ['strength', 'strengths', 'what are your strengths', 'key strengths'],
        weight: 0.95
      },
      weaknesses: {
        keywords: ['weakness', 'weaknesses', 'areas for improvement', 'development areas'],
        weight: 0.95
      },
      challenges: {
        keywords: ['challenge', 'challenges', 'difficult situation', 'obstacle'],
        weight: 0.9
      },
      salary: {
        keywords: ['salary', 'compensation', 'expected salary', 'salary expectation', 'pay', 'wage'],
        weight: 1.0
      },
      availability: {
        keywords: ['availability', 'available', 'start date', 'when can you start', 'notice period'],
        weight: 0.95
      },
      noticePeriod: {
        keywords: ['notice period', 'notice', 'how much notice', 'resignation period'],
        weight: 1.0
      },
      visa: {
        keywords: ['visa', 'sponsorship', 'work authorization', 'right to work', 'work permit', 'immigration status'],
        weight: 1.0
      },
      relocation: {
        keywords: ['relocate', 'relocation', 'willing to move', 'willing to relocate', 'move'],
        weight: 1.0
      },
      reference: {
        keywords: ['reference', 'references', 'referee', 'professional reference'],
        weight: 1.0
      },
      additionalInfo: {
        keywords: ['additional', 'anything else', 'other information', 'comments', 'notes', 'further information'],
        weight: 0.7
      }
    };
  }

  /**
   * Classify a field using fuzzy matching
   */
  classifyField(label, name, id, placeholder) {
    // Combine all text sources
    const text = `${label} ${name} ${id} ${placeholder}`.toLowerCase();

    // Normalize text (remove special characters, extra spaces)
    const normalized = this.normalizeText(text);

    let bestMatch = {
      type: 'other',
      confidence: 0
    };

    // Check each field type
    for (const [fieldType, config] of Object.entries(this.fieldMappings)) {
      const score = this.calculateMatchScore(normalized, config.keywords, config.weight);

      if (score > bestMatch.confidence) {
        bestMatch = {
          type: fieldType,
          confidence: score
        };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate match score for a field
   */
  calculateMatchScore(text, keywords, weight) {
    let maxScore = 0;

    for (const keyword of keywords) {
      const normalizedKeyword = this.normalizeText(keyword);

      // Exact match
      if (text === normalizedKeyword) {
        maxScore = Math.max(maxScore, 1.0 * weight);
      }
      // Contains exact keyword
      else if (text.includes(normalizedKeyword)) {
        maxScore = Math.max(maxScore, 0.95 * weight);
      }
      // Partial match using Levenshtein distance
      else {
        const distance = this.levenshteinDistance(text, normalizedKeyword);
        const similarity = 1 - (distance / Math.max(text.length, normalizedKeyword.length));

        if (similarity > 0.8) {
          maxScore = Math.max(maxScore, similarity * 0.9 * weight);
        }
      }
    }

    return maxScore;
  }

  /**
   * Normalize text for comparison
   */
  normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')  // Remove special chars
      .replace(/\s+/g, ' ')           // Collapse spaces
      .trim();
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    // Initialize matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * AI-assisted classification for unknown fields
   */
  async classifyWithAI(label, placeholder, fieldType) {
    try {
      const apiKeys = await StorageManager.getAPIKeys();

      // Use Gemini for classification (fastest and has free tier)
      if (!apiKeys.gemini) {
        return { type: 'other', confidence: 0 };
      }

      const prompt = `Classify this HTML form field into ONE of these categories:
firstName, lastName, fullName, email, phone, address, city, state, zipCode, country,
linkedIn, github, website, resume, coverLetter, whyInterested, aboutYourself,
experience, qualifications, strengths, weaknesses, challenges, salary, availability,
noticePeriod, visa, relocation, reference, additionalInfo, other

Field Label: "${label}"
Placeholder: "${placeholder}"
Input Type: ${fieldType}

Respond with ONLY the category name, nothing else.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKeys.gemini}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 20 }
        })
      });

      const data = await response.json();
      const classification = data.candidates[0].content.parts[0].text.trim().toLowerCase();

      // Verify it's a valid category
      if (this.fieldMappings[classification] || classification === 'other') {
        return { type: classification, confidence: 0.85 };
      }

      return { type: 'other', confidence: 0.5 };
    } catch (error) {
      console.error('[Field Mapper] AI classification error:', error);
      return { type: 'other', confidence: 0 };
    }
  }

  /**
   * Get confidence threshold for requiring review
   */
  shouldRequireReview(confidence, isLongForm) {
    // Long-form fields always require review
    if (isLongForm) return true;

    // Low confidence fields require review
    if (confidence < 0.9) return true;

    return false;
  }
}

// Make available globally
window.FieldMapper = new FieldMapper();
