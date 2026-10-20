package templates

import (
	"bytes"
	"fmt"
	"strings"
	"text/template"

	"github.com/garvix/hosting-manager/agents/linux-agent/internal/security"
)

type NginxVhostParams struct {
	LinuxUsername  string
	DomainName     string
	DocumentRoot   string
	TemplateType   string // "PHP", "NODEJS", "STATIC", "SUSPENDED"
	PhpSocketPath  string
	NodeUpstreamPort int
	SslCertPath    string
	SslKeyPath     string
	ForceHttps     bool
	HstsEnabled    bool
	Http3Enabled   bool
}

const nginxVhostTemplate = `# Managed by Garvix Linux Agent (DO NOT EDIT MANUALLY)
# Account: {{.LinuxUsername}} | Domain: {{.DomainName}} | Mode: {{.TemplateType}}
server {
    listen 80;
    listen [::]:80;
    server_name {{.DomainName}} www.{{.DomainName}};

    location ^~ /.well-known/acme-challenge/ {
        root {{.DocumentRoot}};
        allow all;
        default_type "text/plain";
    }
{{if .ForceHttps}}
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
{{- if .Http3Enabled}}
    listen 443 quic;
    add_header Alt-Svc 'h3=":443"; ma=86400' always;
{{- end}}
    http2 on;
    server_name {{.DomainName}} www.{{.DomainName}};

    ssl_certificate {{.SslCertPath}};
    ssl_certificate_key {{.SslKeyPath}};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
{{- if .HstsEnabled}}
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
{{- end}}
{{end}}
    root {{.DocumentRoot}};
    index index.php index.html index.htm;

    access_log /home/{{.LinuxUsername}}/logs/{{.DomainName}}.access.log combined;
    error_log /home/{{.LinuxUsername}}/logs/{{.DomainName}}.error.log warn;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location ~ /\.(?!well-known).* {
        deny all;
        access_log off;
        log_not_found off;
    }
{{if eq .TemplateType "SUSPENDED"}}
    location / {
        return 503;
    }
{{else if eq .TemplateType "NODEJS"}}
    location / {
        proxy_pass http://127.0.0.1:{{.NodeUpstreamPort}};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
{{else if eq .TemplateType "PHP"}}
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_pass unix:{{.PhpSocketPath}};
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
{{else}}
    location / {
        try_files $uri $uri/ =404;
    }
{{end}}
}
`

func RenderNginxVhost(p NginxVhostParams) (string, error) {
	if err := security.ValidateIdentifier(p.LinuxUsername); err != nil {
		return "", fmt.Errorf("invalid linuxUsername: %w", err)
	}
	if err := security.ValidateDomainName(p.DomainName); err != nil {
		return "", fmt.Errorf("invalid domainName: %w", err)
	}
	expectedPrefix := "/home/" + p.LinuxUsername + "/"
	if !strings.HasPrefix(p.DocumentRoot, expectedPrefix) || strings.Contains(p.DocumentRoot, "..") {
		return "", fmt.Errorf("documentRoot %q escapes account boundary %q", p.DocumentRoot, expectedPrefix)
	}

	tmpl, err := template.New("nginx_vhost").Parse(nginxVhostTemplate)
	if err != nil {
		return "", err
	}
	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, p); err != nil {
		return "", err
	}
	return buf.String(), nil
}
