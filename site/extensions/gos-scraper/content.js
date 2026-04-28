// GOS Scraper - Content Script
// Extrae datos de páginas de Yelp y Google Maps

(function() {
  'use strict';
  
  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scrape') {
      const data = scrapeCurrentPage();
      sendResponse({ data });
    }
    return true;
  });
  
  function scrapeCurrentPage() {
    const url = window.location.href;
    
    if (url.includes('yelp.com')) {
      return scrapeYelp(url);
    } else if (url.includes('google.com/maps')) {
      return scrapeGoogleMaps(url);
    }
    
    return { place: null, reviews: [] };
  }
  
  function scrapeYelp(url) {
    const data = { place: null, reviews: [] };
    
    // Check if it's a business page
    if (url.includes('/biz/')) {
      data.place = {
        id: `yelp_${extractYelpId(url)}`,
        type: 'product',
        name: extractText('.header__title', 'name'),
        alias: extractAttribute('.header__title', 'aria-label', 'name'),
        brand: extractText('.header__title', 'name'),
        country: detectCountry(),
        location: {
          address: extractText('[address]', 'address') || extractText('.address', 'address'),
          city: extractText('.city', 'city'),
          lat: extractNumber('[data-lat]') || extractNumber('[data-latitude]'),
          lng: extractNumber('[data-lng]') || extractNumber('[data-longitude]')
        },
        averageRating: extractRating('.i-stars--regular', 'rating'),
        reviewCount: extractNumber('.review-count', 'reviews'),
        categories: extractCategories(),
        source: 'yelp',
        sourceUrl: url,
        scrapedAt: new Date().toISOString()
      };
      
      // Extract reviews
      data.reviews = extractYelpReviews();
    } else {
      // Search results page - extract multiple businesses
      const listings = document.querySelectorAll('[data-item-id]');
      listings.forEach(listing => {
        const name = listing.querySelector('a[data-item-id]')?.textContent?.trim();
        const rating = listing.querySelector('[aria-label*="star"]')?.getAttribute('aria-label');
        
        if (name && !name.includes('Sponsored')) {
          data.place = data.place || {
            id: `yelp_search_${Date.now()}`,
            type: 'product',
            name: name,
            source: 'yelp_search',
            sourceUrl: url,
            scrapedAt: new Date().toISOString()
          };
        }
      });
    }
    
    return data;
  }
  
  function scrapeGoogleMaps(url) {
    const data = { place: null, reviews: [] };
    
    // Extract place name
    const nameEl = document.querySelector('h1.DUwDvf') || document.querySelector('[data-item-id="title"]');
    const name = nameEl?.textContent?.trim();
    
    if (name) {
      // Rating
      const ratingEl = document.querySelector('.F7nice span');
      const rating = parseFloat(ratingEl?.textContent) || 0;
      
      // Reviews count
      const reviewsEl = document.querySelector('.F7nice a[href*="reviews"]');
      const reviewsCount = parseInt(reviewsEl?.textContent?.replace(/\D/g, '')) || 0;
      
      // Address
      const addressEl = document.querySelector('[data-item-id="address"] .rogA2c');
      const address = addressEl?.textContent?.trim();
      
      // Lat/Lng
      const lat = extractNumber('[data-latitude]') || window.__INITIAL_DATA__?.lat;
      const lng = extractNumber('[data-longitude]') || window.__INITIAL_DATA__?.lng;
      
      // Extract category
      const categoryEl = document.querySelector('.button-expand-more .瓜jxNc');
      const category = categoryEl?.textContent?.trim();
      
      data.place = {
        id: `gmaps_${generateId()}`,
        type: 'product',
        name,
        country: detectCountry(),
        location: {
          address,
          lat,
          lng
        },
        averageRating: rating,
        reviewCount: reviewsCount,
        categories: category ? [category] : [],
        source: 'google_maps',
        sourceUrl: url,
        scrapedAt: new Date().toISOString()
      };
      
      // Extract reviews if visible
      data.reviews = extractGoogleReviews();
    }
    
    return data;
  }
  
  function extractYelpReviews() {
    const reviews = [];
    const reviewEls = document.querySelectorAll('[data-review-id]');
    
    reviewEls.forEach(el => {
      const id = el.getAttribute('data-review-id');
      const ratingEl = el.querySelector('.rating');
      const rating = ratingEl ? parseInt(ratingEl.getAttribute('aria-label')) : 0;
      const textEl = el.querySelector('.comment');
      const text = textEl?.textContent?.trim();
      const dateEl = el.querySelector('.css-chan6m');
      const date = dateEl?.textContent?.trim();
      const authorEl = el.querySelector('.css-1pb9lug');
      const author = authorEl?.textContent?.trim();
      
      if (text) {
        reviews.push({
          id: `yelp_review_${id}`,
          type: 'review',
          rating,
          comment: text.substring(0, 500),
          userName: author || 'Anonymous',
          publishDate: date,
          source: 'yelp',
          scrapedAt: new Date().toISOString()
        });
      }
    });
    
    return reviews;
  }
  
  function extractGoogleReviews() {
    const reviews = [];
    
    // Scroll to load reviews if available
    const reviewButtons = document.querySelectorAll('.jJc9Z a[href*="reviews"]');
    
    // Try to extract visible reviews
    const visibleReviews = document.querySelectorAll('.WMbNwc');
    visibleReviews.forEach((el, i) => {
      const author = el.querySelector('.d4r55')?.textContent?.trim();
      const rating = el.querySelector('.F7nice span')?.getAttribute('aria-label');
      const ratingNum = rating ? parseInt(rating) : 0;
      const text = el.querySelector('.wiI7pd')?.textContent?.trim();
      const date = el.querySelector('.rsqaWe')?.textContent?.trim();
      
      if (text) {
        reviews.push({
          id: `gmaps_review_${generateId()}_${i}`,
          type: 'review',
          rating: ratingNum,
          comment: text.substring(0, 500),
          userName: author || 'Anonymous',
          publishDate: date,
          source: 'google_maps',
          scrapedAt: new Date().toISOString()
        });
      }
    });
    
    return reviews;
  }
  
  // Helper functions
  function extractText(selector, fallback) {
    try {
      const el = document.querySelector(selector);
      return el?.textContent?.trim() || fallback;
    } catch {
      return fallback;
    }
  }
  
  function extractAttribute(selector, attr, fallback) {
    try {
      const el = document.querySelector(selector);
      return el?.getAttribute(attr) || fallback;
    } catch {
      return fallback;
    }
  }
  
  function extractNumber(selector, fallback) {
    try {
      const el = document.querySelector(selector);
      const text = el?.textContent || el?.getAttribute('data-lat') || '';
      const num = parseFloat(text.replace(/[^\d.-]/g, ''));
      return isNaN(num) ? fallback : num;
    } catch {
      return fallback;
    }
  }
  
  function extractRating(selector, fallback) {
    const el = document.querySelector(selector);
    if (!el) return fallback;
    
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) {
      const match = ariaLabel.match(/(\d+\.?\d*)/);
      if (match) return parseFloat(match[1]);
    }
    
    return fallback;
  }
  
  function extractCategories() {
    const categories = [];
    const catEl = document.querySelectorAll('.category-str-list a');
    catEl.forEach(el => {
      categories.push(el.textContent.trim());
    });
    return categories;
  }
  
  function extractYelpId(url) {
    const match = url.match(/\/biz\/([^\/\?]+)/);
    return match ? match[1] : generateId();
  }
  
  function detectCountry() {
    // Try to detect from page content or URL
    const url = window.location.href;
    
    if (url.includes('google.com/maps')) {
      // Try to extract from visible text
      const location = document.querySelector('[data-item-id="address"] .rogA2c');
      const text = location?.textContent || '';
      
      if (text.includes('Colombia') || text.includes('Bogotá')) return 'CO';
      if (text.includes('Perú') || text.includes('Lima')) return 'PE';
      if (text.includes('México') || text.includes('CDMX')) return 'MX';
      if (text.includes('Argentina') || text.includes('Buenos Aires')) return 'AR';
    }
    
    // Default based on domain
    if (url.includes('yelp.com.co')) return 'CO';
    if (url.includes('yelp.com.mx')) return 'MX';
    if (url.includes('yelp.com.ar')) return 'AR';
    if (url.includes('yelp.pe')) return 'PE';
    
    return 'US';
  }
  
  function generateId() {
    return Math.random().toString(36).substring(2, 15);
  }
  
  console.log('GOS Scraper: Content script loaded');
})();