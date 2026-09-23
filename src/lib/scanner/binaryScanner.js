const BINARY_CRYPTO_SIGNATURES = [
  // OpenSSL & Linux Shared Objects (.so)
  { pattern: /RSA_generate_key_ex|RSA_new|RSA_SignPSS|PKCS1_OAEP/i, name: 'OpenSSL RSA Asymmetric Engine', family: 'RSA', quantum: 'vulnerable', severity: 'critical', desc: 'Embedded OpenSSL RSA key generation & signing exports.' },
  { pattern: /EC_KEY_new_by_curve_name|secp256r1|prime256v1|ECDSA_do_sign/i, name: 'OpenSSL ECDSA / ECC Symbol', family: 'ECC', quantum: 'vulnerable', severity: 'critical', desc: 'Elliptic curve secp256r1 symbol identified in binary symbol table.' },
  { pattern: /EVP_des_ede3_cbc|DES_ede3_cbc_encrypt/i, name: 'Triple DES (3DES) Legacy Cipher', family: '3DES', quantum: 'vulnerable', severity: 'critical', desc: 'Deprecated symmetric 3DES cipher embedded in binary.' },
  { pattern: /EVP_sha1|SHA1_Init|SHA1_Update/i, name: 'SHA-1 Broken Digest Routine', family: 'SHA-1', quantum: 'vulnerable', severity: 'high', desc: 'Broken SHA-1 hashing symbol compiled into binary.' },
  { pattern: /AES_encrypt|EVP_aes_256_gcm|AES_set_encrypt_key/i, name: 'AES-256 Symmetric Cipher', family: 'AES', quantum: 'safe', severity: 'low', desc: 'Standard AES hardware/software implementation. Quantum-resistant.' },

  // Windows Executables (.exe / .dll)
  { pattern: /CryptAcquireContext|CryptCreateHash|CALG_RSA_SIGN/i, name: 'Windows CryptoAPI (CAPI) RSA', family: 'RSA', quantum: 'vulnerable', severity: 'critical', desc: 'Legacy Windows CryptoAPI RSA signature provider referenced.' },
  { pattern: /BCryptGenRandom|BCryptOpenAlgorithmProvider|BCRYPT_ECDSA_ALGORITHM/i, name: 'Windows CNG ECDSA Provider', family: 'ECC', quantum: 'vulnerable', severity: 'high', desc: 'Windows Cryptography Next Generation ECDSA algorithm handle.' },

  // Post-Quantum Standards
  { pattern: /X25519_MLKEM768|OQS_KEM_ml_kem_768|MLKEM768|Kyber768/i, name: 'NIST FIPS 203 ML-KEM-768 Binary Symbol', family: 'PQC', quantum: 'pqc_native', severity: 'info', desc: 'Post-quantum key encapsulation mechanism compiled into binary.' },
  { pattern: /ML_DSA_65|Dilithium3|OQS_SIG_ml_dsa_65/i, name: 'NIST FIPS 204 ML-DSA-65 Binary Symbol', family: 'PQC', quantum: 'pqc_native', severity: 'info', desc: 'Post-quantum lattice digital signature primitive active.' }
];

export async function scanBinaryFile(file, onProgress) {
  if (onProgress) onProgress(20, `Reading binary stream from ${file.name}...`);
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (onProgress) onProgress(40, `Extracting ASCII / UTF-8 string symbols (${(bytes.length / 1024).toFixed(1)} KB)...`);

  // Extract printable ASCII strings (minimum 4 characters)
  let strings = [];
  let current = '';
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte >= 32 && byte <= 126) {
      current += String.fromCharCode(byte);
    } else {
      if (current.length >= 4) {
        strings.push(current);
      }
      current = '';
    }
  }
  if (current.length >= 4) strings.push(current);

  const joinedText = strings.join('\n');
  if (onProgress) onProgress(75, `Correlating ${strings.length} extracted symbols against crypto primitives...`);

  const findings = [];
  BINARY_CRYPTO_SIGNATURES.forEach(sig => {
    const match = joinedText.match(sig.pattern);
    if (match) {
      findings.push({
        id: 'BIN-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        ruleId: `RULE-BIN-${sig.family}`,
        ruleName: sig.name,
        family: sig.family,
        quantumStatus: sig.quantum,
        severity: sig.severity,
        confidence: 0.97,
        category: 'Compiled Binary Symbol / Constant',
        line: 1,
        matchedText: match[0],
        snippet: `Symbol Offset Match: "${match[0]}" in binary text section`,
        fileName: file.name,
        description: sig.desc
      });
    }
  });

  if (onProgress) onProgress(100, `Binary inspection complete (${findings.length} findings)`);

  return {
    binaryName: file.name,
    fileSizeKB: (bytes.length / 1024).toFixed(1),
    extractedSymbolsCount: strings.length,
    findings
  };
}

