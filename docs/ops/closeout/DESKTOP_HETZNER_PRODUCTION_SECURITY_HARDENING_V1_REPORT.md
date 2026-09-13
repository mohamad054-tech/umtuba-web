DESKTOP REPORT
SOURCE_DEVICE = DESKTOP
DEVICE_ROLE = COMMERCE_PRIMARY / AUTHORIZED_PRODUCTION_OPERATOR
TASK_ID = DESKTOP_HETZNER_PRODUCTION_SECURITY_HARDENING_V1
REPORT_TYPE = PRODUCTION_SECURITY_HANDOFF
HOST = 178.104.196.2

Executed: 2026-08-12 (UTC window ~11:57–12:12)
Mode: CONTROLLED_PRODUCTION_HARDENING
Operator path: SSH key auth as root (IdentitiesOnly), fingerprint-verified before mutations.

============================================================
FINAL METRICS BLOCK
============================================================
SSH_KEY_AUTH = PASS
HOST_IDENTITY_VERIFIED = YES
HOST_IDENTITY_MISMATCH = NO
HOST_SECURITY_AUDIT_COMPLETE = YES
FIREWALL_STATUS = HARDENED (UFW active; deny-in default; 22/80/443 IPv4+IPv6 only)
SSH_SECURITY = HARDENED (key-only root retained; passwords off; X11/TCP-forwarding off; MaxAuthTries 4)
WEB_SECURITY = HARDENED (security headers + HSTS; server_tokens off; dotfile deny; CSP deferred)
TLS_SECURITY = PASS (Let's Encrypt ECDSA; umtuba.com + staging valid ~89 days; certbot timer active; TLS1.2/1.3)
RAW_IP_SECURITY = HARDENED (HTTP return 444; HTTPS ssl_reject_handshake on default_server; welcome page removed)
SECRETS_SECURITY = PASS (env files 600 under /etc/umtuba; no public .env/.git leak observed; no values printed)
UPDATE_SECURITY = PASS (low-risk unattended security path enabled; no pending unattended security packages)
BRUTE_FORCE_PROTECTION = HARDENED (fail2ban installed; sshd jail enabled; moderate bantime/findtime/maxretry)
BACKUP_SECURITY = PARTIAL (config backups created under /root/umtuba-security-backups/; app release symlinks present; no dedicated off-host app backup verified this run)
RESTORE_READINESS = PARTIAL (nginx/ssh rollback from timestamped backups documented; app rollback via release symlink; full DR restore not exercised)
PUBLIC_LISTENERS = 22,80,443 (IPv4+IPv6)
BLOCKED_INTERNAL_PORTS = 3000,3001,5432,6379,3306,2375/2376,8080,8443 (localhost-bound and/or UFW-filtered externally)
SECURITY_CHANGES_EXECUTED = YES
CONFIG_BACKUPS = /root/umtuba-security-backups/20260812120659
ROLLBACKS_AVAILABLE = YES
APPLICATION_POST_HARDENING = PASS (umtuba.com + staging.umtuba.com /healthz 200; services active)
SECURITY_REGRESSION = NO
P0_SECRET_ROTATION_REQUIRED = NO
REMAINING_P0 = NONE
REMAINING_P1 = (1) Next.js units run as root; (2) sole admin principal is root key-only (no non-root sudo user yet); (3) legacy cPanel/WHM ports open on 5.9.172.155
REMAINING_P2 = (1) enforcing CSP deferred for Next.js; (2) DNS edge split apex=origin vs www=Cloudflare; (3) no verified off-host application backup job in this audit
CPANEL_OPERATOR_ACTION_REQUIRED = YES (audit-only: 5.9.172.155:2082/2083/2086/2087 reachable from Desktop; do not mutate from this host task)
DNS_EDGE_OPERATOR_ACTION_REQUIRED = YES (document-only: NS=Cloudflare; apex A=178.104.196.2 direct; www via Cloudflare proxies; no DNS mutation performed)
PRODUCTION_SECURITY_GATE = PASS
SAFE_TO_DECLARE_PRODUCTION_SECURITY_READY = YES
SECRETS_EXPOSED_IN_REPORT = NO
PRIVATE_KEY_COPIED_OR_EXPOSED = NO
DNS_MUTATION_PERFORMED = NO
CPANEL_MUTATION_PERFORMED = NO
SSH_LOCKOUT_OCCURRED = NO

============================================================
PHASE 0 — HOST IDENTITY
============================================================
Trusted fingerprint: SHA256:qXJL/K4UkuUuhMv3WJRfzcma/GPjISfZy4O05vSj8A8
Observed (known_hosts ED25519 for 178.104.196.2): SHA256:qXJL/K4UkuUuhMv3WJRfzcma/GPjISfZy4O05vSj8A8
Match: YES
Note: Windows ssh-keyscan failed (unsupported KEX); verification used existing known_hosts entry fingerprints via ssh-keygen -lf.
SSH BatchMode key auth: PASS
Hostname: umtuba-production-1
OS: Ubuntu 24.04.4 LTS (noble), kernel 6.8.0-137-generic

HOST_IDENTITY_MISMATCH = NO
HOST_IDENTITY_VERIFIED = YES
SSH_KEY_AUTH = PASS

============================================================
A1 — FULL HOST SECURITY INVENTORY
============================================================
Public listeners (pre/post): TCP 22/80/443 on 0.0.0.0 and [::]
Local-only app: 127.0.0.1:3000 (staging Next), 127.0.0.1:3001 (production Next)
Resolver: 127.0.0.53/54 (systemd-resolved)
Docker: not installed / no containers
Failed systemd units: none
UFW: active, default deny incoming / allow outgoing; allows 22,80,443 (v4+v6)
SSH effective (pre): PermitRootLogin without-password; PasswordAuthentication no; Pubkey yes; X11 yes; AllowTcpForwarding yes; MaxAuthTries 6
fail2ban: absent pre-change
nginx sites-enabled: default, umtuba-production, umtuba-staging
App units: umtuba-production.service, umtuba-staging.service (EnvironmentFile under /etc/umtuba; bind 127.0.0.1)
Admin users with shell: root only (no uid>=1000 interactive admin)
authorized_keys: 1 key, mode 600; .ssh 700
Secrets locations (types only): /etc/umtuba/production/umtuba.env, /etc/umtuba/staging/umtuba.env (mode 600)
Classification:
- EXPECTED PUBLIC: 22,80,443
- INTERNAL OK (localhost): 3000,3001, DNS stub
- UNEXPECTED PUBLIC PRE: raw IP HTTP welcome page; raw IP HTTPS served app via non-SNI default SSL vhost

============================================================
A2 — FIREWALL / NETWORK
============================================================
Before: UFW already correctly limited to 22/80/443 IPv4+IPv6.
Change: none (inspect-only; already meets expected posture).
External probe post: 3000/3001/5432/6379 filtered/closed; 22/80/443 open.
IPv6: same UFW allows present; nginx listens on [::]:80/443/22.
SSH not disabled. No Desktop/Central lockout.
FIREWALL_STATUS = HARDENED (verified compliant; no risky mutation required)

Evidence:
- component: ufw
- before: active allow 22/80/443
- backup: /root/umtuba-security-backups/20260812120659/ufw-status.txt
- change: none
- validation: ufw status + external TCP probes
- health: SSH + sites OK
- rollback: n/a
- final: unchanged compliant

============================================================
A3 — NGINX / WEB HARDENING
============================================================
Backups: sites default/production/staging + nginx.conf → CONFIG_BACKUPS
Changes executed:
1) Added /etc/nginx/snippets/umtuba-security-headers.conf
   - X-Frame-Options SAMEORIGIN
   - X-Content-Type-Options nosniff
   - Referrer-Policy strict-origin-when-cross-origin
   - Permissions-Policy restrictive
   - HSTS max-age=31536000; includeSubDomains
   - proxy_hide_header X-Powered-By
