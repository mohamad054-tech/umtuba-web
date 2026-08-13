/**
 * Public-facing disclosure for the account-deletion page.
 * Must stay honest: this flow queues a request; it does not delete immediately.
 */

export const ACCOUNT_DELETION_MODE_LABEL = "queued";

export const ACCOUNT_DELETION_DATA_DELETED = [
  "Sign-in credentials and the authentication account",
  "Profile details such as username, display name, bio, avatar, and location you provided",
  "Session and device push tokens for this account",
  "Likes, saves, follows, and similar engagement records tied to this account",
  "Watch videos, captions, and other User Content you published, including associated media files where UMTUBA still controls them",
  "Learning progress and similar personal records linked only to this account",
] as const;

export const ACCOUNT_DELETION_DATA_ANONYMIZED = [
  "Direct messages you sent: your sender identity is detached; recipients may still have the message content",
  "Public comments or similar contributions may be de-identified where the product architecture supports it",
] as const;

export const ACCOUNT_DELETION_DATA_RETAINED = [
  "Store orders, payments, refunds, and related financial records",
  "Records required for tax, accounting, dispute, or legal compliance",
  "Limited security, fraud, and abuse-prevention logs",
  "Temporary copies in backups or caches until those systems rotate",
] as const;

export const ACCOUNT_DELETION_RETENTION_REASON = [
  "Commerce and financial recordkeeping required or permitted by law",
  "Security, fraud prevention, and abuse investigation",
  "Copies of communications already delivered to other users",
  "Backup and cache rotation windows",
] as const;
