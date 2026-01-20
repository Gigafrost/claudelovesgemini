// Form filling logic with AI-generated responses

class FormFiller {
  constructor(formDetector) {
    this.detector = formDetector;
    this.filledFields = new Map();
    this.pendingFields = [];
    this.profileWarningShown = false; // Prevent notification spam
  }

  /**
   * Auto-fill form fields
   */
  async autoFill(userProfile, requireConfirmation = true) {
    // Check profile existence once to avoid spamming
    if (!userProfile || Object.keys(userProfile).length === 0) {
      if (!this.profileWarningShown) {
        if (window.UI && window.UI.showNotification) {
          window.UI.showNotification('Please set up your profile in settings', 'warning');
        } else {
          console.warn('[Job Assistant] Please set up your profile in settings');
        }
        this.profileWarningShown = true;
      }
      return { filled: 0, total: 0 };
    }

    const fields = this.detector.getFillableFields();
    const jobInfo = this.detector.getJobInfo();

    console.log(`[Job Assistant] Filling ${fields.length} fields`);

    // Separate simple fields from complex fields
    const simpleFields = this.getSimpleFields(fields);
    const complexFields = this.getComplexFields(fields);

    // Fill simple fields directly from profile
    for (const field of simpleFields) {
      await this.fillSimpleField(field, userProfile);
    }

    // Generate AI responses for complex fields
    for (const field of complexFields) {
      await this.fillComplexField(field, userProfile, jobInfo, requireConfirmation);
    }

    return {
      filled: this.filledFields.size,
      total: fields.length
    };
  }

  /**
   * Get simple fields (direct mapping from profile)
   */
  getSimpleFields(fields) {
    const simpleTypes = [
      'firstName', 'lastName', 'fullName', 'email', 'phone',
      'address', 'city', 'state', 'zipCode', 'country',
      'linkedIn', 'website', 'github'
    ];

    return fields.filter(field => simpleTypes.includes(field.fieldType));
  }

  /**
   * Get complex fields (require AI generation)
   */
  getComplexFields(fields) {
    const complexTypes = [
      'whyInterested', 'experience', 'coverLetter',
      'aboutYourself', 'qualifications', 'strengths',
      'weaknesses', 'challenges', 'other'
    ];

    return fields.filter(field => complexTypes.includes(field.fieldType));
  }

  /**
   * Fill a simple field directly from user profile
   */
  async fillSimpleField(field, userProfile) {
    const value = this.getSimpleFieldValue(field, userProfile);

    if (value) {
      this.fillField(field, value);
      this.filledFields.set(field.id || field.name, {
        field,
        value,
        type: 'simple'
      });
    }
  }

  /**
   * Get value for simple field from profile
   */
  getSimpleFieldValue(field, userProfile) {
    const { resume, linkedIn } = userProfile;

    switch (field.fieldType) {
      case 'firstName':
        return resume?.contact?.name?.split(' ')[0] ||
               linkedIn?.name?.split(' ')[0] ||
               '';

      case 'lastName':
        const fullName = resume?.contact?.name || linkedIn?.name || '';
        const parts = fullName.split(' ');
        return parts.length > 1 ? parts[parts.length - 1] : '';

      case 'fullName':
        return resume?.contact?.name || linkedIn?.name || '';

      case 'email':
        return resume?.contact?.email || linkedIn?.email || '';

      case 'phone':
        return resume?.contact?.phone || linkedIn?.phone || '';

      case 'linkedIn':
        return resume?.contact?.linkedin || linkedIn?.profileUrl || '';

      case 'website':
        return resume?.contact?.website || linkedIn?.website || '';

      case 'github':
        return resume?.contact?.github || '';

      default:
        return '';
    }
  }

