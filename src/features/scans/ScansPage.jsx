import { useState } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import Modal from '../../components/ui/Modal';
import ProgressBar from '../../components/ui/ProgressBar';
import { useScans } from '../../hooks/useScans';
import { useToast } from '../../components/ui/Toast';
import { Plus, Play, RefreshCw, Eye, RotateCw, CheckCircle2, AlertTriangle, Layers, FolderGit2, FileArchive, Upload, Library, Binary, Container } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function ScansPage() {
  const { scans, addScan, rerunScan } = useScans();
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Wizard state
  const [step, setStep] = useState(1); // 1: Target, 2: Config, 3: Running, 4: Done
  const [scanName, setScanName] = useState('');
  const [scanTarget, setScanTarget] = useState('github.com/enterprise/checkout-service');
  const [scanType, setScanType] = useState('Source Repository AST');
  const [targetKind, setTargetKind] = useState('git');
  const [customRepoUrl, setCustomRepoUrl] = useState('https://github.com/open-quantum-safe/liboqs');
  const [zipName, setZipName] = useState('');
  const [progress, setProgress] = useState(0);
  const [createdScanId, setCreatedScanId] = useState(null);

  const toast = useToast();
  const navigate = useNavigate();

  const handleStartScanWizard = () => {
    setStep(1);
    setScanName('');
    setTargetKind('git');
    setProgress(0);
    setModalOpen(true);
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!scanName.trim()) {
        setScanName(`${scanTarget.split('/').pop() || 'Repo'} Discovery Scan`);
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
      // Run progress simulation
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 20;
        setProgress(Math.min(100, currentProgress));
        if (currentProgress >= 100) {
          clearInterval(interval);
          const newId = 'SCAN-' + Date.now().toString().slice(-6);
          const newScan = {
            id: newId,
            name: scanName.trim() || 'On-Demand Repository CBOM Discovery',
            target: scanTarget,
            type: scanType,
            status: 'completed',
            startedAt: new Date().toISOString(),
            finishedAt: new Date(Date.now() + 45000).toISOString(),
            duration: '45s',
            triggeredBy: 'Security Lead (Manual)',
            stats: {
              filesScanned: Math.floor(250 + Math.random() * 200),
              dependenciesAnalyzed: Math.floor(50 + Math.random() * 40),
              certificatesInspected: Math.floor(5 + Math.random() * 8),
              cryptoAssetsDiscovered: Math.floor(25 + Math.random() * 30),
              quantumVulnerableFound: Math.floor(10 + Math.random() * 10),
              criticalRisks: Math.floor(2 + Math.random() * 4),
              newFindings: 2
            }
          };
          addScan(newScan);
          setCreatedScanId(newId);
          setStep(4);
          toast.success(`Discovery scan completed: ${newScan.name}`);
        }
      }, 400);
    }
  };

  const handleRerun = (scanId, scanName) => {
    rerunScan(scanId);
    toast.success(`Rerunning scan for ${scanName}`);
  };

  const filteredScans = statusFilter === 'all'
    ? scans
    : scans.filter((s) => s.status === statusFilter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Automated Discovery Scans"
        subtitle="Configure CI/CD integrations, container repository scans, and runtime telemetry discovery"
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/scanner">
              <Button variant="secondary" icon={Play}>
                Launch Interactive Scanner
              </Button>
            </Link>
            <Button variant="primary" icon={Plus} onClick={handleStartScanWizard}>
              New Discovery Scan
            </Button>
          </div>
        }
      />

      <Card
        title={`Discovery Pipeline Jobs (${filteredScans.length})`}
        subtitle="Automated cryptographic bill of materials scans"
        action={
          <div style={{ display: 'flex', gap: '6px' }}>
            <Button
              variant={statusFilter === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              All
            </Button>
            <Button
              variant={statusFilter === 'completed' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('completed')}
            >
              Completed
            </Button>
            <Button
              variant={statusFilter === 'running' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('running')}
            >
              Running
            </Button>
          </div>
        }
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>Scan Name & Target</th>
                <th style={{ padding: '10px 14px' }}>Type</th>
                <th style={{ padding: '10px 14px' }}>Status</th>
                <th style={{ padding: '10px 14px' }}>Assets Discovered</th>
                <th style={{ padding: '10px 14px' }}>Quantum Vulnerable</th>
                <th style={{ padding: '10px 14px' }}>Duration</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredScans.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{s.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{s.target}</div>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#475569' }}>{s.type}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <Badge variant={s.status === 'completed' ? 'success' : s.status === 'running' ? 'info' : 'warning'}>
                      {s.status}
                    </Badge>
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600 }}>{s.stats?.cryptoAssetsDiscovered || 0}</td>
                  <td style={{ padding: '12px 14px', color: '#dc2626', fontWeight: 600 }}>{s.stats?.quantumVulnerableFound || 0}</td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>{s.duration}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={RotateCw}
                        onClick={() => handleRerun(s.id, s.name)}
                        title="Rerun discovery scan"
                      >
                        Rerun
                      </Button>
                      <Link to={`/scans/${s.id}`}>
                        <Button variant="secondary" size="sm" icon={Eye}>
                          Report
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Multi-Step New Scan Wizard Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          step === 1 ? 'Step 1: Scan Target & Scope' :
          step === 2 ? 'Step 2: Configuration & Rules' :
          step === 3 ? 'Step 3: Discovery Pipeline Running' :
          'Scan Completed!'
        }
        footer={
          step === 1 ? (
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleNextStep}>Next: Rules & Config ?</Button>
            </>
          ) : step === 2 ? (
            <>
              <Button variant="secondary" onClick={() => setStep(1)}>? Back</Button>
              <Button variant="primary" onClick={handleNextStep}>Launch Discovery Pipeline</Button>
            </>
          ) : step === 3 ? (
            <Button variant="secondary" disabled>Scanning in progress...</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Close</Button>
              <Button
                variant="primary"
                onClick={() => {
                  setModalOpen(false);
                  navigate(`/scans/${createdScanId}`);
                }}
              >
                View Scan Report ?
              </Button>
            </>
          )
        }
      >
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Scan Name / Job Identifier
              </label>
              <input
                type="text"
                placeholder="e.g. Identity Service Release v2.4 Audit"
                value={scanName}
                onChange={(e) => setScanName(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Scan Target
              </label>
              <Select value={scanTarget} onValueChange={setScanTarget}>
                <SelectTrigger style={{ width: '100%' }}>
                  <SelectValue placeholder="Select Scan Target" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Scan Targets</SelectLabel>
                    <SelectItem value="github.com/enterprise/checkout-service">github.com/enterprise/checkout-service (Go)</SelectItem>
                    <SelectItem value="github.com/enterprise/identity-provider">github.com/enterprise/identity-provider (Python/OAuth)</SelectItem>
                    <SelectItem value="github.com/enterprise/settlement-engine">github.com/enterprise/settlement-engine (Java Ledger)</SelectItem>
                    <SelectItem value="registry.corp.internal/ingress/envoy-edge:v1.28">Container Registry: Envoy Edge Ingress</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Inspection Strategy
              </label>
              <Select value={scanType} onValueChange={setScanType}>
                <SelectTrigger style={{ width: '100%' }}>
                  <SelectValue placeholder="Select Inspection Strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Strategy</SelectLabel>
                    <SelectItem value="Source Repository AST">Source Repository AST (Go, Python, Java, JS)</SelectItem>
                    <SelectItem value="Container Binary Inspection">Container Binary & Dynamic Link Inspection</SelectItem>
                    <SelectItem value="Network Endpoint Scan">Network TLS & mTLS Cipher Suite Probe</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '13px', color: '#334155' }}>
              Select detection rules to include in discovery:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { name: 'SEC-RSA: Quantum-vulnerable RSA key sizes & padding', checked: true },
                { name: 'SEC-ECC: Classical Elliptic Curves (P-256, secp256k1, ED25519)', checked: true },
                { name: 'SEC-SYM: Symmetric cipher evaluation (AES, 3DES, ChaCha20)', checked: true },
                { name: 'SEC-PQC: Standardized lattice schemes (ML-KEM, ML-DSA detection)', checked: true }
              ].map((rule, idx) => (
                <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#1e293b' }}>
                  <input type="checkbox" defaultChecked={rule.checked} />
                  <span>{rule.name}</span>
                </label>
              ))}
            </div>
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
              Deterministic AST indexing and deduplication will generate verifiable evidence for CBOM export.
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 0', alignItems: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
              Analyzing AST & Extracting Cryptographic Evidence...
            </div>
            <div style={{ width: '100%' }}>
              <ProgressBar value={progress} max={100} height={10} color="#1e40af" />
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              {progress < 40 ? 'Parsing repository files...' : progress < 80 ? 'Evaluating Shor & Mosca quantum algorithms...' : 'Building CycloneDX CBOM record...'}
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center', padding: '10px 0' }}>
            <CheckCircle2 size={48} color="#10b981" />
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                Discovery Scan Succeeded!
              </h4>
              <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>
                Indexed repository into cryptographic inventory with 0 warnings.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', width: '100%', textAlign: 'center', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Files</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>324</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Assets</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e40af' }}>38</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Vulnerable</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#dc2626' }}>12</div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
