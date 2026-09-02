/**
 * Voter Profile Anti-Bot System for GOS PWA
 * Proof-of-Humanity, trust scoring (0-100), vouching, appeals
 */

export interface VoterProfile {
  userId: string;
  trustScore: number;
  level: number;
  created: number;
  lastActive: number;
  vouches: Vouch[];
  flags: Flag[];
}

export interface Vouch {
  from: string;
  timestamp: number;
  weight: number;
  message: string;
}

export interface Flag {
  reason: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high';
}

const VOTER_THRESHOLD = 50;  // Min trust to vote
const REVIEW_THRESHOLD = 30; // Min trust to review
const NEW_USER_SCORE = 10;   // Starting trust
const VOUCH_WEIGHT = 5;      // Trust per vouch
const DAILY_DECAY = 0.5;     // Trust decay per day inactive

// ============================================
// VOTER PROFILE MANAGER
// ============================================
export class VoterProfileManager {
  private profiles: Map<string, VoterProfile> = new Map();

  constructor() {
    this.loadProfiles();
  }

  /** Create or get voter profile */
  getOrCreate(userId: string): VoterProfile {
    const existing = this.profiles.get(userId);
    if (existing) {
      existing.lastActive = Date.now();
      this.applyDecay(existing);
      return existing;
    }

    const profile: VoterProfile = {
      userId,
      trustScore: NEW_USER_SCORE,
      level: 0,
      created: Date.now(),
      lastActive: Date.now(),
      vouches: [],
      flags: [],
    };

    this.profiles.set(userId, profile);
    this.saveProfiles();
    return profile;
  }

  /** Get profile */
  get(userId: string): VoterProfile | null {
    return this.profiles.get(userId) || null;
  }

  /** Get trust score */
  getTrustScore(userId: string): number {
    return this.getOrCreate(userId).trustScore;
  }

  /** Can this user vote? */
  canVote(userId: string): boolean {
    return this.getOrCreate(userId).trustScore >= VOTER_THRESHOLD;
  }

  /** Can this user review? */
  canReview(userId: string): boolean {
    return this.getOrCreate(userId).trustScore >= REVIEW_THRESHOLD;
  }

  /** Vouch for another user */
  async vouch(userId: string, targetId: string, message: string): Promise<{ success: boolean; newScore: number }> {
    const profile = this.getOrCreate(targetId);
    const vouchUser = this.getOrCreate(userId);

    // Can't vouch if your own trust is low
    if (vouchUser.trustScore < 20) {
      throw new Error('Tu trust score es muy bajo para avalar a otros');
    }

    // Check for existing vouch
    if (profile.vouches.some(v => v.from === userId)) {
      throw new Error('Ya avalaste a este usuario');
    }

    profile.vouches.push({
      from: userId,
      timestamp: Date.now(),
      weight: VOUCH_WEIGHT,
      message,
    });

    profile.trustScore = Math.min(100, profile.trustScore + VOUCH_WEIGHT);
    this.saveProfiles();
    return { success: true, newScore: profile.trustScore };
  }

  /** Report/flag a user */
  async flagUser(reporterId: string, targetId: string, reason: string): Promise<{ success: boolean; penalty: number }> {
    const profile = this.getOrCreate(targetId);
    const severity: 'low' | 'medium' | 'high' = this.classifySeverity(reason);
    const penaltyMap = { low: 5, medium: 15, high: 30 };

    profile.flags.push({
      reason,
      timestamp: Date.now(),
      severity,
    });

    // Apply penalty
    const penalty = penaltyMap[severity];
    profile.trustScore = Math.max(0, profile.trustScore - penalty);

    this.saveProfiles();
    return { success: true, penalty };
  }

