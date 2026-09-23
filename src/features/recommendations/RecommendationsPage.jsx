import { useState, useMemo } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import KPICard from '../../components/ui/KPICard';
import SearchInput from '../../components/ui/SearchInput';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import AssetDetailDrawer from '../inventory/AssetDetailDrawer';
import { useRecommendations } from '../../hooks/useRecommendations';
import { useMigrationPlans } from '../../hooks/useMigrationPlans';
import { useCryptoAssets } from '../../hooks/useCryptoAssets';
import { useToast } from '../../components/ui/Toast';
import { ShieldCheck, Cpu, ArrowRight, CheckCircle, ExternalLink, Lightbulb, Copy, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const strategyItems = [
  { label: "All Strategies", value: "all" },
  { label: "Hybrid Dual-Sign", value: "hybrid_dual_sign" },
  { label: "Direct Replacement", value: "direct_replacement" },
  { label: "Hybrid KEX (TLS 1.3)", value: "hybrid_kex" },
  { label: "Maintain Symmetric", value: "maintain" },
];

const priorityItems = [
  { label: "All Priorities", value: "all" },
  { label: "Critical Priority", value: "critical" },
  { label: "High Priority", value: "high" },
  { label: "Medium Priority", value: "medium" },
  { label: "Low Priority", value: "low" },
];

const schemeItems = [
  { label: "RSA-2048 (Digital Signatures / Identity)", value: "rsa_2048", target: "ML-DSA-65 (FIPS 204)", strategy: "Direct Lattice Drop-In", overhead: "+1.3 KB signature size", standard: "NIST FIPS 204" },
  { label: "ECDSA P-256 (REST API OAuth / JWT)", value: "ecdsa_p256", target: "ML-DSA-65 / Falcon-512", strategy: "Hybrid Dual-Sign Token", overhead: "+0.6ms signing verification", standard: "NIST FIPS 204" },
  { label: "ECDH secp256r1 (TLS 1.3 Key Exchange)", value: "ecdh_p256", target: "ML-KEM-768 (FIPS 203)", strategy: "Composite X25519+ML-KEM", overhead: "+1.1 KB handshake overhead", standard: "NIST FIPS 203" },
  { label: "3DES (Legacy Banking & PIN Blocks)", value: "des3", target: "AES-256-GCM (SP 800-38D)", strategy: "Block Cipher Migration", overhead: "Minimal (Hardware Accelerated)", standard: "NIST SP 800-38D" },
  { label: "Ed25519 (High-Throughput Edge Signing)", value: "ed25519", target: "SLH-DSA-SHA2-128s (FIPS 205)", strategy: "State-Machine Hash Signature", overhead: "+7.8 KB public key size", standard: "NIST FIPS 205" },
];

export default function RecommendationsPage() {
  const { recommendations } = useRecommendations();
  const { addTask } = useMigrationPlans();
  const { rawAssets, selectedAsset, setSelectedAssetId } = useCryptoAssets();
  const toast = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [strategyFilter, setStrategyFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedScheme, setSelectedScheme] = useState('rsa_2048');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filteredRecommendations = useMemo(() => {
    return recommendations.filter((rec) => {
      if (search) {
        const q = search.toLowerCase();
        const matchApp = rec.applicationName?.toLowerCase().includes(q);
        const matchAlgo = rec.recommendedAlgorithm?.toLowerCase().includes(q);
        const matchCur = rec.currentAlgorithm?.toLowerCase().includes(q);
        if (!matchApp && !matchAlgo && !matchCur) return false;
      }
      if (strategyFilter !== 'all' && rec.strategy !== strategyFilter) return false;
      if (priorityFilter !== 'all' && rec.priority !== priorityFilter) return false;
      return true;
    });
  }, [recommendations, search, strategyFilter, priorityFilter]);

  const handleCreateTask = (rec) => {
    addTask({
      title: `Remediate ${rec.applicationName} to ${rec.recommendedAlgorithm.split(' ')[0]}`,
      assetId: rec.assetId,
      applicationId: rec.applicationId,
      applicationName: rec.applicationName,
      stage: 'not_started',
      priority: rec.priority,
      currentAlgorithm: rec.currentAlgorithm,
      targetAlgorithm: rec.recommendedAlgorithm,
      checklist: rec.steps?.map((s, i) => ({ id: `chk-${i}`, text: s, completed: false })) || []
    });
    toast.success(`Enrolled ${rec.applicationName} in PQC Migration Runway`);
    navigate('/migration');
  };

  const handleCopySpec = (rec) => {
    const text = `Strategy Spec for ${rec.applicationName}:\nCurrent: ${rec.currentAlgorithm} (${rec.currentPurpose})\nRecommended: ${rec.recommendedAlgorithm} (${rec.nistStatus})\nRationale: ${rec.rationale}`;
    navigator.clipboard.writeText(text);
    toast.success(`Copied PQC roadmap spec for ${rec.applicationName}`);
  };

  const handleInspectAsset = (assetId) => {
    const found = rawAssets.find((a) => a.id === assetId);
    if (found) {
      setSelectedAssetId(found.id);
      setDrawerOpen(true);
    } else {
      toast.info(`Asset ${assetId} detail view loading`);
      setSelectedAssetId(rawAssets[0]?.id);
      setDrawerOpen(true);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <PageHeader
        title="Post-Quantum Cryptography (PQC) Guidance"
        subtitle="NIST FIPS 203/204 compliant transition strategies tailored to discovered asset usage patterns"
      />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div onClick={() => { setStrategyFilter('all'); setPriorityFilter('critical'); }} style={{ cursor: 'pointer' }}>
          <KPICard
            label="Quantum Vulnerable Perimeter"
            value="326"
            detail="Requiring PQC replacement ? Filter Critical"
            icon={ShieldCheck}
            accentColor="#dc2626"
          />
        </div>
        <div onClick={() => { setStrategyFilter('direct_replacement'); setPriorityFilter('all'); }} style={{ cursor: 'pointer' }}>
          <KPICard
            label="Automated Drop-In Ready"
            value="208"
            detail="Standardized lattice drop-ins ? Filter"
            icon={Cpu}
            accentColor="#10b981"
          />
        </div>
        <div onClick={() => { setStrategyFilter('hybrid_dual_sign'); setPriorityFilter('all'); }} style={{ cursor: 'pointer' }}>
          <KPICard
            label="Hybrid Dual-Sign Required"
            value="96"
            detail="Legacy client compatibility ? Filter"
            icon={Lightbulb}
            accentColor="#0284c7"
          />
        </div>
        <div onClick={() => { setStrategyFilter('all'); setPriorityFilter('high'); }} style={{ cursor: 'pointer' }}>
          <KPICard
            label="Manual Review Needed"
            value="22"
            detail="Proprietary hardware & HSMs ? Filter High"
            icon={ExternalLink}
            accentColor="#f59e0b"
          />
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#ffffff', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
        <div style={{ width: '280px' }}>
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search strategy, app, algorithm..."
          />
        </div>

        <Select
          value={strategyFilter}
          onValueChange={setStrategyFilter}
          placeholder="Filter by Strategy"
          className="w-full max-w-48"
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Strategies</SelectLabel>
              {strategyItems.map((item) => (
                <SelectItem key={item.value} id={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          value={priorityFilter}
          onValueChange={setPriorityFilter}
          placeholder="Filter by Priority"
          className="w-full max-w-48"
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Priorities</SelectLabel>
              {priorityItems.map((item) => (
                <SelectItem key={item.value} id={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {(search || strategyFilter !== 'all' || priorityFilter !== 'all') && (
          <Button
            variant="outline"
            size="sm"
            icon={X}
            onClick={() => {
              setSearch('');
              setStrategyFilter('all');
              setPriorityFilter('all');
              toast.info('Cleared recommendation filters');
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

            {/* Interactive PQC Algorithm Drop-In Scheme Advisor */}
      <Card title="Interactive NIST PQC Scheme Drop-In Advisor" subtitle="Evaluate classical cipher primitives and determine immediate FIPS 203/204 transition paths">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
              Select Classical Algorithm:
            </label>
            <Select
              value={selectedScheme}
              onValueChange={setSelectedScheme}
              placeholder="Select an algorithm"
              className="w-full max-w-72"
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Cryptographic Primitives</SelectLabel>
                  {schemeItems.map((item) => (
                    <SelectItem key={item.value} id={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {(() => {
            const active = schemeItems.find((s) => s.value === selectedScheme) || schemeItems[0];
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', background: '#f8fafc', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Target NIST Standard</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0284c7', marginTop: '2px' }}>{active.target}</div>
                  <div style={{ fontSize: '11.5px', color: '#475569' }}>{active.standard}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Recommended Strategy</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a', marginTop: '2px' }}>{active.strategy}</div>
                  <div style={{ fontSize: '11.5px', color: '#475569' }}>Backward compatible</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Performance Impact</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#d97706', marginTop: '2px' }}>{active.overhead}</div>
                  <div style={{ fontSize: '11.5px', color: '#475569' }}>Validated benchmark</div>
                </div>
              </div>
            );
          })()}
        </div>
      </Card>

      {/* Strategy Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
        {filteredRecommendations.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '36px', textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            No recommendations match your search and filter criteria.
          </div>
        ) : (
          filteredRecommendations.map((rec) => (
            <Card
              key={rec.id}
              title={rec.applicationName}
              subtitle={`Asset: ${rec.assetId} | Purpose: ${rec.currentPurpose?.replace(/_/g, ' ')}`}
              action={<Badge variant={rec.priority}>{rec.priority}</Badge>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Transition Banner */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Current Classical</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626' }}>{rec.currentAlgorithm}</div>
                  </div>
                  <ArrowRight size={20} color="#94a3b8" />
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Target Scheme</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0369a1' }}>{rec.recommendedAlgorithm}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Badge variant="pqc">{rec.nistStatus}</Badge>
                  <Badge variant="info">Strategy: {rec.strategy?.replace(/_/g, ' ')}</Badge>
                  <Badge variant="default">Complexity: {rec.complexity}</Badge>
                </div>

                <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                  {rec.rationale}
                </p>

                {/* Implementation Steps Checklist */}
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>Standardized Migration Roadmap:</span>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
                    {rec.steps?.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Button variant="outline" size="sm" icon={ExternalLink} onClick={() => handleInspectAsset(rec.assetId)}>
                      Inspect Asset
                    </Button>
                    <Button variant="outline" size="sm" icon={Copy} onClick={() => handleCopySpec(rec)}>
                      Copy Spec
                    </Button>
                  </div>
                  <Button variant="primary" size="sm" icon={CheckCircle} onClick={() => handleCreateTask(rec)}>
                    Create Migration Task
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <AssetDetailDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        asset={selectedAsset}
      />
    </div>
  );
}
