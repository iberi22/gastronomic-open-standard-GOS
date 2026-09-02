/**
 * GOS PWA - Unified Library Index
 * Single entry point for all GOS features
 */

// Core database
export { initDB, saveReview, getReview, getAllReviews, markSynced, deleteReview,
         getUnsyncedCount, getDBStatus, clearAll, onReviewAdded,
         saveUser, getUser, getAllUsers, saveProduct, getProduct, getAllProducts,
         setMetadata, getMetadata, getSyncQueue, clearSyncQueue } from './gundb';
export type { LocalReview, LocalUser, LocalProduct, DBStatus } from './gundb';

// Sync & Crypto
export { GitHubSync } from './github-sync';
export { Crypto, createKeyPair, encryptReview, decryptReview, signReview, verifySignature } from './crypto';

// Image processing
export { imageProcessor, compressImage } from './image-processor';

// Feature modules
export { CountryFilter, getCountryFilter, ALLOWED_COUNTRIES } from './country-filter';
export type { CountryInfo } from './country-filter';
export { PeerDiscovery } from './peer-discovery';
export { GOSVerification, createVerification } from './verification';
export type { VerificationProof, VerificationState } from './verification';
export { VoterProfileManager, getVoterManager } from './voter-profile';
export type { VoterProfile, Vouch, Flag } from './voter-profile';
export { IPFSUpload, getIPFSUpload } from './ipfs-upload';