2) Included snippet in umtuba-production + umtuba-staging server blocks
3) Added dotfile location deny on production (staging already had)
4) nginx.conf ssl_protocols → TLSv1.2 TLSv1.3 only (removed TLSv1/1.1)
5) CSP: DEFERRED (not enforced; Report-Only not added to avoid Next.js breakage noise)
Validation: nginx -t OK; systemctl reload nginx; healthz prod+staging OK
External headers confirmed on https://umtuba.com/ and https://staging.umtuba.com/

Rollback:
- restore files from /root/umtuba-security-backups/20260812120659/
- nginx -t && systemctl reload nginx

============================================================
A4 — RAW IP EXPOSURE
============================================================
Before:
- http://178.104.196.2/ → 200 Welcome to nginx
- https://178.104.196.2/ → 200 Next.js app (default SSL vhost)

After:
- Replaced default site with catch-all:
  - :80 default_server → return 444 (ACME webroot path retained)
  - :443 default_server → ssl_reject_handshake on (no snakeoil package present)
- Moved /var/www/html/index.nginx-debian.html into backup dir
External after:
- raw HTTP: empty reply / code 000 (444)
- raw HTTPS: TLS handshake rejected (expected)
Domain routing preserved: umtuba.com + staging.umtuba.com healthz 200

