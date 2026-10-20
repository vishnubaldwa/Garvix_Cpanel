package mail

import (
	"bytes"
	"fmt"
	"text/template"

	"github.com/garvix/hosting-manager/agents/linux-agent/internal/security"
)

type PostfixConfigParams struct {
	HostnameFqdn          string
	MaxAttachmentBytes    int
	SslCertPath           string
	SslKeyPath            string
	ApprovedRelayHost     string // Optional, e.g., "[smtp-relay.provider.example]:587"
	EnableIpv6            bool
}

const postfixMainCfTemplate = `# Managed by Garvix Linux Agent — Postfix Hardened Configuration (No Open Relay)
myhostname = {{.HostnameFqdn}}
myorigin = $myhostname
inet_interfaces = all
inet_protocols = {{if .EnableIpv6}}all{{else}}ipv4{{end}}
mydestination = localhost
mynetworks = 127.0.0.0/8{{if .EnableIpv6}} [::1]/128{{end}}

# Strict Open-Relay Prevention & Authenticated Sender Ownership Enforcement
smtpd_relay_restrictions = permit_mynetworks, permit_sasl_authenticated, reject_unauth_destination
smtpd_sender_restrictions = reject_non_fqdn_sender, reject_unknown_sender_domain, reject_authenticated_sender_login_mismatch, permit_sasl_authenticated, reject_unauth_destination
smtpd_recipient_restrictions = permit_mynetworks, permit_sasl_authenticated, reject_unauth_destination, reject_non_fqdn_recipient, reject_unknown_recipient_domain

# Mandatory TLS on Submission & Opportunistic TLS on Inbound Port 25
smtpd_tls_cert_file = {{.SslCertPath}}
smtpd_tls_key_file = {{.SslKeyPath}}
smtpd_tls_security_level = may
smtpd_tls_auth_only = yes
smtpd_tls_mandatory_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
smtpd_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
smtp_tls_security_level = may
smtp_tls_mandatory_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1

# Dovecot SASL & LMTP Delivery
smtpd_sasl_type = dovecot
smtpd_sasl_path = private/auth
smtpd_sasl_auth_enable = yes
virtual_transport = lmtp:unix:private/dovecot-lmtp

# Rspamd Milter Integration (DKIM Signing, Spam Filtering & Rate Limiting)
smtpd_milters = inet:127.0.0.1:11332
non_smtpd_milters = inet:127.0.0.1:11332
milter_protocol = 6
milter_mail_macros = i {mail_addr} {client_addr} {client_name} {auth_authen}
milter_default_action = accept

message_size_limit = {{.MaxAttachmentBytes}}
disable_vrfy_command = yes
smtpd_helo_required = yes
{{if .ApprovedRelayHost}}
relayhost = {{.ApprovedRelayHost}}
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = lmdb:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous
{{end}}
`

func RenderPostfixMainCf(p PostfixConfigParams) (string, error) {
	if err := security.ValidateDomainName(p.HostnameFqdn); err != nil {
		return "", fmt.Errorf("invalid mail server hostname FQDN: %w", err)
	}
	if p.MaxAttachmentBytes < 1048576 || p.MaxAttachmentBytes > 104857600 {
		return "", fmt.Errorf("maxAttachmentBytes (%d) must be between 1 MB and 100 MB", p.MaxAttachmentBytes)
	}
	tmpl, err := template.New("postfix_main_cf").Parse(postfixMainCfTemplate)
	if err != nil {
		return "", err
	}
	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, p); err != nil {
		return "", err
	}
	return buf.String(), nil
}
