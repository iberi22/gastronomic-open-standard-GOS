/**
 * Identity Verification System for GOS PWA
 * Email OTP, Phone SMS, OAuth (GitHub/Google/Twitter)
 * CRITICAL: Only SHA-256 hashes stored - NEVER plain data
 * Levels: 0-5
 */

// ============================================
// VERIFICATION LEVELS
// ============================================
export interface VerificationProof {
  verified: boolean;
  hash: string;
  verifiedAt: number;
  provider: string;
}

export interface VerificationState {
  userId: string;
  verificationLevel: number;
  email?: VerificationProof | null;
  phone?: VerificationProof | null;
  github?: VerificationProof | null;
  google?: VerificationProof | null;
  twitter?: VerificationProof | null;
}

type VerificationMethod = 'email' | 'phone' | 'github' | 'google' | 'twitter';

// ============================================
// VERIFICATION SYSTEM
// ============================================
export class GOSVerification {
  private userId: string;
  private proofs: Record<string, VerificationProof | null> = {};
  private level: number = 0;
  private pendingOTP: Map<string, { hash: string; otpHash: string; expiresAt: number }> = new Map();

  constructor(userId: string) {
    this.userId = userId;
  }

  /** Start email verification (sends OTP) */
  async verifyEmail(email: string): Promise<{ status: string; masked: string }> {
    const emailHash = await this.sha256(email.toLowerCase().trim());
    const otp = this.generateOTP();
    const otpHash = await this.sha256(otp);

    this.pendingOTP.set('email', {
      hash: emailHash,
      otpHash,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min TTL
    });

    // In production: send via SMTP (Resend/SendGrid)
    console.log(`[Verification] OTP for ${this.maskEmail(email)}: ${otp}`);

    return { status: 'otp_sent', masked: this.maskEmail(email) };
  }

  /** Confirm email OTP */
  async confirmEmailOTP(otp: string): Promise<{ success: boolean; level: number }> {
    return this.confirmOTP('email', otp);
  }

  /** Start phone verification (sends SMS OTP) */
  async verifyPhone(phone: string): Promise<{ status: string; masked: string }> {
    const phoneHash = await this.sha256(phone.replace(/[\s\-\(\)]/g, ''));
    const otp = this.generateOTP();
    const otpHash = await this.sha256(otp);

    this.pendingOTP.set('phone', {
      hash: phoneHash,
      otpHash,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    console.log(`[Verification] SMS OTP for ${this.maskPhone(phone)}: ${otp}`);

    return { status: 'otp_sent', masked: this.maskPhone(phone) };
  }

  /** Confirm phone OTP */
  async confirmPhoneOTP(otp: string): Promise<{ success: boolean; level: number }> {
    return this.confirmOTP('phone', otp);
  }

  /** Verify GitHub via OAuth */
  async verifyGitHub(): Promise<{ success: boolean; level: number }> {
    // OAuth 2.0 flow - get token, fetch user, store hash only
    const githubUser = await this.initiateOAuth('github');
    const hash = await this.sha256(githubUser.login + (githubUser.email || ''));

    this.proofs.github = {
      verified: true,
      hash,
      verifiedAt: Date.now(),
      provider: 'github',
    };

    this.level = await this.calculateLevel();
    return { success: true, level: this.level };
  }

  /** Verify Google via OAuth */
  async verifyGoogle(): Promise<{ success: boolean; level: number }> {
    const googleUser = await this.initiateOAuth('google');
    const hash = await this.sha256(googleUser.email);

    this.proofs.google = {
      verified: true,
      hash,
      verifiedAt: Date.now(),
      provider: 'google',
    };

    this.level = await this.calculateLevel();
    return { success: true, level: this.level };
  }

  /** Verify Twitter/X via OAuth */
  async verifyTwitter(): Promise<{ success: boolean; level: number }> {
    const twitterUser = await this.initiateOAuth('twitter');
    const hash = await this.sha256(twitterUser.username + (twitterUser.email || ''));

    this.proofs.twitter = {
      verified: true,
      hash,
      verifiedAt: Date.now(),
      provider: 'twitter',
    };

    this.level = await this.calculateLevel();
    return { success: true, level: this.level };
  }

  /** Get current verification level (0-5) */
  getLevel(): number {
    return this.level;
  }

  /** Get verification state (only hashes, no plain data) */
  getState(): VerificationState {
    return {
      userId: this.userId,
      verificationLevel: this.level,
      email: this.proofs.email || null,
      phone: this.proofs.phone || null,
      github: this.proofs.github || null,
      google: this.proofs.google || null,
      twitter: this.proofs.twitter || null,
    };
  }

  /** Load state from persisted data (hashes only) */
  loadState(state: VerificationState): void {
    this.level = state.verificationLevel || 0;
    this.proofs.email = state.email || null;
    this.proofs.phone = state.phone || null;
    this.proofs.github = state.github || null;
    this.proofs.google = state.google || null;
    this.proofs.twitter = state.twitter || null;
  }

  /** Check if user can vote (level >= 3) */
  canVote(): boolean {
    return this.level >= 3;
  }

  /** Check if user can review (level >= 1) */
  canReview(): boolean {
    return this.level >= 1;
  }

  /** Vote weight based on verification level */
  voteWeight(): number {
    if (this.level >= 5) return 3;
    if (this.level >= 4) return 2;
    return 1;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private async confirmOTP(method: string, otp: string): Promise<{ success: boolean; level: number }> {
    const pending = this.pendingOTP.get(method);
    if (!pending) throw new Error(`No pending ${method} verification`);

    if (Date.now() > pending.expiresAt) {
      this.pendingOTP.delete(method);
      throw new Error('OTP expired');
    }

    const otpHash = await this.sha256(otp);
    if (pending.otpHash !== otpHash) {
      throw new Error('Invalid OTP');
    }

    this.proofs[method] = {
      verified: true,
      hash: pending.hash,
      verifiedAt: Date.now(),
      provider: method === 'email' ? 'smtp' : method === 'phone' ? 'twilio' : method,
    };

    this.pendingOTP.delete(method);
    this.level = await this.calculateLevel();
    return { success: true, level: this.level };
  }

  private async calculateLevel(): Promise<number> {
    const verifiedCount = Object.values(this.proofs).filter(p => p?.verified).length;
    let level = verifiedCount;
    if (verifiedCount >= 3) level += 2;
    else if (verifiedCount >= 2) level += 1;
    return Math.min(level, 5);
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sha256(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private maskEmail(email: string): string {
    const [user, domain] = email.split('@');
    return user.slice(0, 2) + '***@' + domain;
  }

  private maskPhone(phone: string): string {
    const clean = phone.replace(/[\s\-\(\)]/g, '');
    return clean.slice(0, 4) + '****' + clean.slice(-3);
  }

  private async initiateOAuth(provider: string): Promise<any> {
    // Stub - in production, redirect to OAuth provider
    console.log(`[Verification] OAuth ${provider} flow initiated`);
    return { login: 'user_demo', email: `${provider}_user@example.com`, username: 'demo_user' };
  }
}

/** Create a verification instance */
export function createVerification(userId: string): GOSVerification {
  return new GOSVerification(userId);
}

export default GOSVerification;
