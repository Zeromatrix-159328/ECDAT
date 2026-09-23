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

export default function RecommendationsPage() {
  const { recommendations } = useRecommendations();
  const { addTask } = useMigrationPlans();
  const { rawAssets, selectedAsset, setSelectedAssetId } = useCryptoAssets();
  const toast = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [strategyFilter, setStrategyFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
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

        <select
          value={strategyFilter}
          onChange={(e) => setStrategyFilter(e.target.value)}
          aria-label="Filter by Strategy"
          style={{ padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff' }}
        >
          <option value="all">All Strategies</option>
          <option value="hybrid_dual_sign">Hybrid Dual-Sign</option>
          <option value="direct_replacement">Direct Replacement</option>
          <option value="hybrid_kex">Hybrid KEX (TLS 1.3)</option>
          <option value="maintain">Maintain Symmetric</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          aria-label="Filter by Priority"
          style={{ padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff' }}
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical Priority</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>

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
