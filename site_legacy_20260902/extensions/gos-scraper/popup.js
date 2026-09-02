// GOS Scraper - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  const scrapeBtn = document.getElementById('scrape-btn');
  const viewBtn = document.getElementById('view-btn');
  const exportBtn = document.getElementById('export-btn');
  const pageStatus = document.getElementById('page-status');
  const placesCount = document.getElementById('places-count');
  const reviewsCount = document.getElementById('reviews-count');
  
  // Load stats from storage
  async function loadStats() {
    const data = await chrome.storage.local.get(['places', 'reviews']);
    placesCount.textContent = (data.places || []).length;
    reviewsCount.textContent = (data.reviews || []).length;
  }
  
  // Detect current page type
  async function detectPage() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab.url;
    
    if (url.includes('yelp.com')) {
      if (url.includes('/biz/')) {
        pageStatus.textContent = 'Yelp - Restaurante';
        pageStatus.className = 'status-value success';
        scrapeBtn.disabled = false;
      } else {
        pageStatus.textContent = 'Yelp - Búsqueda';
        pageStatus.className = 'status-value info';
        scrapeBtn.disabled = false;
      }
    } else if (url.includes('google.com/maps')) {
      pageStatus.textContent = 'Google Maps';
      pageStatus.className = 'status-value success';
      scrapeBtn.disabled = false;
    } else {
      pageStatus.textContent = 'Página no soportada';
      pageStatus.className = 'status-value warning';
      scrapeBtn.disabled = true;
    }
  }
  
  // Scrape current page
  scrapeBtn.addEventListener('click', async () => {
    scrapeBtn.disabled = true;
    scrapeBtn.textContent = 'Extrayendo...';
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Send message to content script
      const results = await chrome.tabs.sendMessage(tab.id, { action: 'scrape' });
      
      if (results && results.data) {
        // Save to storage
        const existing = await chrome.storage.local.get(['places', 'reviews']);
        const places = existing.places || [];
        const reviews = existing.reviews || [];
        
        if (results.data.place) {
          // Check for duplicates
          const exists = places.some(p => p.id === results.data.place.id);
          if (!exists) {
            places.push(results.data.place);
          }
        }
        
        if (results.data.reviews) {
          reviews.push(...results.data.reviews);
        }
        
        await chrome.storage.local.set({ places, reviews });
        
        pageStatus.textContent = `¡Extraído! ${results.data.reviews?.length || 0} reviews`;
        pageStatus.className = 'status-value success';
        
        await loadStats();
      }
    } catch (err) {
      pageStatus.textContent = 'Error: ' + err.message;
      pageStatus.className = 'status-value warning';
    }
    
    scrapeBtn.disabled = false;
    scrapeBtn.textContent = 'Extraer Datos';
  });
  
  // View in GOS App
  viewBtn.addEventListener('click', async () => {
    // Open GOS PWA
    await chrome.tabs.create({ url: 'https://iberi22.github.io/gastronomic-open-standard-GOS/' });
  });
  
  // Export data as JSON
  exportBtn.addEventListener('click', async () => {
    const data = await chrome.storage.local.get(['places', 'reviews']);
    
    const exportData = {
      exported_at: new Date().toISOString(),
      places: data.places || [],
      reviews: data.reviews || []
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    await chrome.downloads.download({
      url,
      filename: `gos-export-${Date.now()}.json`
    });
  });
  
  // Initialize
  await loadStats();
  await detectPage();
});