  /** Appeal a flag */
  async appeal(userId: string, reason: string): Promise<{ success: boolean; newScore: number }> {
    const profile = this.getOrCreate(userId);
    const recentFlags = profile.flags.filter(f => Date.now() - f.timestamp < 24 * 60 * 60 * 1000);

    if (recentFlags.length === 0) {
      return { success: true, newScore: profile.trustScore };
    }

    // In production: send appeal to community review
    // For now: auto-reduce by removing oldest flag
    profile.flags.sort((a, b) => b.timestamp - a.timestamp);
    const removed = profile.flags.pop();
    profile.trustScore = Math.min(100, profile.trustScore + 10);

    this.saveProfiles();
    return { success: true, newScore: profile.trustScore };
  }

  /** Award bonus for positive behavior */
  async awardPositive(userId: string, action: string, bonus: number): Promise<number> {
    const profile = this.getOrCreate(userId);
    profile.trustScore = Math.min(100, profile.trustScore + bonus);
    this.saveProfiles();
    return profile.trustScore;
  }

  /** Get leaderboard */
  getLeaderboard(limit: number = 20): VoterProfile[] {
    return Array.from(this.profiles.values())
      .sort((a, b) => b.trustScore - a.trustScore)
      .slice(0, limit);
  }

  /** Get suspicious users (low trust + many flags) */
  getSuspiciousUsers(): VoterProfile[] {
    return Array.from(this.profiles.values())
      .filter(p => p.flags.length >= 3 && p.trustScore < 20);
  }

  /** Calculate vote weight based on trust */
  voteWeight(userId: string): number {
    const score = this.getTrustScore(userId);
    if (score >= 90) return 3;
    if (score >= 70) return 2;
    return 1;
  }

  /** Check if user might be a bot */
  async isSuspectedBot(userId: string): Promise<{ bot: boolean; reasons: string[] }> {
    const reason: string[] = [];
    const profile = this.get(userId);
    if (!profile) return { bot: false, reasons: [] };

    // Bot detection heuristics (stored locally)
    if (profile.flags.filter(f => f.severity === 'high').length >= 2) {
      reason.push('Múltiples flags de alta severidad');
    }
    if (profile.trustScore < 10 && profile.vouches.length === 0) {
      reason.push('Trust score muy bajo sin avales');
    }
    // In production: rate limits, time analysis, ML model

    return { bot: reason.length >= 2, reasons: reason };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private classifySeverity(reason: string): 'low' | 'medium' | 'high' {
    const high = ['spam', 'bot', 'abuse', 'fake', 'scam', 'phishing'];
    const med = ['duplicate', 'offensive', 'wrong data', 'misleading'];
    const text = reason.toLowerCase();

    if (high.some(w => text.includes(w))) return 'high';
    if (med.some(w => text.includes(w))) return 'medium';
    return 'low';
  }

  private applyDecay(profile: VoterProfile): void {
    if (profile.trustScore <= NEW_USER_SCORE) return;
    const daysInactive = (Date.now() - profile.lastActive) / (24 * 60 * 60 * 1000);
    if (daysInactive > 0.5) {
      profile.trustScore = Math.max(NEW_USER_SCORE, profile.trustScore - DAILY_DECAY * Math.floor(daysInactive));
    }
  }

  private loadProfiles(): void {
    try {
      const data = localStorage.getItem('gos_voter_profiles');
      if (data) {
        const parsed = JSON.parse(data);
        for (const [key, val] of Object.entries(parsed)) {
          this.profiles.set(key, val as VoterProfile);
        }
      }
    } catch { /* ignore */ }
  }

  private saveProfiles(): void {
    const obj: Record<string, VoterProfile> = {};
    for (const [key, val] of this.profiles) {
      obj[key] = val;
    }
    localStorage.setItem('gos_voter_profiles', JSON.stringify(obj));
  }
}

/** Singleton */
let instance: VoterProfileManager | null = null;

export function getVoterManager(): VoterProfileManager {
  if (!instance) instance = new VoterProfileManager();
  return instance;
}

export default VoterProfileManager;