============================================================
A5 — SSH HARDENING
============================================================
Constraint: no alternate interactive admin user → root SSH key login retained (PermitRootLogin prohibit-password / without-password).
Updated /etc/ssh/sshd_config.d/99-umtuba-hardening.conf:
- PasswordAuthentication no
- KbdInteractiveAuthentication no
- PermitEmptyPasswords no
- PermitRootLogin prohibit-password
- PubkeyAuthentication yes
- X11Forwarding no
- AllowTcpForwarding no
- AllowAgentForwarding no
- GatewayPorts no
- PermitTunnel no
- ClientAliveInterval 300 / ClientAliveCountMax 2
- MaxAuthTries 4
- LoginGraceTime 30
Validation: sshd -t; reload ssh; new Desktop SSH session PASS (SSH_LOCKOUT_OCCURRED=NO)
Did NOT change SSH port; did NOT disable root without alt path.

Rollback: restore 99-umtuba-hardening.conf from backup; sshd -t; reload ssh (keep existing session open).

============================================================
A6 — BRUTE-FORCE / ABUSE
============================================================
Installed fail2ban; enabled jail sshd (moderate: maxretry 5, findtime 10m, bantime 1h, backend systemd).
Status: fail2ban active; Jail list: sshd; banned=0 at validation time.
Not aggressive (no global HTTP ban hammer).

============================================================
A7 — PATCH / UPDATE
============================================================
unattended-upgrades: installed + enabled (Update-Package-Lists=1, Unattended-Upgrade=1)
unattended-upgrade run: "No packages found that can be upgraded unattended"
No major OS/Node/nginx/DB upgrade; no cosmetic reboot.

============================================================
A8 — SECRETS / FILESYSTEM
============================================================
Checked: env file modes, nginx roots, .git/.env public paths, /etc/umtuba perms.
Findings:
- Production/staging env files already mode 600 (good)
- Tightened directory modes: /etc/umtuba and children → 750
- .env.example under /opt previously overly permissive (666) → chmod 644 (examples only; not secret values)
- Public https://umtuba.com/.env and /.git/HEAD → 404
- No secret values printed or rotated
P0_SECRET_ROTATION_REQUIRED = NO (no evidence of public secret leak / compromise)

============================================================
A9 — APPLICATION / AUTH SURFACE (safe)
============================================================
https://umtuba.com/login → 200
/api/auth → 404
/admin → 307 (redirect; not probed destructively)
/.env /.git/HEAD /server-status /nginx_status → 404
staging /healthz → 200; /.env /.git/HEAD → 404
No brute-force or destructive pentest performed.

============================================================
A10 — TLS
============================================================
umtuba.com: notBefore 2026-08-12 → notAfter 2026-11-10; CN=umtuba.com (+www on cert inventory)
staging.umtuba.com: notBefore 2026-08-11 → notAfter 2026-11-09
certbot.timer: active
HTTP→HTTPS redirect behavior preserved for named vhosts
Renewal path not broken (ACME location retained on default :80)

