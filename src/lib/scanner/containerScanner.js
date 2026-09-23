export const SAMPLE_CONTAINER_PROFILES = {
  'envoy-edge': {
    image: 'envoyproxy/envoy:v1.28-distroless',
    base: 'Distroless (Debian 12)',
    layers: 6,
    packagesCount: 42,
    findings: [
      {
        id: 'CONT-ENV-01', ruleId: 'RULE-CONT-TLS', ruleName: 'TLS 1.2 RSA / ECDSA Ingress Listener',
        family: 'TLS/RSA', quantumStatus: 'vulnerable', severity: 'critical', confidence: 0.98,
        category: 'Container Ingress Configuration', line: 18, matchedText: 'ECDHE-RSA-AES128-GCM-SHA256',
        snippet: 'envoy.yaml: tls_certificates [RSA-2048 wildcard certificate]', fileName: '/etc/envoy/envoy.yaml',
        recommendation: 'Configure envoy with BoringSSL X25519MLKEM768 curves in tls_params.'
      },
      {
        id: 'CONT-ENV-02', ruleId: 'RULE-CONT-PQC', ruleName: 'BoringSSL Post-Quantum Hybrid Listener',
        family: 'PQC', quantumStatus: 'pqc_native', severity: 'info', confidence: 0.99,
        category: 'Container Crypto Engine', line: 32, matchedText: 'X25519MLKEM768',
        snippet: 'tls_params: ecdh_curves: ["X25519MLKEM768", "X25519"]', fileName: '/etc/envoy/envoy.yaml',
        recommendation: 'NIST standardized hybrid PQC key encapsulation active in container.'
      }
    ]
  },
  'nginx-legacy': {
    image: 'nginx:1.24-alpine',
    base: 'Alpine Linux 3.18',
    layers: 4,
    packagesCount: 38,
    findings: [
      {
        id: 'CONT-NGX-01', ruleId: 'RULE-CONT-OPENSSL', ruleName: 'Legacy OpenSSL 3.0 Container Package',
        family: 'OpenSSL', quantumStatus: 'vulnerable', severity: 'critical', confidence: 0.99,
        category: 'Container System Package', line: 5, matchedText: 'openssl-3.1.2-r0',
        snippet: 'apk info: openssl-3.1.2-r0 [Default ciphers include classical RSA/ECDSA]', fileName: '/lib/libcrypto.so.3',
        recommendation: 'Mount oqsprovider or rebuild base image with OpenSSL 3.3+ PQC patch.'
      },
      {
        id: 'CONT-NGX-02', ruleId: 'RULE-CONT-CIPHER', ruleName: 'Depreciated CBC / 3DES Ciphers Allowed',
        family: '3DES', quantumStatus: 'vulnerable', severity: 'high', confidence: 0.95,
        category: 'Container Ingress Configuration', line: 44, matchedText: 'ssl_ciphers HIGH:!aNULL:!MD5',
        snippet: 'nginx.conf: ssl_protocols TLSv1.2 TLSv1.3', fileName: '/etc/nginx/nginx.conf',
        recommendation: 'Enforce modern TLS 1.3 only cipher suites.'
      }
    ]
  },
  'postgres-db': {
    image: 'postgres:16.1-bullseye',
    base: 'Debian Bullseye',
    layers: 8,
    packagesCount: 114,
    findings: [
      {
        id: 'CONT-PG-01', ruleId: 'RULE-CONT-SSL', ruleName: 'PostgreSQL Server SSL Authentication',
        family: 'RSA', quantumStatus: 'vulnerable', severity: 'high', confidence: 0.97,
        category: 'Database TLS Engine', line: 62, matchedText: 'ssl = on, ssl_cert_file = server.crt',
        snippet: 'postgresql.conf: ssl_cert uses 2048-bit RSA host certificate', fileName: '/var/lib/postgresql/data/postgresql.conf',
        recommendation: 'Upgrade database connection certificates to ML-DSA-65 or hybrid certificates.'
      }
    ]
  }
};