  /**
   * Fill a complex field with AI-generated content
   */
  async fillComplexField(field, userProfile, jobInfo, requireConfirmation) {
    try {
      // Check learning data for similar past responses
      const learningData = await window.LearningSystem.getRelevantLearning(
        field.fieldType,
        field.label
      );

      // Generate response using multi-agent system
      const result = await window.AIAgentSystem.getBestResponse(
        field.fieldType,
        field.label,
        userProfile,
        jobInfo.description,
        learningData
      );

      const value = result.selectedResponse;

      if (requireConfirmation) {
        // Mark as pending for user confirmation
        this.pendingFields.push({
          field,
          value,
          allResponses: result.allResponses,
          winner: result.winner
        });

        // Dispatch event for UI to show confirmation
        window.dispatchEvent(new CustomEvent('jobAssistant:fieldReady', {
          detail: {
            field,
            value,
            allResponses: result.allResponses,
            winner: result.winner
          }
        }));
      } else {
        // Fill directly
        this.fillField(field, value);
        this.filledFields.set(field.id || field.name, {
          field,
          value,
          type: 'ai',
          winner: result.winner
        });
      }
    } catch (error) {
      console.error(`[Job Assistant] Error filling field ${field.label}:`, error);

      // Dispatch error event
      window.dispatchEvent(new CustomEvent('jobAssistant:fieldError', {
        detail: {
          field,
          error: error.message
        }
      }));
    }
  }

  /**
   * Fill a single field
   */
  fillField(field, value) {
    if (!this.detector.platform) return;

    this.detector.platform.fillField(field, value);

    // Add visual indicator
    if (field.element) {
      field.element.style.borderColor = '#4CAF50';
      field.element.style.borderWidth = '2px';

      setTimeout(() => {
        field.element.style.borderColor = '';
        field.element.style.borderWidth = '';
      }, 2000);
    }
  }

  /**
   * Confirm and fill a pending field
   */
  confirmField(fieldId) {
    const pendingIndex = this.pendingFields.findIndex(p =>
      (p.field.id || p.field.name) === fieldId
    );

    if (pendingIndex >= 0) {
      const pending = this.pendingFields[pendingIndex];
      this.fillField(pending.field, pending.value);

      this.filledFields.set(fieldId, {
        field: pending.field,
        value: pending.value,
        type: 'ai',
        winner: pending.winner
      });

      // Record positive feedback
      window.LearningSystem.recordFeedback(
        fieldId,
        pending.field.fieldType,
        pending.field.label,
        pending.value,
        'check'
      );

      this.pendingFields.splice(pendingIndex, 1);
    }
  }

  /**
   * Regenerate a pending field
   */
  async regenerateField(fieldId, userProfile, jobInfo) {
    const pendingIndex = this.pendingFields.findIndex(p =>
      (p.field.id || p.field.name) === fieldId
    );

    if (pendingIndex >= 0) {
      const pending = this.pendingFields[pendingIndex];

      // Record negative feedback
      await window.LearningSystem.recordFeedback(
        fieldId,
        pending.field.fieldType,
        pending.field.label,
        pending.value,
        'regenerate'
      );

      // Generate new response
      await this.fillComplexField(pending.field, userProfile, jobInfo, true);

      // Remove old pending
      this.pendingFields.splice(pendingIndex, 1);
    }
  }

  /**
   * Get filling statistics
   */
  getStats() {
    return {
      total: this.detector.fields.length,
      filled: this.filledFields.size,
      pending: this.pendingFields.length,
      remaining: this.detector.fields.length - this.filledFields.size - this.pendingFields.length
    };
  }

  /**
   * Export filled data for logging
   */
  exportFilledData() {
    const data = {
      jobInfo: this.detector.jobInfo,
      platform: this.detector.platform?.getName(),
      fields: []
    };

    this.filledFields.forEach((fieldData, fieldId) => {
      data.fields.push({
        id: fieldId,
        label: fieldData.field.label,
        type: fieldData.field.fieldType,
        value: fieldData.value,
        generatedBy: fieldData.winner || 'manual'
      });
    });

    return data;
  }

  /**
   * Clear all filled fields
   */
  clearAll() {
    this.filledFields.forEach((fieldData) => {
      if (fieldData.field.element) {
        fieldData.field.element.value = '';
      }
    });

    this.filledFields.clear();
    this.pendingFields = [];
  }
}

// Make available globally
window.FormFiller = FormFiller;
