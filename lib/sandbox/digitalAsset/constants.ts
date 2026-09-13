/**
 * PRIVATE DIGITAL-ASSET LAB — hard firewall.
 * These product defaults must never flip to production values in this GO.
 */

export const LAB_ID = "PC2_UMTUBA_DIGITAL_CURRENCY_READINESS_LAB_V1" as const;

export const PRODUCTION_ENABLED = false;
export const CONVERSION_ENABLED = false;
export const DEPOSITS_ENABLED = false;
export const WITHDRAWALS_ENABLED = false;
export const TRADING_ENABLED = false;
export const MAINNET_DEPLOYED = false;
export const PRODUCTION_CONNECTED = false;
export const REAL_FUNDS_USED = 0;
export const REAL_CRYPTO_PURCHASED = 0;
export const REAL_USERS_MIGRATED = 0;

export const TOKEN_NAME = "TEST_PLACEHOLDER" as const;
export const TOKEN_SYMBOL = "TEST_PLACEHOLDER" as const;
export const TOKEN_DECIMALS = 18;
export const TOKEN_SUPPLY = "UNDECIDED" as const;
export const TOKEN_PRICE = "UNDECIDED" as const;
export const CONVERSION_RATE = "UNDECIDED" as const;
export const TOKEN_ALLOCATIONS = "UNDECIDED" as const;
export const TOKEN_VESTING = "UNDECIDED" as const;
export const TOKEN_LIQUIDITY = "UNDECIDED" as const;

/**
 * Test-only identity mapping used inside isolated tests.
 * This is NOT a production conversion rate.
 */
export const SANDBOX_IDENTITY_MAPPING = 1;
export const SANDBOX_MAPPING_LABEL = "NOT_A_PRODUCTION_RATE" as const;

export const DEMO_USER_A_ID = "demo-user-a" as const;
export const DEMO_USER_A_POINTS = 1000;
export const DEMO_CONVERT_POINTS = 100;

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
export const LOCAL_CHAIN_ID = "local-sandbox-0" as const;
export const LOCAL_NETWORK_NAME = "LOCAL_IN_MEMORY" as const;

export const ROLE_DEFAULT_ADMIN = "DEFAULT_ADMIN" as const;
export const ROLE_MINTER = "MINTER" as const;
export const ROLE_BURNER = "BURNER" as const;
export const ROLE_PAUSER = "PAUSER" as const;
export const ROLE_TREASURY_ADMIN = "TREASURY_ADMIN" as const;
export const ROLE_COMPLIANCE_VIEWER = "COMPLIANCE_VIEWER" as const;
export const ROLE_USER = "USER" as const;

export const SANDBOX_ADMIN_ID = "sandbox-admin" as const;
export const SANDBOX_TREASURY_ID = "sandbox-treasury" as const;
export const SANDBOX_MINTER_ID = "sandbox-minter" as const;

export const LEGAL_CLASSIFICATION = "REQUIRES_QUALIFIED_LEGAL_COUNSEL" as const;
