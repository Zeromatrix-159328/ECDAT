import { useState, useRef, useEffect } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { scanText } from '../../lib/scanner/scanText';
import { scanZipArchive, scanGitRepository, fetchRepoBranches } from '../../lib/scanner/archiveScanner';
import { scanLibraryManifest, KNOWN_CRYPTO_LIBRARIES } from '../../lib/scanner/libraryScanner';
import { scanBinaryFile, getSampleBinaryFindings } from '../../lib/scanner/binaryScanner';
import { scanDockerfile, scanContainerImageRef, SAMPLE_CONTAINER_PROFILES } from '../../lib/scanner/containerScanner';
import { useCryptoAssets } from '../../hooks/useCryptoAssets';
import { useToast } from '../../components/ui/Toast';
import { 
  Play, Sparkles, RefreshCw, Loader2, Copy, Trash2, Upload, Plus, CheckCircle2, 
  ArrowRight, GitBranch, FileArchive, Code2, FolderGit2, FileText, 
  Layers, Search, AlertTriangle, ShieldCheck, CheckCheck,
  Library, Binary, Container
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
    return jwt.encode(claims, ec_key, algorithm='ES256', headers=header)
}`,
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
}`
};

const SAMPLE_MANIFESTS = {
  python: `# requirements.txt
fastapi>=0.110.0
cryptography==42.0.5
pycryptodome>=3.20.0
pyjwt[crypto]==2.8.0
paramiko>=3.4.0`,
  node: `// package.json
{
  "dependencies": {
    "jsonwebtoken": "^9.0.2",
    "jose": "^5.2.3",
    "elliptic": "^6.5.5",
    "node-forge": "^1.3.1",
    "bcrypt": "^5.1.1"
  }
}`,
  java: `<!-- pom.xml -->
<dependencies>
  <dependency>
    <groupId>org.bouncycastle</groupId>
    <artifactId>bcprov-jdk15on</artifactId>
    <version>1.70</version>
  </dependency>
</dependencies>`,
  go: `// go.mod
module enterprise/core-auth
go 1.22
require (
    golang.org/x/crypto v0.21.0
    github.com/cloudflare/circl v1.3.7
)`
};


