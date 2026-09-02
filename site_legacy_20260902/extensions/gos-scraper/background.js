// GOS Scraper - Background Service Worker

// Handle extension install/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('GOS Scraper: Installed');
    
    // Initialize storage
    chrome.storage.local.set({
      places: [],
      reviews: [],
      settings: {
        autoScrape: false,
        scrapeDelay: 2000
      }
    });
  }
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getData') {
    chrome.storage.local.get(['places', 'reviews'], (data) => {
      sendResponse(data);
    });
    return true;
  }
  
  if (request.action === 'clearData') {
    chrome.storage.local.set({ places: [], reviews: [] }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'syncToGOS') {
    // This would sync data to GOS PWA via shared storage
    chrome.storage.local.get(['places', 'reviews'], (data) => {
      // For now, just log
      console.log('GOS Scraper: Syncing data to GOS', data);
      sendResponse({ success: true, count: (data.places || []).length });
    });
    return true;
  }
});

// Badge update when on supported pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.url) return;
  
  let badge = '';
  let badgeColor = '#888';
  
  if (tab.url.includes('yelp.com/biz/')) {
    badge = '✓';
    badgeColor = '#4caf50';
  } else if (tab.url.includes('google.com/maps')) {
    badge = '✓';
    badgeColor = '#4caf50';
  }
  
  chrome.action.setBadgeText({ text: badge, tabId });
  chrome.action.setBadgeBackgroundColor({ color: badgeColor, tabId });
});