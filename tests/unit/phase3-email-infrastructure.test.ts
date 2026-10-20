import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  analyzeSmtpDeliveryDiagnostic,
  buildDmarcRecordWizard,
  buildSpfRecordWizard,
  compileEmailStackConfigurations,
  EmailInfrastructureManager,
  generateDkimKeyPairAndDnsRecord,
  renderDovecotSieveAutoresponder,
  validateNoOpenRelayConfig,
} from '@garvix/local-panel-api';

describe('Phase 3 — Email Infrastructure, Deliverability & Abuse-Resistance Suite', () => {
  let sandboxRoot: string;

  beforeEach(() => {
    sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'garvix-email-phase3-'));
  });

  afterEach(() => {
    fs.rmSync(sandboxRoot, { recursive: true, force: true });
  });

  it('compiles hardened Postfix, Dovecot, Rspamd, and Roundcube configs and blocks open-relay misconfigurations', () => {
    const stack = compileEmailStackConfigurations({
      mailHostnameFqdn: 'mail.acmecorp.example',
      maxAttachmentMb: 25,
      sslCertPath: '/etc/garvix/ssl/mail.acmecorp.example/fullchain.pem',
      sslKeyPath: '/etc/garvix/ssl/mail.acmecorp.example/privkey.pem',
      approvedSmtpRelayHost: '[smtp-relay.sendgrid.net]:587',
      enableIpv6: true,
    });

    const relayCheck = validateNoOpenRelayConfig(stack.postfixMainCf);
    expect(relayCheck.valid).toBe(true);
    expect(stack.postfixMainCf).toContain('reject_authenticated_sender_login_mismatch');
    expect(stack.postfixMainCf).toContain('relayhost = [smtp-relay.sendgrid.net]:587');
    expect(stack.dovecotConf).toContain('ssl_min_protocol = TLSv1.2');
    expect(stack.roundcubeConfigPhp).toContain("ssl://mail.acmecorp.example:993");

    // Verify open-relay detector catches insecure Postfix config
    const insecurePostfix = stack.postfixMainCf
      .replace('reject_unauth_destination', '')
      .replace('127.0.0.0/8', '0.0.0.0/0');
    const brokenCheck = validateNoOpenRelayConfig(insecurePostfix);
    expect(brokenCheck.valid).toBe(false);
    expect(brokenCheck.errors.some((e) => e.includes('CRITICAL_OPEN_RELAY'))).toBe(true);
  });

  it('generates real 2048-bit RSA and Ed25519 DKIM keys with 0600 permissions and validates SPF/DMARC wizards', () => {
    const rsaDkim = generateDkimKeyPairAndDnsRecord({
      sandboxRoot,
      domainName: 'acmecorp.example',
      selector: 'gv2026rsa',
      algorithm: 'RSA_2048',
    });
    expect(rsaDkim.privateKeyModeOctal).toBe('0600');
    expect(rsaDkim.dnsRecordName).toBe('gv2026rsa._domainkey');
    expect(rsaDkim.dnsTxtValue).toMatch(/^v=DKIM1; k=rsa; p=[A-Za-z0-9+/=]+$/);

    const edDkim = generateDkimKeyPairAndDnsRecord({
      sandboxRoot,
      domainName: 'acmecorp.example',
      selector: 'gv2026ed',
      algorithm: 'ED25519',
    });
    expect(edDkim.privateKeyModeOctal).toBe('0600');
    expect(edDkim.dnsTxtValue).toMatch(/^v=DKIM1; k=ed25519; p=[A-Za-z0-9+/=]+$/);

    // SPF Wizard & RFC 7208 10-DNS-lookup limit check
    const spf = buildSpfRecordWizard({
      domainName: 'acmecorp.example',
      ipv4Addresses: ['198.51.100.42'],
      ipv6Addresses: ['2001:db8::42'],
      includeMx: true,
      includeA: true,
      externalIncludeDomains: ['spf.protection.outlook.com'],
      policy: 'HARD_FAIL_ALL',
    });
    expect(spf.withinRfc7208Limit).toBe(true);
    expect(spf.txtValue).toBe(
      'v=spf1 a mx ip4:198.51.100.42 ip6:2001:db8::42 include:spf.protection.outlook.com -all'
    );

    expect(() =>
      buildSpfRecordWizard({
        domainName: 'acmecorp.example',
        ipv4Addresses: ['198.51.100.42'],
        includeMx: true,
        includeA: true,
        externalIncludeDomains: [
          'inc1.example.com',
          'inc2.example.com',
          'inc3.example.com',
          'inc4.example.com',
          'inc5.example.com',
        ],
        policy: 'HARD_FAIL_ALL',
      })
    ).toThrow(/SPF_LOOKUP_LIMIT_EXCEEDED/);

    // DMARC Wizard
    const dmarc = buildDmarcRecordWizard({
      domainName: 'acmecorp.example',
      policy: 'quarantine',
      subdomainPolicy: 'reject',
      percentage: 100,
      aggregateReportEmail: 'dmarc-reports@acmecorp.example',
      dkimAlignment: 's',
      spfAlignment: 's',
    });
    expect(dmarc.txtValue).toBe(
      'v=DMARC1; p=quarantine; sp=reject; pct=100; rua=mailto:dmarc-reports@acmecorp.example; adkim=s; aspf=s'
    );
  });

  it('enforces anti-open-relay, sender login match, hourly rate limits, bounce-spike auto-suspension, and SASL brute-force lockouts', () => {
    const manager = new EmailInfrastructureManager(sandboxRoot);

    manager.createMailbox({
      accountId: 'acc_acme_prod',
      linuxUsername: 'acmeprod',
      domainName: 'acmecorp.example',
      localPart: 'sales',
      password: 'SalesStrongPassword#2026',
      quotaMb: 2048,
      hourlySendLimit: 25,
    });

    // 1. Reject unauthenticated open-relay attempt to external domain
    const openRelayAttempt = manager.evaluateOutboundSubmission({
      authenticatedUser: null,
      envelopeFrom: 'spammer@foreign.example',
      recipientAddress: 'victim@gmail.com',
      sizeBytes: 2048,
    });
    expect(openRelayAttempt.allowed).toBe(false);
    expect(openRelayAttempt.code).toBe('OPEN_RELAY_REJECTED_UNAUTH_DESTINATION');

    // 2. Reject cross-user sender spoofing
    const spoofAttempt = manager.evaluateOutboundSubmission({
      authenticatedUser: 'sales@acmecorp.example',
      envelopeFrom: 'ceo@acmecorp.example',
      recipientAddress: 'partner@client.example',
      sizeBytes: 2048,
    });
    expect(spoofAttempt.allowed).toBe(false);
    expect(spoofAttempt.code).toBe('SENDER_LOGIN_MISMATCH_BLOCKED');

    // 3. Trigger bounce-spike auto-suspension (> 15% bounces across 20 messages)
    for (let i = 0; i < 20; i++) {
      const res = manager.evaluateOutboundSubmission({
        authenticatedUser: 'sales@acmecorp.example',
        envelopeFrom: 'sales@acmecorp.example',
        recipientAddress: `recipient${i}@client.example`,
        sizeBytes: 4096,
        simulatedBounce: i < 5, // 5/20 = 25% bounce rate
      });
      if (i === 19) {
        expect(res.allowed).toBe(false);
        expect(res.code).toBe('AUTO_SUSPENDED_BOUNCE_SPIKE');
      }
    }
    expect(manager.getSecurityAlerts().some((a) => a.includes('Auto-suspended mailbox'))).toBe(
      true
    );

    // 4. SASL brute-force protection locks IP after 5 failed attempts
    for (let i = 0; i < 5; i++) {
      const auth = manager.authenticateSasl({
        emailAddress: 'sales@acmecorp.example',
        password: 'WrongPassword',
        clientIp: '203.0.113.200',
      });
      expect(auth.authenticated).toBe(false);
    }
    const lockedAttempt = manager.authenticateSasl({
      emailAddress: 'sales@acmecorp.example',
      password: 'SalesStrongPassword#2026',
      clientIp: '203.0.113.200',
    });
    expect(lockedAttempt.authenticated).toBe(false);
    expect(lockedAttempt.reason).toContain('SASL_IP_LOCKED_BRUTE_FORCE');
  });

  it('prevents circular forwarding loops, renders Sieve autoresponders, diagnoses SMTP bounces, and verifies mailbox backup restore', () => {
    const manager = new EmailInfrastructureManager(sandboxRoot);
    manager.createMailbox({
      accountId: 'acc_acme_prod',
      linuxUsername: 'acmeprod',
      domainName: 'acmecorp.example',
      localPart: 'support',
      password: 'SupportPassword#2026',
      quotaMb: 4096,
    });

    manager.createForwarder({
      sourceAddress: 'help@acmecorp.example',
      destinationAddresses: ['support@acmecorp.example'],
    });

    expect(() =>
      manager.createForwarder({
        sourceAddress: 'support@acmecorp.example',
        destinationAddresses: ['help@acmecorp.example'],
      })
    ).toThrow(/FORWARDER_LOOP_DETECTED/);

    const sieve = renderDovecotSieveAutoresponder({
      emailAddress: 'support@acmecorp.example',
      subject: 'We received your ticket',
      bodyText: 'Our engineering support team will respond within 4 hours.',
    });
    expect(sieve).toContain(':subject "We received your ticket"');

    // Diagnose port 25 timeout & DMARC 5.7.26 rejection
    const port25Diag = analyzeSmtpDeliveryDiagnostic(
      'connect to gmail-smtp-in.l.google.com[142.250.4.27]:25: Operation timed out'
    );
    expect(port25Diag.category).toBe('PORT_25_BLOCKED_BY_PROVIDER');

    const dmarcDiag = analyzeSmtpDeliveryDiagnostic(
      '550 5.7.26 This mail has been blocked because the sender is unauthenticated (DMARC policy)'
    );
    expect(dmarcDiag.category).toBe('AUTHENTICATION_POLICY_SPF_DKIM_DMARC');

    // Backup & automated restore verification
    const backup = manager.backupAndVerifyMailboxRestore('support@acmecorp.example');
    expect(backup.status).toBe('VERIFIED');
    expect(backup.verifiedRestoreAtIso).not.toBeNull();
  });
});