export function getSampleBinaryFindings(binaryType = 'linux_so') {
  if (binaryType === 'linux_so') {
    return {
      binaryName: 'libcrypto.so.1.1.1w',
      fileSizeKB: '3420.5',
      extractedSymbolsCount: 8420,
      findings: [
        {
          id: 'BIN-SO-01', ruleId: 'RULE-BIN-RSA', ruleName: 'OpenSSL RSA Asymmetric Engine',
          family: 'RSA', quantumStatus: 'vulnerable', severity: 'critical', confidence: 0.98,
          category: 'Compiled Binary Symbol', line: 124, matchedText: 'RSA_generate_key_ex',
          snippet: 'Symbol export: RSA_generate_key_ex (0x0004a2c0)', fileName: 'libcrypto.so.1.1.1w',
          description: 'Shor-vulnerable RSA key generation routine exported in shared object.'
        },
        {
          id: 'BIN-SO-02', ruleId: 'RULE-BIN-ECC', ruleName: 'OpenSSL ECDSA / ECC Symbol',
          family: 'ECC', quantumStatus: 'vulnerable', severity: 'critical', confidence: 0.99,
          category: 'Compiled Binary Symbol', line: 450, matchedText: 'secp256r1',
          snippet: 'Built-in curve parameter set: secp256r1 / prime256v1', fileName: 'libcrypto.so.1.1.1w',
          description: 'Classical elliptic curve parameters hardcoded in binary data segment.'
        },
        {
          id: 'BIN-SO-03', ruleId: 'RULE-BIN-AES', ruleName: 'AES-256 Symmetric Cipher',
          family: 'AES', quantumStatus: 'safe', severity: 'low', confidence: 0.99,
          category: 'Compiled Binary Symbol', line: 890, matchedText: 'EVP_aes_256_gcm',
          snippet: 'AES-256-GCM cipher suite descriptor', fileName: 'libcrypto.so.1.1.1w',
          description: 'Quantum-resistant symmetric block cipher.'
        }
      ]
    };
  } else if (binaryType === 'windows_dll') {
    return {
      binaryName: 'auth_security_bridge.dll',
      fileSizeKB: '1840.2',
      extractedSymbolsCount: 4210,
      findings: [
        {
          id: 'BIN-DLL-01', ruleId: 'RULE-BIN-RSA', ruleName: 'Windows CryptoAPI (CAPI) RSA',
          family: 'RSA', quantumStatus: 'vulnerable', severity: 'critical', confidence: 0.97,
          category: 'Compiled Binary Symbol', line: 88, matchedText: 'CryptAcquireContext',
          snippet: 'Import symbol: ADVAPI32.dll!CryptAcquireContextW', fileName: 'auth_security_bridge.dll',
          description: 'Legacy Microsoft CryptoAPI RSA signature provider referenced.'
        },
        {
          id: 'BIN-DLL-02', ruleId: 'RULE-BIN-3DES', ruleName: 'Triple DES (3DES) Legacy Cipher',
          family: '3DES', quantumStatus: 'vulnerable', severity: 'critical', confidence: 0.99,
          category: 'Compiled Binary Symbol', line: 210, matchedText: 'DES_ede3_cbc_encrypt',
          snippet: 'Symbol reference: DES_ede3_cbc_encrypt', fileName: 'auth_security_bridge.dll',
          description: 'Deprecated symmetric 3DES cipher embedded in binary.'
        }
      ]
    };
  } else {
    // Firmware / embedded
    return {
      binaryName: 'edge_iot_gateway_firmware.bin',
      fileSizeKB: '8192.0',
      extractedSymbolsCount: 15400,
      findings: [
        {
          id: 'BIN-FW-01', ruleId: 'RULE-BIN-RSA', ruleName: 'Embedded RSA Bootloader Verification',
          family: 'RSA', quantumStatus: 'vulnerable', severity: 'critical', confidence: 0.99,
          category: 'Firmware Static Asset', line: 12, matchedText: 'RSA-2048-PKCS1-v1_5',
          snippet: 'Header offset 0x00000200: RSA-2048-PKCS1-v1_5 Public Key Manifest', fileName: 'edge_iot_gateway_firmware.bin',
          description: 'Firmware boot signature relies on Shor-vulnerable RSA-2048 public key.'
        },
        {
          id: 'BIN-FW-02', ruleId: 'RULE-BIN-PQC', ruleName: 'NIST FIPS 203 ML-KEM-768 Binary Symbol',
          family: 'PQC', quantumStatus: 'pqc_native', severity: 'info', confidence: 0.96,
          category: 'Firmware Static Asset', line: 550, matchedText: 'X25519_MLKEM768',
          snippet: 'TLS mTLS buffer: X25519_MLKEM768 hybrid key exchange handler', fileName: 'edge_iot_gateway_firmware.bin',
          description: 'Post-quantum key encapsulation mechanism compiled into firmware binary.'
        }
      ]
    };
  }
}
