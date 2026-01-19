// Storage management utilities

class StorageManager {
  static async getData(keys = null) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  }

  static async setData(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, resolve);
    });
  }

  static async getUserProfile() {
    const data = await this.getData(['userResume', 'linkedInProfile']);
    return {
      resume: data.userResume,
      linkedIn: data.linkedInProfile
    };
  }

  static async getAPIKeys() {
    const data = await this.getData(['apiKeys']);
    return data.apiKeys || {};
  }

  static async getLearningData() {
    const data = await this.getData(['learningData']);
    return data.learningData || { responses: [], patterns: [] };
  }

  static async saveLearningData(learningData) {
    await this.setData({ learningData });
  }

  static async saveResponse(fieldType, question, response, rating) {
    const learningData = await this.getLearningData();
    learningData.responses.push({
      fieldType,
      question,
      response,
      rating,
      timestamp: new Date().toISOString()
    });

    // Keep only last 1000 responses to prevent storage bloat
    if (learningData.responses.length > 1000) {
      learningData.responses = learningData.responses.slice(-1000);
    }

    await this.saveLearningData(learningData);
  }

  static async getApplicationHistory() {
    const data = await this.getData(['applications']);
    return data.applications || [];
  }

  static async logApplication(jobData) {
    const history = await this.getApplicationHistory();
    history.push({
      ...jobData,
      timestamp: new Date().toISOString()
    });

    await this.setData({ applications: history });
  }
}

// Make available globally
window.StorageManager = StorageManager;
