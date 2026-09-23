import { useState, useEffect } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Slider } from '@/components/ui/slider';
import { calculateMosca } from '../../lib/mosca/calculateMosca';
import { mockMoscaAssessments } from '../../mock/mosca-assessments';
import { storage } from '../../lib/storage';
import { useToast } from '../../components/ui/Toast';
import { ShieldAlert, AlertTriangle, CheckCircle, Save, RotateCcw, Download, Sparkles } from 'lucide-react';

export default function MoscaPage() {
  const savedBaseline = storage.get('mosca_baseline', { shelfLifeX: 10, migrationTimeY: 3, threatHorizonZ: 8 });
  const [shelfLifeX, setShelfLifeX] = useState(savedBaseline.shelfLifeX);
  const [migrationTimeY, setMigrationTimeY] = useState(savedBaseline.migrationTimeY);
  const [threatHorizonZ, setThreatHorizonZ] = useState(savedBaseline.threatHorizonZ);
  const [selectedAppId, setSelectedAppId] = useState(null);

  const toast = useToast();
  const result = calculateMosca(shelfLifeX, migrationTimeY, threatHorizonZ);

  const handleApplyPreset = (presetName, x, y, z) => {
    setShelfLifeX(x);
    setMigrationTimeY(y);
    setThreatHorizonZ(z);
    toast.info(`Applied ${presetName} policy preset (X=${x}y, Y=${y}y, Z=${z}y)`);
  };

  const handleSaveBaseline = () => {
    storage.set('mosca_baseline', { shelfLifeX, migrationTimeY, threatHorizonZ });
    toast.success('Saved current Mosca parameters as enterprise policy baseline.');
  };

  const handleResetDefaults = () => {
    setShelfLifeX(10);
    setMigrationTimeY(3);
    setThreatHorizonZ(8);
    setSelectedAppId(null);
    toast.info('Mosca parameters reset to standard baseline.');
  };

  const handleSelectApp = (app) => {
    setSelectedAppId(app.applicationId);
    setShelfLifeX(app.shelfLifeX);
    setMigrationTimeY(app.migrationTimeY);
    setThreatHorizonZ(app.threatHorizonZ);
    toast.info(`Loaded parameters for ${app.applicationName}`);
  };

  const handleExportCSV = () => {
    const headers = ['Application ID', 'Application Name', 'Data Category', 'Shelf Life (X)', 'Migration Time (Y)', 'Threat Horizon (Z)', 'Margin', 'Status'];
    const rows = mockMoscaAssessments.map((a) => [
      a.applicationId,
      a.applicationName,
      a.dataCategory,
      a.shelfLifeX,
      a.migrationTimeY,
      a.threatHorizonZ,
      a.margin,
      a.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'mosca_timing_assessments.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported Mosca timing assessments to CSV');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <PageHeader
        title="Mosca Theorem Quantum Timing Sandbox"
        subtitle="Evaluate quantum exposure using Dr. Michele Mosca's Theorem: If (X + Y) > Z, your cryptographic data is compromised"
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" size="sm" icon={RotateCcw} onClick={handleResetDefaults}>
              Reset Defaults
            </Button>
            <Button variant="primary" size="sm" icon={Save} onClick={handleSaveBaseline}>
              Save as Policy Baseline
            </Button>
          </div>
        }
      />

      {/* Preset Buttons Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={15} color="#1e40af" /> Load Policy Presets:
        </span>
        <Button variant="outline" size="sm" onClick={() => handleApplyPreset('PCI-DSS Financial', 10, 3, 8)}>
          PCI-DSS Financial (10y / 3y / 8y)
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleApplyPreset('HIPAA Healthcare', 15, 4, 8)}>
          HIPAA Healthcare (15y / 4y / 8y)
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleApplyPreset('Identity Tokens', 5, 2, 8)}>
          OAuth Tokens (5y / 2y / 8y)
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleApplyPreset('Core Ledger', 18, 5, 8)}>
          Core Ledger (18y / 5y / 8y)
        </Button>
      </div>

      {/* Interactive Sandbox Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Controls Card */}
        <Card title="Theorem Parameter Controls" subtitle="Adjust assumptions to simulate quantum runway">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '8px 0' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                  Data Shelf Life (X): <strong>{shelfLifeX} Years</strong>
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Time data must remain confidential</span>
              </div>
              <Slider
                value={[shelfLifeX]}
                onValueChange={(val) => setShelfLifeX(val[0])}
                min={1}
                max={25}
                step={1}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                  Migration Time (Y): <strong>{migrationTimeY} Years</strong>
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Time required to deploy PQC</span>
              </div>
              <Slider
                value={[migrationTimeY]}
                onValueChange={(val) => setMigrationTimeY(val[0])}
                min={1}
                max={10}
                step={1}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                  Threat Horizon (Z): <strong>{threatHorizonZ} Years</strong>
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Estimated time until CRQC</span>
              </div>
              <Slider
                value={[threatHorizonZ]}
                onValueChange={(val) => setThreatHorizonZ(val[0])}
                min={3}
                max={20}
                step={1}
              />
            </div>
          </div>
        </Card>

        {/* Calculation Result Card */}
        <Card title="Computed Quantum Margin" subtitle="Mathematical theorem verdict">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center', padding: '16px 0' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background:
                  result.status === 'urgent' ? '#fee2e2' :
                  result.status === 'vulnerable' ? '#fef3c7' : '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color:
                  result.status === 'urgent' ? '#dc2626' :
                  result.status === 'vulnerable' ? '#d97706' : '#16a34a'
              }}
            >
              {result.status === 'urgent' ? (
                <ShieldAlert size={40} />
              ) : result.status === 'vulnerable' ? (
                <AlertTriangle size={40} />
              ) : (
                <CheckCircle size={40} />
              )}
            </div>

            <div>
              <Badge
                variant={
                  result.status === 'urgent' ? 'critical' :
                  result.status === 'vulnerable' ? 'high' : 'low'
                }
              >
                {result.badgeLabel}
              </Badge>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>
                {result.margin > 0 ? `+${result.margin} Years` : `${result.margin} Years`}
              </div>
              <p style={{ fontSize: '13px', color: '#475569', maxWidth: '340px', margin: '6px auto 0 auto' }}>
                {result.recommendation}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '12px', width: '100%', justifyContent: 'center' }}>
              <span>Total Required (X+Y): <strong>{result.totalRequired} yrs</strong></span>
              <span>Available Horizon (Z): <strong>{result.threatHorizonZ} yrs</strong></span>
            </div>
          </div>
        </Card>
      </div>

      {/* Per Application Mosca Batch Table */}
      <Card
        title="Enterprise Application Mosca Assessments"
        subtitle="Click any row to test its parameters in the sandbox above"
        action={
          <Button variant="outline" size="sm" icon={Download} onClick={handleExportCSV}>
            Export CSV
          </Button>
        }
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>Application</th>
                <th style={{ padding: '10px 14px' }}>Data Category</th>
                <th style={{ padding: '10px 14px' }}>Shelf Life (X)</th>
                <th style={{ padding: '10px 14px' }}>Migration (Y)</th>
                <th style={{ padding: '10px 14px' }}>Horizon (Z)</th>
                <th style={{ padding: '10px 14px' }}>Protection Margin</th>
                <th style={{ padding: '10px 14px' }}>Status</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {mockMoscaAssessments.map((item) => {
                const isSelected = selectedAppId === item.applicationId;
                return (
                  <tr
                    key={item.applicationId}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: isSelected ? '#eff6ff' : 'transparent',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleSelectApp(item)}
                  >
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>
                      {item.applicationName}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>
                      {item.dataCategory}
                    </td>
                    <td style={{ padding: '12px 14px' }}>{item.shelfLifeX} yrs</td>
                    <td style={{ padding: '12px 14px' }}>{item.migrationTimeY} yrs</td>
                    <td style={{ padding: '12px 14px' }}>{item.threatHorizonZ} yrs</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: item.margin < 0 ? '#dc2626' : '#16a34a' }}>
                      {item.margin > 0 ? `+${item.margin} yrs` : `${item.margin} yrs`}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <Badge variant={item.status === 'urgent' ? 'critical' : item.status === 'vulnerable' ? 'high' : 'low'}>
                        {item.status}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <Button
                        variant={isSelected ? 'primary' : 'outline'}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectApp(item);
                        }}
                      >
                        {isSelected ? 'Loaded' : 'Load in Sandbox'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