export function scanDockerfile(dockerfileText) {
  if (!dockerfileText) return [];
  const findings = [];
  const lines = dockerfileText.split(/\r?\n/);

  lines.forEach((line, idx) => {
    // Check base images
    if (/^FROM\s+.*openssl/i.test(line) || /^FROM\s+.*(?:alpine|debian|ubuntu):?(?:18|20|3\.1[0-4])/i.test(line)) {
      findings.push({
        id: 'CONT-DKR-' + (idx + 1),
        ruleId: 'RULE-DKR-BASE',
        ruleName: 'Legacy Container Base Image',
        family: 'Container Base',
        quantumStatus: 'vulnerable',
        severity: 'high',
        confidence: 0.95,
        category: 'Container Image Specification',
        line: idx + 1,
        matchedText: line.trim(),
        snippet: line.trim(),
        fileName: 'Dockerfile',
        recommendation: 'Upgrade to modern PQC-ready base container image (e.g. Wolfi or Chainguard).'
      });
    }

    // Check package installs
    if (/apt-get\s+install.*(?:openssl|libssl1|crypto)/i.test(line) || /apk\s+add.*openssl/i.test(line)) {
      findings.push({
        id: 'CONT-DKR-PKG-' + (idx + 1),
        ruleId: 'RULE-DKR-PKG',
        ruleName: 'Crypto Library Package Installation',
        family: 'Container Package',
        quantumStatus: 'vulnerable',
        severity: 'medium',
        confidence: 0.98,
        category: 'Container Package Dependency',
        line: idx + 1,
        matchedText: line.trim(),
        snippet: line.trim(),
        fileName: 'Dockerfile',
        recommendation: 'Verify installed OpenSSL version supports post-quantum key encapsulation.'
      });
    }

    // Check certificates
    if (/COPY.*\.crt|COPY.*\.pem|COPY.*\.key/i.test(line)) {
      findings.push({
        id: 'CONT-DKR-CERT-' + (idx + 1),
        ruleId: 'RULE-DKR-CERT',
        ruleName: 'Embedded Static Cryptographic Key/Certificate',
        family: 'Certificates',
        quantumStatus: 'vulnerable',
        severity: 'critical',
        confidence: 0.99,
        category: 'Container Static Asset',
        line: idx + 1,
        matchedText: line.trim(),
        snippet: line.trim(),
        fileName: 'Dockerfile',
        recommendation: 'Static keys in container images pose Harvest Now, Decrypt Later (HNDL) risk.'
      });
    }
  });

  return findings;
}

export function scanContainerImageRef(imageRef) {
  const refLower = (imageRef || '').toLowerCase();
  
  if (refLower.includes('envoy')) {
    return SAMPLE_CONTAINER_PROFILES['envoy-edge'];
  } else if (refLower.includes('nginx')) {
    return SAMPLE_CONTAINER_PROFILES['nginx-legacy'];
  } else if (refLower.includes('postgres') || refLower.includes('db') || refLower.includes('sql')) {
    return SAMPLE_CONTAINER_PROFILES['postgres-db'];
  } else {
    // Generate synthetic realistic findings for any container reference
    const name = imageRef.split('/').pop() || 'custom-container';
    return {
      image: imageRef,
      base: 'Linux Container Image',
      layers: 5,
      packagesCount: 56,
      findings: [
        {
          id: 'CONT-GEN-01', ruleId: 'RULE-CONT-LIBSSL', ruleName: 'Container Runtime libssl Package',
          family: 'OpenSSL', quantumStatus: 'vulnerable', severity: 'critical', confidence: 0.98,
          category: 'Container System Package', line: 1, matchedText: 'libssl.so.3 / RSA-2048',
          snippet: `/usr/lib/libssl.so: Default TLS transport uses RSA/ECDHE cipher suites`,
          fileName: `${name}:latest`,
          recommendation: 'Verify container TLS endpoints enforce NIST FIPS 203/204 hybrid cipher suites.'
        },
        {
          id: 'CONT-GEN-02', ruleId: 'RULE-CONT-AES', ruleName: 'Container Cryptographic Provider AES-256',
          family: 'AES', quantumStatus: 'safe', severity: 'low', confidence: 0.99,
          category: 'Container System Package', line: 1, matchedText: 'AES-256-GCM',
          snippet: `/usr/lib/libcrypto.so: AES-256-GCM hardware accelerated cipher`,
          fileName: `${name}:latest`,
          recommendation: 'Symmetric encryption retains quantum resistance.'
        }
      ]
    };
  }
}
