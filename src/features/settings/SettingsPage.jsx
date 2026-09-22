import { useState, useRef, useEffect } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { storage } from '../../lib/storage';
import { api } from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { Save, RefreshCw, Download, Upload, CheckCircle, Shield, AlertTriangle, Server, Activity, ExternalLink, Globe } from 'lucide-react';

export default function SettingsPage() {
  const savedHorizon = storage.get('threat_horizon_year', 2034);
  const savedShelfLife = storage.get('default_shelf_life', 15);
  const savedWeights = storage.get('risk_weights', {
    quantum: 35,
    criticality: 25,
    exposure: 20,
    legacy: 20
  });

  const [horizon, setHorizon] = useState(savedHorizon);
  const [shelfLife, setShelfLife] = useState(savedShelfLife);
  const [weights, setWeights] = useState(savedWeights);
  const [apiUrl, setApiUrl] = useState(api.getBaseUrl());
  const [connStatus, setConnStatus] = useState({ checked: false, ok: false, latency: 0, info: null });
  const [testing, setTesting] = useState(false);
  const fileInputRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    // Check health on mount
    testBackend(false);
  }, []);

  const testBackend = async (notify = true) => {
    setTesting(true);
    try {
      const res = await api.checkHealth();
      setConnStatus({ checked: true, ok: res.ok, latency: res.latency, info: res.data });
      if (notify) {
        if (res.ok) {
          toast.success(`Connected to FastAPI backend (${res.latency}ms)`);
        } else {
          toast.warning('FastAPI backend offline ? operating in standalone fallback mode.');
        }
      }
    } catch {
      setConnStatus({ checked: true, ok: false, latency: 0, info: null });
      if (notify) toast.warning('Backend connection test timed out or failed.');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveApiUrl = () => {
    const updated = api.setBaseUrl(apiUrl);
    setApiUrl(updated);
    toast.success(`Saved API URL: ${updated}`);
    testBackend(true);
  };

  const handleResetApiUrl = () => {
    const def = api.setBaseUrl('');
    setApiUrl(def);
    toast.info(`Reset API URL to default: ${def}`);
    testBackend(true);
  };

  const handleSaveAssumptions = () => {
    storage.set('threat_horizon_year', Number(horizon));
    storage.set('default_shelf_life', Number(shelfLife));
    toast.success(`Saved quantum threat assumptions (Horizon: ${horizon}, Shelf life: ${shelfLife}y)`);
  };

  const handleSaveWeights = () => {
    const total = Number(weights.quantum) + Number(weights.criticality) + Number(weights.exposure) + Number(weights.legacy);
    if (total !== 100) {
      toast.error(`Weights must total 100% (currently ${total}%)`);
      return;
    }
    storage.set('risk_weights', weights);
    toast.success('Saved multi-factor risk weights policy.');
  };

  const handleResetData = () => {
    storage.clearAll();
    toast.success('Workspace reset to default demo dataset. Reloading...');
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  const handleExportState = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      threat_horizon_year: horizon,
      default_shelf_life: shelfLife,
      risk_weights: weights,
      crypto_assets: storage.get('crypto_assets'),
      migration_tasks: storage.get('migration_tasks'),
      scans_history: storage.get('scans_history')
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', 'ecdat_workspace_backup.json');
    document.body.appendChild(dl);
    dl.click();
    document.body.removeChild(dl);
    toast.success('Exported complete ECDAT workspace state backup JSON');
  };

  const handleImportState = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backup = JSON.parse(event.target?.result || '{}');
        if (backup.crypto_assets) storage.set('crypto_assets', backup.crypto_assets);
        if (backup.migration_tasks) storage.set('migration_tasks', backup.migration_tasks);
        if (backup.scans_history) storage.set('scans_history', backup.scans_history);
        if (backup.threat_horizon_year) storage.set('threat_horizon_year', backup.threat_horizon_year);
        toast.success('Workspace state imported successfully! Reloading...');
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        toast.error('Failed to parse backup JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <PageHeader
        title="System Policies & Parameters"
        subtitle="Configure risk engine thresholds, quantum threat assumptions, and backend cloud connectivity"
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportState}
              style={{ display: 'none' }}
              accept=".json"
            />
            <Button
              variant="outline"
              size="sm"
              icon={Upload}
              onClick={() => fileInputRef.current?.click()}
            >
              Import State
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleExportState}
            >
              Backup Workspace State
            </Button>
          </div>
        }
      />

      {/* Backend & Cloud Connectivity Card */}
      <Card
        title="FastAPI Backend & Cloud Connectivity"
        subtitle="Manage the connection between this GitHub Pages frontend and your Render backend service"
        action={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {connStatus.checked && (
              connStatus.ok ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#166534', background: '#dcfce7', padding: '4px 10px', borderRadius: '16px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                  Connected ({connStatus.latency}ms)
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#854d0e', background: '#fef9c3', padding: '4px 10px', borderRadius: '16px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#eab308', display: 'inline-block' }}></span>
                  Standalone / Local Fallback
                </span>
              )
            )}
            <Button
              variant="outline"
              size="sm"
              icon={Activity}
              onClick={() => testBackend(true)}
              disabled={testing}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
              Backend API Base URL
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://ecdat-api.onrender.com/api/v1"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontFamily: 'monospace'
                }}
              />
              <Button variant="primary" size="sm" icon={Save} onClick={handleSaveApiUrl}>
                Save URL
              </Button>
              <Button variant="outline" size="sm" onClick={handleResetApiUrl}>
                Reset
              </Button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
              <span>
                Default for Render: <code>https://ecdat-api.onrender.com/api/v1</code> &bull; Local dev: <code>http://127.0.0.1:8000/api/v1</code>
              </span>
              <a
                href={`${apiUrl.replace(/\/api\/v1\/?$/, '')}/api/v1/docs`}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#6366f1', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
              >
                Open Swagger Docs <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <div style={{ padding: '12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
            <strong>Dual-Engine Architecture:</strong> If your Render backend service is suspended or spinning up from cold-start, ECDAT seamlessly runs in client-side fallback mode with full mock data integrity and zero broken views. When the backend wakes up, live state synchronizes automatically.
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Threat Assumptions */}
        <Card
          title="Quantum Threat Assumptions"
          subtitle="Global constants for Mosca timeline computations"
          action={
            <Button variant="primary" size="sm" icon={Save} onClick={handleSaveAssumptions}>
              Save
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Estimated Cryptographically Relevant Quantum Computer (CRQC) Year
              </label>
              <input
                type="number"
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                min="2028"
                max="2045"
                style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              />
              <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Industry baseline: 2034 ({horizon - new Date().getFullYear()} years remaining).
              </span>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Default Financial Data Retention Shelf Life (Years)
              </label>
              <input
                type="number"
                value={shelfLife}
                onChange={(e) => setShelfLife(Number(e.target.value))}
                min="1"
                max="30"
                style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              />
            </div>
          </div>
        </Card>

        {/* Risk Weights */}
        <Card
          title="Multi-Factor Risk Weights"
          subtitle="Scoring configuration for cryptographic perimeter"
          action={
            <Button variant="primary" size="sm" icon={Save} onClick={handleSaveWeights}>
              Save Weights
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Quantum Vulnerability Weight (%)</span>
              <input
                type="number"
                value={weights.quantum}
                onChange={(e) => setWeights((w) => ({ ...w, quantum: Number(e.target.value) }))}
                style={{ width: '70px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Business Criticality Weight (%)</span>
              <input
                type="number"
                value={weights.criticality}
                onChange={(e) => setWeights((w) => ({ ...w, criticality: Number(e.target.value) }))}
                style={{ width: '70px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Internet Exposure Weight (%)</span>
              <input
                type="number"
                value={weights.exposure}
                onChange={(e) => setWeights((w) => ({ ...w, exposure: Number(e.target.value) }))}
                style={{ width: '70px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Legacy Algorithm Depreciation (%)</span>
              <input
                type="number"
                value={weights.legacy}
                onChange={(e) => setWeights((w) => ({ ...w, legacy: Number(e.target.value) }))}
                style={{ width: '70px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }}
              />
            </div>
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>Total Sum:</span>
              <span style={{ color: Number(weights.quantum) + Number(weights.criticality) + Number(weights.exposure) + Number(weights.legacy) === 100 ? '#10b981' : '#dc2626' }}>
                {Number(weights.quantum) + Number(weights.criticality) + Number(weights.exposure) + Number(weights.legacy)}%
              </span>
            </div>
          </div>
        </Card>

        {/* Prototype Reset Controls */}
        <Card title="Prototype Workspace Reset" subtitle="Restore initial seed state">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
              All modifications, custom migration tasks, newly scanned patterns, and filter preferences are saved in browser storage. Click below to restore the baseline enterprise dataset.
            </p>

            <div style={{ paddingTop: '8px' }}>
              <Button variant="danger" icon={RefreshCw} onClick={handleResetData}>
                Reset to Default Demo State
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
