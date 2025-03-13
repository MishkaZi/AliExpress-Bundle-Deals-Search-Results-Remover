/**
 * AliExpress Bundle Deals Remover
 * 
 * This script removes bundle deal items from AliExpress search results
 * and keeps track of how many have been removed.
 */

(function () {
    'use strict';

    // State variables
    let isEnabled = true;
    let removedThisSession = 0;
    let observer = null;
    let scrollIntervalId = null;
    let checkIntervalId = null;
    let processedCards = new Set(); // Track cards we've already processed

    // Load initial state
    browser.storage.local.get('enabled').then((result) => {
        isEnabled = result.enabled !== undefined ? result.enabled : true;
        if (isEnabled) {
            startObserving();
        }
    });

    // Listen for messages from popup
    browser.runtime.onMessage.addListener((message) => {
        if (message.action === 'toggleState') {
            isEnabled = message.enabled;

            if (isEnabled) {
                startObserving();
            } else {
                stopObserving();
            }
        } else if (message.action === 'resetCounter') {
            removedThisSession = 0;
        }
    });

    // Function to remove bundle deal cards
    function removeBundleDeals() {
        if (!isEnabled) return;

        let removedCount = 0;

        // Query selectors for bundle cards - we'll try multiple approaches

        // 1. Find all product cards first
        const productCards = document.querySelectorAll('.hz_bu, .search-item-card-wrapper-gallery');

        productCards.forEach(card => {
            // Skip cards we've already processed
            if (processedCards.has(card)) return;

            // Mark this card as processed
            processedCards.add(card);

            // Look for "Bundle deals" text inside the card
            const bundleTextElement = card.querySelector('.lq_kf .lq_ae');

            if (bundleTextElement &&
                bundleTextElement.textContent.trim().toLowerCase() === 'bundle deals' &&
                card.style.display !== 'none') {

                // Hide the entire card
                card.style.display = 'none';
                console.log('Removed bundle deal card:', card);
                removedCount++;
            }
        });

        // 2. Alternative approach - find bundle text directly then find parent cards
        const bundleTexts = document.querySelectorAll('.lq_kf .lq_ae');

        bundleTexts.forEach(element => {
            if (element.textContent.trim().toLowerCase() === 'bundle deals') {
                // Find the parent card through various parent elements
                const parentCard = findParentCard(element);

                if (parentCard && !processedCards.has(parentCard) && parentCard.style.display !== 'none') {
                    // Hide the entire card
                    parentCard.style.display = 'none';
                    processedCards.add(parentCard);
                    console.log('Removed bundle deal via text match:', parentCard);
                    removedCount++;
                }
            }
        });

        // Update counters if we removed any bundles
        if (removedCount > 0) {
            removedThisSession += removedCount;

            // Notify background script to update the counter
            browser.runtime.sendMessage({
                action: 'incrementCounter',
                count: removedCount
            }).then(response => {
                // Log success
                if (response && response.success) {
                    console.log(`Bundle counter updated, total: ${response.newCount}`);
                }
            }).catch(error => {
                console.error('Failed to update bundle counter:', error);
            });
        }
    }

    // Helper function to find the parent card element
    function findParentCard(element) {
        // Try various selectors to find the parent card
        // First, search for the immediate card wrapper
        let parent = element.closest('.search-item-card-wrapper-gallery');
        if (parent) return parent;

        // If not found, try the div with class hz_bu 
        parent = element.closest('.hz_bu');
        if (parent) return parent;

        // If all else fails, walk up manually through 8 parent levels
        let currentElement = element;
        for (let i = 0; i < 8; i++) {
            if (!currentElement.parentElement) break;
            currentElement = currentElement.parentElement;

            // Check if this is a likely card container
            if (currentElement.classList.contains('hz_bu') ||
                currentElement.classList.contains('search-item-card-wrapper-gallery')) {
                return currentElement;
            }
        }

        // Return the highest parent we found if nothing else matched
        return currentElement;
    }

    // Function to start observing DOM changes
    function startObserving() {
        // Stop any existing observers or intervals
        stopObserving();

        // Create a MutationObserver with stronger detection for lazy loading
        observer = new MutationObserver((mutations) => {
            let shouldCheck = false;

            // Look for significant mutations that might be lazy loading
            for (const mutation of mutations) {
                // Look for added nodes
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // If we added DOM elements, it might be new cards
                            shouldCheck = true;
                            break;
                        }
                    }
                }

                // Also check for attribute changes on existing nodes
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (target.nodeType === Node.ELEMENT_NODE) {
                        // Check if it's a product card or might contain one
                        if (target.classList.contains('hz_bu') ||
                            target.classList.contains('search-item-card-wrapper-gallery') ||
                            target.querySelectorAll('.hz_bu, .search-item-card-wrapper-gallery').length > 0) {
                            shouldCheck = true;
                            break;
                        }
                    }
                }
            }

            if (shouldCheck) {
                // Use requestAnimationFrame to avoid excessive performance impact
                window.requestAnimationFrame(() => {
                    removeBundleDeals();
                });
            }
        });

        // Observe the entire document with all types of changes
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style'] // Monitor class and style changes
        });

        // Run initially
        removeBundleDeals();

        // Set up scroll monitoring
        window.addEventListener('scroll', handleScroll);

        // Set up intervals to periodically check for new cards
        // - Every 500ms during scrolling
        // - Every 2s when not scrolling
        checkIntervalId = setInterval(removeBundleDeals, 2000);
    }

    // Enhanced scroll handling with debounce and frequent checking during scroll
    let isScrolling = false;
    let scrollTimeout;

    function handleScroll() {
        // Set scrolling flag
        isScrolling = true;

        // Clear previous timeout
        clearTimeout(scrollTimeout);

        // If we don't already have an active scroll interval, create one
        if (!scrollIntervalId) {
            scrollIntervalId = setInterval(() => {
                if (isScrolling) {
                    removeBundleDeals();
                }
            }, 500);
        }

        // Set a timeout to clear scrolling flag
        scrollTimeout = setTimeout(() => {
            isScrolling = false;

            // Check one final time after scrolling stops
            removeBundleDeals();

            // Clear the frequent scroll interval
            if (scrollIntervalId) {
                clearInterval(scrollIntervalId);
                scrollIntervalId = null;
            }
        }, 1000);
    }

    // Function to stop observing DOM changes
    function stopObserving() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }

        if (checkIntervalId) {
            clearInterval(checkIntervalId);
            checkIntervalId = null;
        }

        if (scrollIntervalId) {
            clearInterval(scrollIntervalId);
            scrollIntervalId = null;
        }

        window.removeEventListener('scroll', handleScroll);
    }

    // Initialize when page is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (isEnabled) startObserving();
        });
    } else {
        if (isEnabled) startObserving();
    }

    // Run additional check when page fully loads
    window.addEventListener('load', () => {
        // Allow a moment for lazy-loaded images to appear
        setTimeout(() => {
            if (isEnabled) removeBundleDeals();
        }, 1000);
    });
})();