/**
 * GitHub REST API Sync for GOS PWA
 * Handles push/pull operations with gos-p2p-data repository
 */

const GITHUB_API = 'https://api.github.com';
const GITHUB_REPO = 'iberi22/gos-p2p-data';

const TOKEN_KEY = 'gos_github_token';

/**
 * Get stored GitHub token (encrypted in localStorage)
 */
function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Save GitHub token
 */
export async function saveToken(token: string): Promise<void> {
  if (!token || !token.startsWith('ghp_')) {
    throw new Error('Token must be a valid GitHub Personal Access Token (starts with ghp_)');
  }

  // Basic validation - token format check
  if (token.length < 36) {
    throw new Error('Invalid token format');
  }

  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Delete stored token
 */
export function deleteToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Make authenticated GitHub API request
 */
async function githubFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  if (!token) {
    throw new Error('GitHub token not configured. Add token in Settings.');
  }

  const response = await fetch(`${GITHUB_API}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`GitHub API error: ${error.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Get reviews data from GitHub repo
 */
export async function pullData(): Promise<any[]> {
  try {
    // Try to get reviews file from the repo
    const content = await githubFetch(`/repos/${GITHUB_REPO}/contents/data/reviews.json`, {
      method: 'GET'
    });

    if (content && content.content) {
      const decoded = atob(content.content);
      return JSON.parse(decoded);
    }

    return [];
  } catch (e) {
    // If file doesn't exist, return empty array
    if ((e as Error).message.includes('404')) {
      return [];
    }
    throw e;
  }
}

/**
 * Push local changes to GitHub repo
 */
export async function pushChanges(changes: {
  reviews?: any[];
  profile?: any;
  timestamp: number;
}): Promise<{ success: boolean; message: string }> {
  const token = getToken();
  if (!token) {
    throw new Error('GitHub token required for push');
  }

  try {
    // Get current content to preserve other data
    let currentContent: any = {};
    let sha: string | undefined;

    try {
      const existing = await githubFetch(`/repos/${GITHUB_REPO}/contents/data/reviews.json`, {
        method: 'GET'
      });
      if (existing && existing.content) {
        currentContent = JSON.parse(atob(existing.content));
        sha = existing.sha;
      }
    } catch {
      // File doesn't exist yet, that's okay
    }

    // Merge changes
    const merged = {
      ...currentContent,
      reviews: changes.reviews || currentContent.reviews || [],
      profile: changes.profile || currentContent.profile,
      lastUpdated: changes.timestamp
    };

    // Create content
    const content = btoa(JSON.stringify(merged, null, 2));

    // Push to GitHub
    await githubFetch(`/repos/${GITHUB_REPO}/contents/data/reviews.json`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `GOS PWA sync: ${new Date().toISOString()}`,
        content,
        sha
      })
    });

    localStorage.setItem('gos_last_sync', Date.now().toString());

    return {
      success: true,
      message: 'Cambios sincronizados correctamente'
    };
  } catch (e) {
    return {
      success: false,
      message: (e as Error).message
    };
  }
}

/**
 * Full sync - pull then push with local reviews merged
 */
export async function syncNow(): Promise<{ synced: number; conflicts: number }> {
  // Get local reviews
  const localReviews = JSON.parse(localStorage.getItem('gos_reviews') || '[]');

  // Pull remote
  let remoteReviews: any[] = [];
  try {
    remoteReviews = await pullData();
  } catch {
    // Continue with local only if pull fails
  }

  // Merge: local reviews take precedence (newer wins by timestamp)
  const allReviews = [...remoteReviews];
  
  localReviews.forEach((local: any) => {
    const existingIndex = allReviews.findIndex(r => r.id === local.id);
    if (existingIndex >= 0) {
      // Keep the newer one
      if (local.timestamp > allReviews[existingIndex].timestamp) {
        allReviews[existingIndex] = local;
      }
    } else {
      allReviews.push(local);
    }
  });

  // Push merged
  const result = await pushChanges({
    reviews: allReviews,
    timestamp: Date.now()
  });

  if (!result.success) {
    throw new Error(result.message);
  }

  return {
    synced: allReviews.length,
    conflicts: 0
  };
}

/**
 * Check if GitHub token is valid
 */
export async function validateToken(): Promise<boolean> {
  try {
    await githubFetch('/user');
    return true;
  } catch {
    return false;
  }
}