============================================================
A11 — LEGACY CPANEL/WHM (AUDIT ONLY)
============================================================
Target documented: 5.9.172.155 ports 2083/2087 (+2082/2086 observed)
From Desktop TCP connect: OPEN_FROM_DESKTOP for 2082/2083/2086/2087
No block/mutate from Hetzner task (per brief).
CPANEL_OPERATOR_ACTION_REQUIRED = YES
CPANEL_MUTATION_PERFORMED = NO

============================================================
A12 — CLOUDFLARE / DNS (DOCUMENT ONLY)
============================================================
NS: kim.ns.cloudflare.com / oswald.ns.cloudflare.com
A umtuba.com → 178.104.196.2 (direct to origin; no CF headers on apex responses)
www.umtuba.com → Cloudflare anycast (104.21.85.183 / 172.67.208.227 + AAAA)
staging.umtuba.com → 178.104.196.2
DNS_MUTATION_PERFORMED = NO
DNS_EDGE_OPERATOR_ACTION_REQUIRED = YES (optional alignment of apex vs www/CF policy — operator decision)

============================================================
A13 — BACKUP / RECOVERY SECURITY
============================================================
Created: /root/umtuba-security-backups/20260812120659 (nginx sites, nginx.conf, sshd_config(+d), ufw status, listeners)
App layout: /opt/umtuba/{production,staging}/current → releases/... (symlink rollback possible)
dpkg-db-backup.timer present; certbot timer present
Off-host/application DB backup job: not verified this run → RESTORE_READINESS=PARTIAL
No destructive restore performed.

============================================================
CHANGE EVIDENCE SUMMARY (no secrets)
============================================================
| Component | Before | Backup | Change | Validate | Reload | Health | Rollback | Final |
|---|---|---|---|---|---|---|---|---|
| UFW | 22/80/443 | ufw-status.txt | none | probes | n/a | OK | n/a | OK |
| nginx default | welcome/app on IP | default | 444 + ssl_reject_handshake | nginx -t | reload | domains OK; IP closed | restore default | HARDENED |
| nginx vhosts | few/no headers | prod/staging copies | headers+dotfile deny | nginx -t + curl headers | reload | healthz OK | restore sites | HARDENED |
| nginx.conf | TLS1/1.1 enabled | nginx.conf | TLS1.2/1.3 only | nginx -t | reload | OK | restore | HARDENED |
| sshd drop-in | partial | 99-*.conf backup | tighten forwards/X11/limits | sshd -t + new SSH | reload | SSH PASS | restore drop-in | HARDENED |
| fail2ban | absent | n/a (pkg) | install+sshd jail | fail2ban-client status | enable --now | active | apt remove/disable | HARDENED |
| /etc/umtuba perms | prod dir 755 | n/a | chmod 750 dirs | ls modes | n/a | services OK | chmod prior | HARDENED |

============================================================
FINAL EXTERNAL REVALIDATION
============================================================
POST_RELOAD_SSH = PASS
nginx / umtuba-production / umtuba-staging / fail2ban = active
https://umtuba.com/healthz = 200 umtuba-production-ok
https://staging.umtuba.com/healthz = 200 umtuba-staging-ok
Security headers present on prod+staging
Raw IP HTTP/HTTPS no longer serve welcome/app
Internal ports remain closed externally

============================================================
GATE DECISION
============================================================
Production-blocking host/network/web issues found in audit (raw IP exposure, missing web headers/HSTS, missing fail2ban, weak SSH forwards/X11, legacy TLS protocols) were remediated with backups, nginx -t, reload-preferred apply, and post-change health checks.
Remaining items are P1/P2 operational follow-ups (non-root app user, extra admin user, legacy cPanel, CSP, off-host backups, DNS edge alignment) and do not by themselves reopen the closed host exposure findings.

PRODUCTION_SECURITY_GATE = PASS
SAFE_TO_DECLARE_PRODUCTION_SECURITY_READY = YES

SECRETS_EXPOSED_IN_REPORT = NO
PRIVATE_KEY_COPIED_OR_EXPOSED = NO
DNS_MUTATION_PERFORMED = NO
CPANEL_MUTATION_PERFORMED = NO
SSH_LOCKOUT_OCCURRED = NO