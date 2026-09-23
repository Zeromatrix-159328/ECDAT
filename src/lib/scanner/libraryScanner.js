export const KNOWN_CRYPTO_LIBRARIES = [
  // Python
  { name: 'cryptography', ecosystem: 'Python', quantum: 'vulnerable', defaultAlgo: 'RSA / ECDSA / AES', severity: 'high', rec: 'Upgrade to PQC-enabled provider or wrap with ML-KEM/ML-DSA bindings.' },
  { name: 'pycryptodome', ecosystem: 'Python', quantum: 'vulnerable', defaultAlgo: 'RSA-2048 / 3DES / AES', severity: 'critical', rec: 'Replace legacy cipher modes with post-quantum lattice primitives.' },
  { name: 'pyjwt', ecosystem: 'Python', quantum: 'vulnerable', defaultAlgo: 'RS256 / ES256', severity: 'critical', rec: 'Migrate JWT signing from ES256 to ML-DSA-65.' },
  { name: 'paramiko', ecosystem: 'Python', quantum: 'vulnerable', defaultAlgo: 'SSH RSA / ECDSA Host Keys', severity: 'high', rec: 'Enable OpenSSH post-quantum key exchange (sntrup761x25519-sha512).' },

  // Node.js
  { name: 'jsonwebtoken', ecosystem: 'Node.js', quantum: 'vulnerable', defaultAlgo: 'RS256 / HS256', severity: 'critical', rec: 'Adopt ML-DSA-65 composite tokens for API authentication.' },
  { name: 'jose', ecosystem: 'Node.js', quantum: 'vulnerable', defaultAlgo: 'ECDSA / ECDH P-256', severity: 'high', rec: 'Transition to NIST FIPS 203 ML-KEM encapsulation.' },
  { name: 'node-forge', ecosystem: 'Node.js', quantum: 'vulnerable', defaultAlgo: 'RSA PKCS#1 v1.5', severity: 'critical', rec: 'Deprecate RSA PKCS#1 v1.5 in favor of quantum-safe KEM.' },
  { name: 'elliptic', ecosystem: 'Node.js', quantum: 'vulnerable', defaultAlgo: 'secp256k1 / P-256', severity: 'critical', rec: 'Shor-vulnerable elliptic curve. Migrate to lattice signature schemes.' },
  { name: 'bcrypt', ecosystem: 'Node.js', quantum: 'safe', defaultAlgo: 'Blowfish KDF', severity: 'low', rec: 'Password hashing retains quantum resistance against preimage attacks.' },

  // Java
  { name: 'org.bouncycastle:bcprov-jdk18on', ecosystem: 'Java', quantum: 'pqc_native', defaultAlgo: 'ML-KEM / ML-DSA / Dilithium / Kyber', severity: 'info', rec: 'Bouncy Castle PQC extension active. Standardized NIST algorithms enabled.' },
  { name: 'org.bouncycastle:bcprov-jdk15on', ecosystem: 'Java', quantum: 'vulnerable', defaultAlgo: 'RSA / ECC Legacy', severity: 'high', rec: 'Upgrade to Bouncy Castle 1.78+ with FIPS 203/204 support.' },
  { name: 'com.google.crypto.tink:tink', ecosystem: 'Java', quantum: 'vulnerable', defaultAlgo: 'ECDSA / Ed25519 / AES-GCM', severity: 'medium', rec: 'Enable Tink hybrid post-quantum key encapsulation.' },
  { name: 'io.jsonwebtoken:jjwt-api', ecosystem: 'Java', quantum: 'vulnerable', defaultAlgo: 'RS256 / ES384', severity: 'high', rec: 'Transition token signing algorithms to quantum-resistant schemes.' },

  // Go
  { name: 'golang.org/x/crypto', ecosystem: 'Go', quantum: 'vulnerable', defaultAlgo: 'Curve25519 / RSA / ChaCha20', severity: 'medium', rec: 'Use Go 1.24+ crypto/tls with X25519MLKEM768 enabled by default.' },
  { name: 'github.com/golang-jwt/jwt', ecosystem: 'Go', quantum: 'vulnerable', defaultAlgo: 'ES256 / RS256', severity: 'critical', rec: 'Implement dual-signature validation with ML-DSA.' },
  { name: 'github.com/cloudflare/circl', ecosystem: 'Go', quantum: 'pqc_native', defaultAlgo: 'ML-KEM-768 / Kyber / Dilithium', severity: 'info', rec: 'Cloudflare CIRCL post-quantum cryptographic primitives active.' },

  // C / Native
  { name: 'openssl', ecosystem: 'C/C++', quantum: 'vulnerable', defaultAlgo: 'TLS 1.2 / RSA-2048 / ECDHE', severity: 'critical', rec: 'Upgrade to OpenSSL 3.3+ with oqsprovider for NIST PQC support.' },
  { name: 'liboqs', ecosystem: 'C/C++', quantum: 'pqc_native', defaultAlgo: 'NIST Level 1/3/5 PQC Suite', severity: 'info', rec: 'Open Quantum Safe library detected. Fully quantum-resistant.' }
];

export function scanLibraryManifest(manifestText, manifestType = 'auto') {
  if (!manifestText) return [];
  const findings = [];
  const lines = manifestText.split(/\r?\n/);

  // Normalize search lines
  KNOWN_CRYPTO_LIBRARIES.forEach(lib => {
    lines.forEach((line, idx) => {
      // Check if line contains library name
      if (line.toLowerCase().includes(lib.name.toLowerCase())) {
        findings.push({
          id: 'LIB-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
          ruleId: `RULE-LIB-${lib.ecosystem.toUpperCase()}`,
          ruleName: `Crypto Library: ${lib.name}`,
          family: lib.ecosystem,
          quantumStatus: lib.quantum,
          severity: lib.severity,
          confidence: 0.99,
          category: 'Cryptographic Library Dependency',
          line: idx + 1,
          matchedText: lib.name,
          snippet: line.trim(),
          fileName: manifestType !== 'auto' ? manifestType : 'manifest.lock',
          defaultAlgo: lib.defaultAlgo,
          recommendation: lib.rec
        });
      }
    });
  });

  return findings;
}
