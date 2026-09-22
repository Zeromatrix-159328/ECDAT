import { useState, useRef } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ProgressBar from '../../components/ui/ProgressBar';
import { scanText } from '../../lib/scanner/scanText';
import { scanZipArchive, scanGitRepository } from '../../lib/scanner/archiveScanner';
import { useCryptoAssets } from '../../hooks/useCryptoAssets';
import { useToast } from '../../components/ui/Toast';
import { 
  Play, Sparkles, Copy, Trash2, Upload, Plus, CheckCircle2, 
  ArrowRight, GitBranch, FileArchive, Code2, FolderGit2, FileText, 
  Layers, Search, AlertTriangle, ShieldCheck, CheckCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SAMPLES = {
  go_rsa: `// Go Checkout Signer
func SignTransaction(payload []byte, privKey *rsa.PrivateKey) ([]byte, error) {
    hashed := sha256.Sum256(payload)
    opts := &rsa.PSSOptions{
        SaltLength: rsa.PSSSaltLengthEqualsHash,
        Hash:       crypto.SHA256,
    }
    return rsa.SignPSS(rand.Reader, privKey, crypto.SHA256, hashed[:], opts)
}`,
  python_jwt: `# Python OAuth2 JWT Signer
def generate_jwt_token(claims: dict, ec_key: EllipticCurvePrivateKey) -> str:
    header = {'alg': 'ES256', 'typ': 'JWT'}
    return jwt.encode(
        claims,
        ec_key,
        algorithm='ES256',
        headers=header
    )`,
  java_aes: `// Java Ledger Block Encryption
public byte[] encryptLedgerBlock(byte[] plaintext, SecretKey key, byte[] iv) throws Exception {
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    GCMParameterSpec spec = new GCMParameterSpec(128, iv);
    cipher.init(Cipher.ENCRYPT_MODE, key, spec);
    return cipher.doFinal(plaintext);
}`,
  pqc_hybrid: `// Post-Quantum TLS 1.3 Key Encapsulation
func setupPQCHandshake(conn *tls.Conn) {
    conn.SetSupportedCurves([]tls.CurveID{
        tls.X25519MLKEM768, // Hybrid NIST FIPS 203
        tls.CurveP256,
    })
}`,
  c_openssl: `// C/C++ OpenSSL RSA Signing Routine
int sign_payload(const unsigned char *msg, size_t msglen, unsigned char **sig, size_t *siglen, EVP_PKEY *pkey) {
    EVP_MD_CTX *ctx = EVP_MD_CTX_new();
    EVP_DigestSignInit(ctx, NULL, EVP_sha256(), NULL, pkey);
    EVP_DigestSignUpdate(ctx, msg, msglen);
    EVP_DigestSignFinal(ctx, *sig, siglen);
    EVP_MD_CTX_free(ctx);
    return 1;
}`
};

export default function DemoScannerPage() {
  const [scanMode, setScanMode] = useState('snippet'); // 'snippet' | 'git' | 'zip'

  // Snippet state
  const [code, setCode] = useState(SAMPLES.go_rsa);

  // Git state
  const [repoUrl, setRepoUrl] = useState('https://github.com/Zeromatrix-159328/ECDAT');
  const [branch, setBranch] = useState('main');

  // ZIP state
  const [zipFileName, setZipFileName] = useState('');
  const [zipStats, setZipStats] = useState(null);

  // General Scan & Findings state
  const [findings, setFindings] = useState(() => scanText(SAMPLES.go_rsa, 'go_checkout.go'));
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');

  const fileInputRef = useRef(null);
  const zipInputRef = useRef(null);

  const toast = useToast();
  const navigate = useNavigate();
  const { addAsset } = useCryptoAssets();

  // Handle snippet scan
  const handleScanSnippet = () => {
    setIsScanning(true);
    setScanProgress(30);
    setStatusMessage('Scanning raw source text...');
    setTimeout(() => {
      const res = scanText(code, 'source_snippet.txt');
      setFindings(res);
      setIsScanning(false);
      setScanProgress(100);
      setStatusMessage('');
      toast.success(`Scan completed: detected ${res.length} cryptographic pattern${res.length === 1 ? '' : 's'}`);
    }, 300);
  };

  // Handle Git repo scan
  const handleScanGitRepo = async () => {
    if (!repoUrl.trim()) {
      toast.error('Please enter a GitHub repository URL');
      return;
    }
    setIsScanning(true);
    setScanProgress(10);
    setStatusMessage('Connecting to repository...');

    try {
      const res = await scanGitRepository(repoUrl, branch, (pct, msg) => {
        setScanProgress(pct);
        setStatusMessage(msg);
      });
      setFindings(res.findings);
      toast.success(`Repository scan completed: found ${res.findings.length} cryptographic pattern(s) across ${res.inspectedFiles} files!`);
      if (res.notice) {
        toast.info(res.notice);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to scan repository');
    } finally {
      setIsScanning(false);
      setStatusMessage('');
    }
  };

  // Handle ZIP file upload and scan
  const handleZipUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setZipFileName(file.name);
    setIsScanning(true);
    setScanProgress(5);
    setStatusMessage(`Unpacking ${file.name}...`);

    try {
      const res = await scanZipArchive(file, (pct, currentFile) => {
        setScanProgress(pct);
        setStatusMessage(`Scanning ${currentFile || ''}...`);
      });

      setZipStats(res);
      setFindings(res.findings);
      toast.success(`ZIP scan complete! Inspected ${res.scannedCodeFiles} code files, found ${res.findings.length} cryptographic finding(s).`);
    } catch (err) {
      toast.error('Failed to unpack and scan ZIP archive: ' + err.message);
    } finally {
      setIsScanning(false);
      setStatusMessage('');
      e.target.value = '';
    }
  };

  const handleLoadSample = (sampleKey, sampleName) => {
    setCode(SAMPLES[sampleKey]);
    const res = scanText(SAMPLES[sampleKey], `${sampleKey}.txt`);
    setFindings(res);
    toast.info(`Loaded ${sampleName} preset snippet`);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success('Source code snippet copied to clipboard');
  };

  const handleClearCode = () => {
    setCode('');
    setFindings([]);
    toast.info('Code editor cleared');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result || '';
      setCode(content);
      const res = scanText(content, file.name);
      setFindings(res);
      toast.success(`Uploaded and scanned ${file.name} (${res.length} findings)`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAddFindingToCBOM = (finding) => {
    const newId = 'CRYPTO-' + Math.floor(10000 + Math.random() * 90000);
    const newAsset = {
      id: newId,
      assetType: 'algorithm',
      algorithm: {
        family: finding.family,
        name: finding.ruleName,
        variant: finding.matchedText,
        keySize: finding.family === 'RSA' ? 2048 : finding.family === 'ECC' ? 256 : 256
      },
      usage: {
        purpose: finding.family === 'RSA' || finding.family === 'ECC' ? 'digital_signature' : 'symmetric_encryption'
      },
      context: {
        applicationId: 'APP-SCAN',
        applicationName: scanMode === 'git' ? repoUrl.split('/').pop() || 'Git Repo' : scanMode === 'zip' ? zipFileName || 'ZIP Archive' : 'Code Snippet Import',
        serviceName: finding.fileName || 'source_snippet',
        libraryName: 'Discovered Library'
      },
      classification: {
        dataSensitivity: 'high',
        businessCriticality: 'high',
        internetFacing: true
      },
      status: {
        classical: 'acceptable',
        quantum: finding.quantumStatus
      },
      confidence: finding.confidence,
      riskBand: finding.severity === 'critical' ? 'critical' : finding.severity === 'high' ? 'high' : 'low',
      migrationStatus: 'not_started',
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    };

    addAsset(newAsset);
    toast.success(`Added ${newId} (${finding.ruleName}) to global CBOM inventory!`);
    navigate('/inventory');
  };

  const handleAddAllToCBOM = () => {
    if (findings.length === 0) return;
    findings.forEach((f, idx) => {
      const newId = 'CRYPTO-' + (10000 + idx);
      addAsset({
        id: newId,
        assetType: 'algorithm',
        algorithm: {
          family: f.family,
          name: f.ruleName,
          variant: f.matchedText,
          keySize: f.family === 'RSA' ? 2048 : 256
        },
        usage: {
          purpose: f.family === 'RSA' || f.family === 'ECC' ? 'digital_signature' : 'symmetric_encryption'
        },
        context: {
          applicationId: 'APP-BATCH-IMPORT',
          applicationName: scanMode === 'git' ? repoUrl.split('/').pop() : scanMode === 'zip' ? zipFileName : 'Scanner Import',
          serviceName: f.fileName,
          libraryName: 'Discovered Cryptographic Asset'
        },
        classification: { dataSensitivity: 'high', businessCriticality: 'high', internetFacing: true },
        status: { classical: 'acceptable', quantum: f.quantumStatus },
        confidence: f.confidence,
        riskBand: f.severity === 'critical' ? 'critical' : f.severity === 'high' ? 'high' : 'low',
        migrationStatus: 'not_started',
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString()
      });
    });
    toast.success(`Batch imported ${findings.length} discovered assets into CBOM inventory!`);
    navigate('/inventory');
  };

  // Filtered findings
  const filteredFindings = findings.filter(f => {
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      const m1 = f.ruleName?.toLowerCase().includes(q);
      const m2 = f.fileName?.toLowerCase().includes(q);
      const m3 = f.matchedText?.toLowerCase().includes(q);
      const m4 = f.family?.toLowerCase().includes(q);
      if (!m1 && !m2 && !m3 && !m4) return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Interactive Cryptographic Scanner"
        subtitle="Discover RSA, ECDSA, AES, and Post-Quantum schemes across raw code, Git repositories, or ZIP archives"
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            {findings.length > 0 && (
              <Button
                variant="outline"
                icon={CheckCheck}
                onClick={handleAddAllToCBOM}
              >
                Import All ({findings.length}) to CBOM
              </Button>
            )}
            <Button
              variant="primary"
              icon={Play}
              onClick={scanMode === 'snippet' ? handleScanSnippet : scanMode === 'git' ? handleScanGitRepo : () => zipInputRef.current?.click()}
              disabled={isScanning}
            >
              {isScanning ? 'Scanning...' : scanMode === 'snippet' ? 'Scan Code Snippet' : scanMode === 'git' ? 'Scan Git Repo' : 'Upload & Scan ZIP'}
            </Button>
          </div>
        }
      />

      {/* Mode Switcher Tabs */}
      <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '6px', borderRadius: '10px', width: 'fit-content' }}>
        <button
          type="button"
          onClick={() => setScanMode('snippet')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            background: scanMode === 'snippet' ? '#ffffff' : 'transparent',
            color: scanMode === 'snippet' ? '#1e293b' : '#64748b',
            boxShadow: scanMode === 'snippet' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <Code2 size={16} /> Code Snippet Editor
        </button>

        <button
          type="button"
          onClick={() => setScanMode('git')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            background: scanMode === 'git' ? '#ffffff' : 'transparent',
            color: scanMode === 'git' ? '#1e293b' : '#64748b',
            boxShadow: scanMode === 'git' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <FolderGit2 size={16} /> Git Repository Scanner
        </button>

        <button
          type="button"
          onClick={() => setScanMode('zip')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            background: scanMode === 'zip' ? '#ffffff' : 'transparent',
            color: scanMode === 'zip' ? '#1e293b' : '#64748b',
            boxShadow: scanMode === 'zip' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <FileArchive size={16} /> ZIP Project Archive
        </button>
      </div>

      {/* Progress Bar (when scanning) */}
      {isScanning && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
              <span style={{ color: '#4338ca', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} className="animate-spin" /> {statusMessage || 'Analyzing cryptographic AST patterns...'}
              </span>
              <span>{scanProgress}%</span>
            </div>
            <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${scanProgress}%`, height: '100%', background: '#6366f1', transition: 'width 0.2s ease' }}></div>
            </div>
          </div>
        </Card>
      )}

      {/* Mode 1: Snippet Mode */}
      {scanMode === 'snippet' && (
        <>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#ffffff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} color="#4338ca" /> Load Sample Code:
            </span>
            <Button variant="outline" size="sm" onClick={() => handleLoadSample('go_rsa', 'Go RSA-2048')}>
              Go (RSA-2048 PSS)
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleLoadSample('python_jwt', 'Python ECDSA')}>
              Python (ECDSA ES256)
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleLoadSample('java_aes', 'Java AES-GCM')}>
              Java (AES-GCM)
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleLoadSample('pqc_hybrid', 'PQC ML-KEM')}>
              PQC (X25519MLKEM768)
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleLoadSample('c_openssl', 'C/C++ OpenSSL')}>
              C/C++ (OpenSSL RSA)
            </Button>
          </div>

          <Card
            title="Source Code Input"
            subtitle="Paste arbitrary microservice source files or select sample algorithms above"
            action={
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  accept=".go,.py,.java,.js,.ts,.c,.cpp,.rs,.txt,.yaml"
                />
                <Button variant="outline" size="sm" icon={Upload} onClick={() => fileInputRef.current?.click()}>
                  Upload File
                </Button>
                <Button variant="outline" size="sm" icon={Copy} onClick={handleCopyCode}>
                  Copy
                </Button>
                <Button variant="outline" size="sm" icon={Trash2} onClick={handleClearCode}>
                  Clear
                </Button>
              </div>
            }
          >
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste Go, Python, Java, C/C++, or JavaScript code here to scan for cryptographic patterns..."
              rows={12}
              style={{
                width: '100%',
                padding: '12px',
                fontFamily: 'ui-monospace, monospace',
                fontSize: '13px',
                lineHeight: 1.5,
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#0f172a',
                color: '#f8fafc',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </Card>
        </>
      )}

      {/* Mode 2: Git Repository Scanner */}
      {scanMode === 'git' && (
        <Card
          title="Git Repository Discovery Scanner"
          subtitle="Point ECDAT at any public GitHub repository to inspect cryptographic primitives and ciphers"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Repository HTTPS URL
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/Zeromatrix-159328/ECDAT"
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 36px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      boxSizing: 'border-box'
                    }}
                  />
                  <FolderGit2 size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Branch / Ref
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 32px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      boxSizing: 'border-box'
                    }}
                  />
                  <GitBranch size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                </div>
              </div>

              <Button
                variant="primary"
                icon={Play}
                onClick={handleScanGitRepo}
                disabled={isScanning}
                style={{ height: '38px' }}
              >
                {isScanning ? 'Inspecting...' : 'Scan Repository'}
              </Button>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Quick Try Repos:</span>
              <button
                type="button"
                onClick={() => setRepoUrl('https://github.com/Zeromatrix-159328/ECDAT')}
                style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
              >
                Zeromatrix-159328/ECDAT (Current Repo)
              </button>
              <button
                type="button"
                onClick={() => setRepoUrl('https://github.com/open-quantum-safe/liboqs')}
                style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
              >
                open-quantum-safe/liboqs (PQC Library)
              </button>
              <button
                type="button"
                onClick={() => setRepoUrl('https://github.com/openssl/openssl')}
                style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
              >
                openssl/openssl
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Mode 3: ZIP Project Archive Upload */}
      {scanMode === 'zip' && (
        <Card
          title="ZIP Codebase Archive Scanner"
          subtitle="Upload any full application codebase or compressed ZIP repository to discover all cryptographic implementations"
        >
          <input
            type="file"
            ref={zipInputRef}
            onChange={handleZipUpload}
            accept=".zip"
            style={{ display: 'none' }}
          />

          <div
            onClick={() => zipInputRef.current?.click()}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 20px',
              border: '2px dashed #cbd5e1',
              borderRadius: '8px',
              background: '#f8fafc',
              cursor: 'pointer',
              transition: 'border-color 0.2s ease',
              textAlign: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#6366f1'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
              <FileArchive size={24} color="#4338ca" />
            </div>
            <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
              {zipFileName ? `Selected Archive: ${zipFileName}` : 'Click to Upload or Drag & Drop Project ZIP Archive'}
            </p>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Supports .zip packages containing Go, Python, Java, JavaScript, TypeScript, C/C++, Rust, and configuration files.
            </span>
          </div>

          {zipStats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Total Files in ZIP</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>{zipStats.totalArchiveFiles}</span>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Code Files Inspected</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#4338ca' }}>{zipStats.scannedCodeFiles}</span>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Vulnerable Files</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#dc2626' }}>{zipStats.filesWithFindingsCount}</span>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Total Findings</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>{zipStats.findings.length}</span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Discovered Findings Section */}
      <Card
        title={`Scan Findings & Cryptographic Perimeter (${findings.length})`}
        subtitle="Detected cryptographic primitives with quantum security classifications"
        action={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Filter by severity */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff' }}
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical Only</option>
              <option value="high">High Only</option>
              <option value="low">Low Only</option>
              <option value="info">Info (PQC)</option>
            </select>

            <input
              type="text"
              placeholder="Search findings..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '160px' }}
            >
            </input>
          </div>
        }
      >
        {filteredFindings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b' }}>
            <ShieldCheck size={40} color="#10b981" style={{ margin: '0 auto 12px auto' }} />
            <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>No Cryptographic Violations in View</p>
            <span style={{ fontSize: '12px' }}>All scanned primitives in this view adhere to policy or no patterns matched the current search.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredFindings.map((finding) => (
              <div
                key={finding.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '14px',
                  borderRadius: '8px',
                  border: `1px solid ${finding.severity === 'critical' ? '#fecaca' : finding.severity === 'high' ? '#fed7aa' : '#e2e8f0'}`,
                  background: finding.severity === 'critical' ? '#fff1f2' : finding.severity === 'high' ? '#fff7ed' : '#ffffff',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                      {finding.ruleName}
                    </span>
                    <Badge variant={finding.severity === 'critical' ? 'critical' : finding.severity === 'high' ? 'high' : 'low'}>
                      {finding.severity.toUpperCase()}
                    </Badge>
                    <Badge variant={finding.quantumStatus === 'vulnerable' ? 'quantum-vulnerable' : finding.quantumStatus === 'pqc_native' ? 'quantum-safe' : 'quantum-safe'}>
                      {finding.quantumStatus === 'vulnerable' ? 'Quantum Vulnerable' : finding.quantumStatus === 'pqc_native' ? 'PQC Native' : 'Classical Safe'}
                    </Badge>
                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                      {finding.fileName}:{finding.line}
                    </span>
                  </div>

                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    background: '#0f172a',
                    color: '#e2e8f0',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    overflowX: 'auto',
                    whiteSpace: 'pre'
                  }}>
                    {finding.snippet}
                  </div>

                  <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                    <span>Matched Primitive: <strong>{finding.matchedText}</strong></span>
                    <span>Rule Family: <strong>{finding.family}</strong></span>
                    <span>Confidence: <strong>{Math.round(finding.confidence * 100)}%</strong></span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  icon={Plus}
                  onClick={() => handleAddFindingToCBOM(finding)}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Add to CBOM
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