export default function DemoScannerPage() {
  const [activeCategory, setActiveCategory] = useState('source');
  const [sourceSubMode, setSourceSubMode] = useState('git');

  const [code, setCode] = useState(SAMPLES.go_rsa);
  const [repoUrl, setRepoUrl] = useState('https://github.com/Zeromatrix-159328/ECDAT');
  const [branch, setBranch] = useState('main');
  const [branchesList, setBranchesList] = useState(['main', 'gh-pages']);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [isCustomBranch, setIsCustomBranch] = useState(false);

  const handleFetchBranches = async (url) => {
    const targetUrl = (url || repoUrl).trim();
    if (!targetUrl) return;
    setIsLoadingBranches(true);
    try {
      const branches = await fetchRepoBranches(targetUrl);
      if (branches && branches.length > 0) {
        setBranchesList(branches);
        if (!branches.includes(branch)) {
          if (branches.includes('main')) setBranch('main');
          else if (branches.includes('master')) setBranch('master');
          else setBranch(branches[0]);
        }
      }
    } catch (err) {
      console.warn('Failed to load branches:', err);
    } finally {
      setIsLoadingBranches(false);
    }
  };

  useEffect(() => {
    if (sourceSubMode === 'git' && repoUrl.trim()) {
      const timer = setTimeout(() => {
        handleFetchBranches(repoUrl);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [repoUrl, sourceSubMode]);
  const [zipFileName, setZipFileName] = useState('');
  const [zipStats, setZipStats] = useState(null);

  const [manifestText, setManifestText] = useState(SAMPLE_MANIFESTS.python);
  const [manifestType, setManifestType] = useState('requirements.txt');

  const [binaryFileName, setBinaryFileName] = useState('libcrypto.so.1.1.1w');
  const [binaryStats, setBinaryStats] = useState(null);

  const [imageRef, setImageRef] = useState('envoyproxy/envoy:v1.28-distroless');
  const [dockerfileText, setDockerfileText] = useState(`FROM debian:bullseye-slim\nRUN apt-get update && apt-get install -y openssl libssl-dev\nCOPY server.crt /etc/ssl/certs/\nEXPOSE 443`);

  const [findings, setFindings] = useState(() => scanText(SAMPLES.go_rsa, 'go_checkout.go'));
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');

  const fileInputRef = useRef(null);
  const zipInputRef = useRef(null);
  const binaryInputRef = useRef(null);

  const toast = useToast();
  const navigate = useNavigate();
  const { addAsset } = useCryptoAssets();

  const handleScanSnippet = () => {
    setIsScanning(true);
    setScanProgress(30);
    setStatusMessage('Scanning raw source snippet...');
    setTimeout(() => {
      const res = scanText(code, 'source_snippet.txt');
      setFindings(res);
      setIsScanning(false);
      setScanProgress(100);
      setStatusMessage('');
      toast.success(`Discovered ${res.length} cryptographic pattern${res.length === 1 ? '' : 's'}`);
    }, 250);
  };

  const handleScanGitRepo = async () => {
    if (!repoUrl.trim()) {
      toast.error('Please enter a Git repository URL');
      return;
    }
    setIsScanning(true);
    setScanProgress(10);
    setStatusMessage('Connecting to Git repository tree...');

    try {
      const res = await scanGitRepository(repoUrl, branch, (pct, msg) => {
        setScanProgress(pct);
        setStatusMessage(msg);
      });
      setFindings(res.findings);
      toast.success(`Repository scan completed: found ${res.findings.length} cryptographic patterns!`);
      if (res.notice) toast.info(res.notice);
    } catch (err) {
      toast.error(err.message || 'Failed to scan repository');
    } finally {
      setIsScanning(false);
      setStatusMessage('');
    }
  };

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
        setStatusMessage(`Inspecting ${currentFile || ''}...`);
      });
      setZipStats(res);
      setFindings(res.findings);
      toast.success(`ZIP scan complete! Inspected ${res.scannedCodeFiles} code files, found ${res.findings.length} findings.`);
    } catch (err) {
      toast.error('Failed to unpack ZIP archive: ' + err.message);
    } finally {
      setIsScanning(false);
      setStatusMessage('');
      e.target.value = '';
    }
  };

  const handleScanLibraries = () => {
    setIsScanning(true);
    setScanProgress(30);
    setStatusMessage(`Auditing dependencies in ${manifestType}...`);
    setTimeout(() => {
      const res = scanLibraryManifest(manifestText, manifestType);
      setFindings(res);
      setIsScanning(false);
      setScanProgress(100);
      setStatusMessage('');
      toast.success(`Dependency audit completed: identified ${res.length} cryptographic library components!`);
    }, 250);
  };

  const handleLoadManifestSample = (ecosystem) => {
    setManifestText(SAMPLE_MANIFESTS[ecosystem]);
    const names = { python: 'requirements.txt', node: 'package.json', java: 'pom.xml', go: 'go.mod' };
    setManifestType(names[ecosystem]);
    const res = scanLibraryManifest(SAMPLE_MANIFESTS[ecosystem], names[ecosystem]);
    setFindings(res);
    toast.info(`Loaded ${ecosystem.toUpperCase()} manifest sample`);
  };

  const handleScanBinaryUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBinaryFileName(file.name);
    setIsScanning(true);
    setScanProgress(15);
    setStatusMessage(`Reading binary executable stream ${file.name}...`);

    try {
      const res = await scanBinaryFile(file, (pct, msg) => {
        setScanProgress(pct);
        setStatusMessage(msg);
      });
      setBinaryStats(res);
      setFindings(res.findings);
      toast.success(`Binary inspection finished! Found ${res.findings.length} cryptographic symbols.`);
    } catch (err) {
      toast.error('Failed to inspect binary: ' + err.message);
    } finally {
      setIsScanning(false);
      setStatusMessage('');
      e.target.value = '';
    }
  };

  const handleLoadSampleBinary = (typeKey, typeName) => {
    setBinaryFileName(typeKey);
    const res = getSampleBinaryFindings(typeKey);
    setBinaryStats(res);
    setFindings(res.findings);
    toast.info(`Loaded ${typeName} symbol profile`);
  };

  const handleScanContainerImage = () => {
    setIsScanning(true);
    setScanProgress(20);
    setStatusMessage(`Inspecting container image layers for ${imageRef}...`);
    setTimeout(() => {
      const res = scanContainerImageRef(imageRef);
      setFindings(res.findings);
      setIsScanning(false);
      setScanProgress(100);
      setStatusMessage('');
      toast.success(`Container scan completed: found ${res.findings.length} cryptographic assets!`);
    }, 350);
  };

  const handleScanDockerfile = () => {
    setIsScanning(true);
    setScanProgress(40);
    setStatusMessage('Auditing Dockerfile base image & crypto packages...');
    setTimeout(() => {
      const res = scanDockerfile(dockerfileText);
      setFindings(res);
      setIsScanning(false);
      setScanProgress(100);
      setStatusMessage('');
      toast.success(`Dockerfile audit finished: ${res.length} findings.`);
    }, 250);
  };

  const handleAddFindingToCBOM = (finding) => {
    const newId = 'CRYPTO-' + Math.floor(10000 + Math.random() * 90000);
    const newAsset = {
      id: newId,
      assetType: activeCategory === 'libraries' ? 'library' : activeCategory === 'binaries' ? 'binary' : activeCategory === 'containers' ? 'container' : 'algorithm',
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
        applicationName: activeCategory === 'source' ? (sourceSubMode === 'git' ? repoUrl.split('/').pop() || 'Git Repo' : 'Source Code') :
                         activeCategory === 'libraries' ? `Library [${manifestType}]` :
                         activeCategory === 'binaries' ? `Binary [${binaryFileName}]` : `Container [${imageRef}]`,
        serviceName: finding.fileName || 'asset',
        libraryName: finding.ruleName
      },
      classification: { dataSensitivity: 'high', businessCriticality: 'high', internetFacing: true },
      status: { classical: 'acceptable', quantum: finding.quantumStatus },
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
        assetType: activeCategory === 'libraries' ? 'library' : activeCategory === 'binaries' ? 'binary' : activeCategory === 'containers' ? 'container' : 'algorithm',
        algorithm: {
          family: f.family,
          name: f.ruleName,
          variant: f.matchedText,
          keySize: f.family === 'RSA' ? 2048 : 256
        },
        usage: { purpose: f.family === 'RSA' || f.family === 'ECC' ? 'digital_signature' : 'symmetric_encryption' },
        context: {
          applicationId: 'APP-BATCH-IMPORT',
          applicationName: `${activeCategory.toUpperCase()} Scanner Ingest`,
          serviceName: f.fileName,
          libraryName: f.ruleName
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
        title="Multi-Modal Cryptographic Discovery Scanner"
        subtitle="Comprehensive scanning for Source-code repositories, Libraries, Binary files, and Container images"
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            {findings.length > 0 && (
              <Button variant="outline" icon={CheckCheck} onClick={handleAddAllToCBOM}>
                Import All ({findings.length}) to CBOM
              </Button>
            )}
            <Button
              variant="primary"
              icon={Play}
              onClick={() => {
                if (activeCategory === 'source') {
                  if (sourceSubMode === 'snippet') handleScanSnippet();
                  else if (sourceSubMode === 'git') handleScanGitRepo();
                  else zipInputRef.current?.click();
                } else if (activeCategory === 'libraries') {
                  handleScanLibraries();
                } else if (activeCategory === 'binaries') {
                  binaryInputRef.current?.click();
                } else {
                  handleScanContainerImage();
                }
              }}
              disabled={isScanning}
            >
              {isScanning ? 'Scanning...' : 'Execute Discovery Scan'}
            </Button>
          </div>
        }
      />

      {/* 4 Core PS Category Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', background: '#f1f5f9', padding: '6px', borderRadius: '10px' }}>
        <button
          type="button"
          onClick={() => setActiveCategory('source')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '10px 14px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer',
            background: activeCategory === 'source' ? '#ffffff' : 'transparent',
            color: activeCategory === 'source' ? '#4338ca' : '#64748b',
            boxShadow: activeCategory === 'source' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
          }}
        >
          <FolderGit2 size={16} /> 1. Source Repositories
        </button>

        <button
          type="button"
          onClick={() => { setActiveCategory('libraries'); handleScanLibraries(); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '10px 14px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer',
            background: activeCategory === 'libraries' ? '#ffffff' : 'transparent',
            color: activeCategory === 'libraries' ? '#4338ca' : '#64748b',
            boxShadow: activeCategory === 'libraries' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
          }}
        >
          <Library size={16} /> 2. Libraries & Dependencies
        </button>

        <button
          type="button"
          onClick={() => { setActiveCategory('binaries'); handleLoadSampleBinary('linux_so', 'OpenSSL Shared Library (.so)'); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '10px 14px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer',
            background: activeCategory === 'binaries' ? '#ffffff' : 'transparent',
            color: activeCategory === 'binaries' ? '#4338ca' : '#64748b',
            boxShadow: activeCategory === 'binaries' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
          }}
        >
          <Binary size={16} /> 3. Binary & Compiled Files
        </button>

        <button
          type="button"
          onClick={() => { setActiveCategory('containers'); handleScanContainerImage(); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '10px 14px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer',
            background: activeCategory === 'containers' ? '#ffffff' : 'transparent',
            color: activeCategory === 'containers' ? '#4338ca' : '#64748b',
            boxShadow: activeCategory === 'containers' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
          }}
        >
          <Container size={16} /> 4. Container Images
        </button>
      </div>

      {/* Progress Bar (when scanning) */}
      {isScanning && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
              <span style={{ color: '#4338ca', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} className="animate-spin" /> {statusMessage || 'Scanning cryptographic perimeter...'}
              </span>
              <span>{scanProgress}%</span>
            </div>
            <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${scanProgress}%`, height: '100%', background: '#6366f1', transition: 'width 0.2s ease' }}></div>
            </div>
          </div>
        </Card>
      )}

      {/* CATEGORY 1: SOURCE-CODE REPOSITORIES */}
      {activeCategory === 'source' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant={sourceSubMode === 'git' ? 'primary' : 'outline'}
              size="sm"
              icon={FolderGit2}
              onClick={() => setSourceSubMode('git')}
            >
              GitHub / GitLab Repository URL
            </Button>
            <Button
              variant={sourceSubMode === 'zip' ? 'primary' : 'outline'}
              size="sm"
              icon={FileArchive}
              onClick={() => setSourceSubMode('zip')}
            >
              ZIP Source Code Package
            </Button>
            <Button
              variant={sourceSubMode === 'snippet' ? 'primary' : 'outline'}
              size="sm"
              icon={Code2}
              onClick={() => setSourceSubMode('snippet')}
            >
              Raw Code Snippet Editor
            </Button>
          </div>

          {sourceSubMode === 'git' && (
            <Card
              title="Git Source Repository Scanner (GitHub / GitLab)"
              subtitle="Scans public/private repository trees for cryptographic algorithms, keys, and schemes"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Repository URL (GitHub / GitLab)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        placeholder="https://github.com/Zeromatrix-159328/ECDAT"
                        style={{ width: '100%', padding: '9px 12px 9px 36px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                      />
                      <FolderGit2 size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                    </div>
                  </div>

                  <div style={{ minWidth: '220px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        Branch / Tag
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isLoadingBranches ? (
                          <span style={{ fontSize: '11px', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Loader2 size={11} className="animate-spin" /> Fetching...
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
                            {branchesList.length} {branchesList.length === 1 ? 'branch' : 'branches'}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleFetchBranches(repoUrl)}
                          title="Refresh branches list"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', color: '#64748b', display: 'flex' }}
                        >
                          <RefreshCw size={11} />
                        </button>
                      </div>
                    </div>

                    <div style={{ position: 'relative' }}>
                      {!isCustomBranch ? (
                        <select
                          value={branch}
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              setIsCustomBranch(true);
                              setBranch('');
                            } else {
                              setBranch(e.target.value);
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '9px 12px 9px 32px',
                            fontSize: '13px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            boxSizing: 'border-box',
                            background: '#ffffff',
                            color: '#0f172a',
                            cursor: 'pointer'
                          }}
                        >
                          {branchesList.map((b) => (
                            <option key={b} value={b}>
                              {b} {b === 'main' || b === 'master' ? '(default)' : ''}
                            </option>
                          ))}
                          <option value="__custom__">+ Enter custom branch...</option>
                        </select>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            type="text"
                            value={branch}
                            onChange={(e) => setBranch(e.target.value)}
                            placeholder="e.g. feature/pqc"
                            autoFocus
                            style={{
                              width: '100%',
                              padding: '9px 12px 9px 32px',
                              fontSize: '13px',
                              borderRadius: '6px',
                              border: '1px solid #0284c7',
                              boxSizing: 'border-box'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomBranch(false);
                              if (!branch) setBranch(branchesList[0] || 'main');
                            }}
                            style={{
                              fontSize: '11px',
                              padding: '0 8px',
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            List
                          </button>
                        </div>
                      )}
                      <GitBranch size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px', pointerEvents: 'none' }} />
                    </div>
                  </div>

                  <Button variant="primary" icon={Play} onClick={handleScanGitRepo} disabled={isScanning} style={{ height: '38px' }}>
                    Scan Repo
                  </Button>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Quick Presets:</span>
                  <button type="button" onClick={() => { setRepoUrl('https://github.com/Zeromatrix-159328/ECDAT'); handleFetchBranches('https://github.com/Zeromatrix-159328/ECDAT'); }} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}>
                    Zeromatrix-159328/ECDAT
                  </button>
                  <button type="button" onClick={() => { setRepoUrl('https://github.com/open-quantum-safe/liboqs'); handleFetchBranches('https://github.com/open-quantum-safe/liboqs'); }} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}>
                    open-quantum-safe/liboqs
                  </button>
                  <button type="button" onClick={() => { setRepoUrl('https://github.com/openssl/openssl'); handleFetchBranches('https://github.com/openssl/openssl'); }} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}>
                    openssl/openssl
                  </button>
                </div>
              </div>
            </Card>
          )}

          {sourceSubMode === 'zip' && (
            <Card title="ZIP Source Code Package" subtitle="Upload any compressed application source archive to discover cryptographic assets">
              <input type="file" ref={zipInputRef} onChange={handleZipUpload} accept=".zip" style={{ display: 'none' }} />
              <div
                onClick={() => zipInputRef.current?.click()}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '36px 20px', border: '2px dashed #cbd5e1', borderRadius: '8px', background: '#f8fafc',
                  cursor: 'pointer', textAlign: 'center'
                }}
              >
                <FileArchive size={36} color="#4338ca" style={{ marginBottom: '8px' }} />
                <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                  {zipFileName ? `Selected: ${zipFileName}` : 'Click to Upload or Drag & Drop Source Code .ZIP'}
                </p>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Unpacks in memory: extracts Go, Python, Java, JS/TS, C/C++, Rust, and configuration files.
                </span>
              </div>
            </Card>
          )}

          {sourceSubMode === 'snippet' && (
            <Card
              title="Raw Source Snippet Editor"
              subtitle="Inspect arbitrary code routines directly in the browser"
              action={
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Button variant="outline" size="sm" onClick={() => { setCode(SAMPLES.go_rsa); handleScanSnippet(); }}>Go RSA</Button>
                  <Button variant="outline" size="sm" onClick={() => { setCode(SAMPLES.python_jwt); handleScanSnippet(); }}>Python ECDSA</Button>
                  <Button variant="outline" size="sm" onClick={() => { setCode(SAMPLES.pqc_hybrid); handleScanSnippet(); }}>PQC ML-KEM</Button>
                </div>
              }
            >
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={10}
                style={{ width: '100%', padding: '12px', fontFamily: 'monospace', fontSize: '13px', borderRadius: '6px', background: '#0f172a', color: '#f8fafc', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </Card>
          )}
        </div>
      )}

      {/* CATEGORY 2: LIBRARIES & DEPENDENCY MANIFESTS */}
      {activeCategory === 'libraries' && (
        <Card
          title="Cryptographic Libraries & Dependency Scanner"
          subtitle="Audit OpenSSL, Java (Bouncy Castle, Tink), Python (cryptography, pycryptodome), and Node.js crypto libraries"
          action={
            <div style={{ display: 'flex', gap: '6px' }}>
              <Button variant="outline" size="sm" onClick={() => handleLoadManifestSample('python')}>Python requirements.txt</Button>
              <Button variant="outline" size="sm" onClick={() => handleLoadManifestSample('node')}>Node package.json</Button>
              <Button variant="outline" size="sm" onClick={() => handleLoadManifestSample('java')}>Java pom.xml</Button>
              <Button variant="outline" size="sm" onClick={() => handleLoadManifestSample('go')}>Go go.mod</Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Manifest Content ({manifestType})
              </span>
              <Button variant="primary" size="sm" icon={Play} onClick={handleScanLibraries}>
                Audit Libraries
              </Button>
            </div>

            <textarea
              value={manifestText}
              onChange={(e) => setManifestText(e.target.value)}
              rows={8}
              style={{ width: '100%', padding: '10px', fontFamily: 'monospace', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', boxSizing: 'border-box' }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
              <div><strong>OpenSSL / Native:</strong> OpenSSL 3.0/3.1, liboqs</div>
              <div><strong>Java Providers:</strong> Bouncy Castle (bcprov), Google Tink</div>
              <div><strong>Python Cryptography:</strong> pycryptodome, cryptography, pyjwt</div>
              <div><strong>Node Crypto:</strong> jsonwebtoken, jose, elliptic, node-forge</div>
            </div>
          </div>
        </Card>
      )}

      {/* CATEGORY 3: BINARY FILES (.exe, .dll, .so, firmware) */}
      {activeCategory === 'binaries' && (
        <Card
          title="Binary & Compiled Executable Scanner (.exe, .dll, .so, firmware, compiled apps)"
          subtitle="Disassembles binary string tables, cryptographic symbol exports, and embedded constants"
          action={
            <div style={{ display: 'flex', gap: '6px' }}>
              <Button variant="outline" size="sm" onClick={() => handleLoadSampleBinary('linux_so', 'OpenSSL Shared Object (.so)')}>
                Linux .so (OpenSSL)
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleLoadSampleBinary('windows_dll', 'Windows DLL (.dll)')}>
                Windows .dll (CryptoAPI)
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleLoadSampleBinary('firmware', 'Firmware Image (.bin)')}>
                Firmware .bin (IoT Gateway)
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="file" ref={binaryInputRef} onChange={handleScanBinaryUpload} accept=".exe,.dll,.so,.bin,.elf,.dylib" style={{ display: 'none' }} />

            <div
              onClick={() => binaryInputRef.current?.click()}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '30px 20px', border: '2px dashed #cbd5e1', borderRadius: '8px', background: '#f8fafc',
                cursor: 'pointer', textAlign: 'center'
              }}
            >
              <Binary size={36} color="#4338ca" style={{ marginBottom: '8px' }} />
              <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                Upload Binary Executable (.exe, .dll, .so, firmware .bin)
              </p>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Currently inspected binary target: <strong>{binaryFileName}</strong>
              </span>
            </div>

            {binaryStats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Binary Target</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', display: 'block' }}>{binaryStats.binaryName}</span>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Symbols Extracted</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#4338ca', display: 'block' }}>{binaryStats.extractedSymbolsCount}</span>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Crypto Findings</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626', display: 'block' }}>{binaryStats.findings.length}</span>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* CATEGORY 4: CONTAINER IMAGES (Docker, packages, layers) */}
      {activeCategory === 'containers' && (
        <Card
          title="Container Image Scanner (Docker images, container packages, layers)"
          subtitle="Audits container base images, installed system SSL packages, and ingress cipher suites"
          action={
            <div style={{ display: 'flex', gap: '6px' }}>
              <Button variant="outline" size="sm" onClick={() => { setImageRef('envoyproxy/envoy:v1.28-distroless'); handleScanContainerImage(); }}>
                Envoy Edge Ingress
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setImageRef('nginx:1.24-alpine'); handleScanContainerImage(); }}>
                Nginx Ingress
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setImageRef('postgres:16.1-bullseye'); handleScanContainerImage(); }}>
                PostgreSQL DB
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '3fr auto', gap: '12px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Docker Container Image Reference (Registry / Tag)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={imageRef}
                    onChange={(e) => setImageRef(e.target.value)}
                    placeholder="docker.io/library/nginx:latest or envoyproxy/envoy:v1.28"
                    style={{ width: '100%', padding: '9px 12px 9px 36px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                  <Container size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                </div>
              </div>

              <Button variant="primary" icon={Play} onClick={handleScanContainerImage} disabled={isScanning} style={{ height: '38px' }}>
                Scan Container
              </Button>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  Or Paste Dockerfile to audit base layers:
                </span>
                <Button variant="outline" size="sm" onClick={handleScanDockerfile}>
                  Scan Dockerfile
                </Button>
              </div>
              <textarea
                value={dockerfileText}
                onChange={(e) => setDockerfileText(e.target.value)}
                rows={4}
                style={{ width: '100%', padding: '8px 10px', fontFamily: 'monospace', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Discovered Findings Section */}
      <Card
        title={`Discovered Cryptographic Findings (${findings.length})`}
        subtitle="Detected cryptographic primitives, ciphers, libraries, and binaries with quantum security classifications"
        action={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
            />
          </div>
        }
      >
        {filteredFindings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b' }}>
            <ShieldCheck size={40} color="#10b981" style={{ margin: '0 auto 12px auto' }} />
            <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>No Cryptographic Violations in View</p>
            <span style={{ fontSize: '12px' }}>All primitives in this view adhere to security policy or no patterns matched the current search.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredFindings.map((finding) => (
              <div
                key={finding.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  padding: '14px', borderRadius: '8px',
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
                    <Badge variant={finding.quantumStatus === 'vulnerable' ? 'quantum-vulnerable' : 'quantum-safe'}>
                      {finding.quantumStatus === 'vulnerable' ? 'Quantum Vulnerable' : finding.quantumStatus === 'pqc_native' ? 'PQC Native' : 'Classical Safe'}
                    </Badge>
                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                      {finding.fileName}{finding.line ? `:${finding.line}` : ''}
                    </span>
                  </div>

                  <div style={{
                    padding: '8px 12px', borderRadius: '4px', background: '#0f172a',
                    color: '#e2e8f0', fontFamily: 'monospace', fontSize: '12px', overflowX: 'auto', whiteSpace: 'pre'
                  }}>
                    {finding.snippet}
                  </div>

                  {finding.recommendation && (
                    <div style={{ fontSize: '11px', color: '#4338ca', fontWeight: 500 }}>
                      Remediation: {finding.recommendation}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                    <span>Matched: <strong>{finding.matchedText}</strong></span>
                    <span>Category: <strong>{finding.category}</strong></span>
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
