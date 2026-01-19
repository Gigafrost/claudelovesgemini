// Background service worker for AI Job Application Assistant

chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Job Application Assistant installed');

  // Initialize default storage
  chrome.storage.local.get(['initialized'], (result) => {
    if (!result.initialized) {
      chrome.storage.local.set({
        initialized: true,
        userResume: null,
        linkedInProfile: null,
        apiKeys: {
          openai: null,
          gemini: null,
          anthropic: null
        },
        learningData: {
          responses: [],
          patterns: []
        },
        preferences: {
          autoFill: false,
          requireConfirmation: true,
          saveApplications: true
        }
      });
    }
  });
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStoredData') {
    chrome.storage.local.get(null, (data) => {
      sendResponse(data);
    });
    return true; // Keep channel open for async response
  }

  if (request.action === 'saveData') {
    chrome.storage.local.set(request.data, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'logApplication') {
    chrome.storage.local.get(['applications'], (result) => {
      const applications = result.applications || [];
      applications.push({
        ...request.data,
        timestamp: new Date().toISOString()
      });
      chrome.storage.local.set({ applications }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
});

// Monitor tab updates to detect job application pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if URL matches known job application platforms
    const jobPlatforms = [
      'workday.com',
      'greenhouse.io',
      'lever.co',
      'myworkdayjobs.com',
      'indeed.com',
      'linkedin.com/jobs',
      'careers',
      'jobs',
      'apply'
    ];

    const isJobPlatform = jobPlatforms.some(platform =>
      tab.url.includes(platform)
    );

    if (isJobPlatform) {
      // Inject notification that extension is ready
      chrome.tabs.sendMessage(tabId, {
        action: 'platformDetected',
        url: tab.url
      }).catch(() => {
        // Ignore errors if content script not ready
      });
    }
  }
});
