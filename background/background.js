// Initialize extension state on install
browser.runtime.onInstalled.addListener(() => {
    browser.storage.local.set({
      enabled: true,
      removedCount: 0
    });
  });
  
  // Listen for messages from content script
  browser.runtime.onMessage.addListener((message, sender) => {
    if (message.action === 'incrementCounter') {
      // Get current count and increment
      return browser.storage.local.get('removedCount').then((result) => {
        const currentCount = result.removedCount || 0;
        const newCount = currentCount + message.count;
        
        // Save the new count
        return browser.storage.local.set({ removedCount: newCount }).then(() => {
          // Return the new count in a Promise
          return { success: true, newCount: newCount };
        });
      });
    }
    
    return Promise.resolve(false);
  });