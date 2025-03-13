// Initialize extension state on install
browser.runtime.onInstalled.addListener(() => {
    console.log('Extension installed, initializing storage...');
    browser.storage.local.set({
      enabled: true,
      removedCount: 0
    }).then(() => {
      console.log('Initial storage set successfully');
    }).catch(err => {
      console.error('Error setting initial storage:', err);
    });
  });
  
  // Listen for messages from content script
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background script received message:', message);
    
    if (message.action === 'incrementCounter') {
      // Get current count and increment
      console.log('Processing incrementCounter with count:', message.count);
      
      browser.storage.local.get('removedCount').then((result) => {
        const currentCount = result.removedCount || 0;
        const newCount = currentCount + message.count;
        
        console.log('Current count:', currentCount, 'New count:', newCount);
        
        // Save the new count
        return browser.storage.local.set({ removedCount: newCount });
      }).then(() => {
        // Fetch the updated value to confirm it was saved correctly
        return browser.storage.local.get('removedCount');
      }).then((result) => {
        console.log('Storage updated, new count:', result.removedCount);
        // Send the response back to the content script
        sendResponse({ success: true, newCount: result.removedCount });
      }).catch(error => {
        console.error('Error updating counter:', error);
        sendResponse({ success: false, error: error.message });
      });
      
      // Return true to indicate we'll send a response asynchronously
      return true;
    }
    
    // Return false for unhandled messages
    return false;
  });