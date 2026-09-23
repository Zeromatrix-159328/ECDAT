import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useCryptoAssets } from '../../hooks/useCryptoAssets';
import { useMigrationPlans } from '../../hooks/useMigrationPlans';
import { mockMoscaAssessments } from '../../mock/mosca-assessments';
import { useToast } from '../../components/ui/Toast';
import { 
  FileText, 
  FileJson, 
  FileSpreadsheet, 
  Download, 
  ShieldCheck, 
  Clock, 
  Layers, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import {
  exportExecutiveRiskBriefPDF,
  exportCBOMReportPDF,
  exportPerimeterInventoryPDF,
  exportMoscaReportPDF,
  exportMigrationPlanPDF,
  exportMasterDossierPDF
} from '../../lib/reports/pdfGenerator';

export default function ReportsPage() {
  const { rawAssets } = useCryptoAssets();
  const { tasks } = useMigrationPlans();
  const toast = useToast();

  // Handlers for PDF Downloads
  const handleDownloadExecutivePDF = () => {
    try {
      exportExecutiveRiskBriefPDF({ rawAssets, tasks, moscaAssessments: mockMoscaAssessments });
      toast.success('Downloaded Executive Quantum Risk Brief (PDF)');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate Executive PDF');
    }
  };

  const handleDownloadCBOMPDF = () => {
    try {
      exportCBOMReportPDF({ rawAssets });
      toast.success('Downloaded CycloneDX 1.6 CBOM Report (PDF)');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate CBOM PDF');
    }
  };

  const handleDownloadInventoryPDF = () => {
    try {
      exportPerimeterInventoryPDF({ rawAssets });
      toast.success('Downloaded Cryptographic Perimeter Inventory (PDF)');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate Inventory PDF');
    }
  };

  const handleDownloadMoscaPDF = () => {
    try {
      exportMoscaReportPDF({ moscaAssessments: mockMoscaAssessments });
      toast.success('Downloaded Mosca Quantum Exposure Calculus (PDF)');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate Mosca PDF');
    }
  };

  const handleDownloadMigrationPlanPDF = () => {
    try {
      exportMigrationPlanPDF({ tasks });
      toast.success('Downloaded NIST PQC Migration Plan (PDF)');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate Migration Plan PDF');
    }
  };

  const handleDownloadMasterDossierPDF = () => {
    try {
      exportMasterDossierPDF({ rawAssets, tasks, moscaAssessments: mockMoscaAssessments });
      toast.success('Downloaded Master Cryptographic Compliance Dossier (PDF)');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate Master Dossier PDF');
    }
  };

  // Optional Raw JSON / CSV handlers retained for dual-format export
  const handleDownloadJSON = () => {
    const cbom = {
      bomFormat: 'CycloneDX',
      specVersion: '1.6',
      serialNumber: 'urn:uuid:ecdat-cbom-enterprise-perimeter',
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        tools: [{ vendor: 'ECDAT', name: 'Enterprise Cryptographic Discovery Tool', version: '1.0.0' }],
        component: { name: 'Enterprise Core Perimeter', type: 'application' }
      },
      cryptographicAssets: rawAssets
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cbom, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', 'enterprise_cbom_cyclonedx_1.6.json');
    document.body.appendChild(dl);
    dl.click();
    document.body.removeChild(dl);
    toast.success('Downloaded CycloneDX 1.6 CBOM JSON');
  };

  const handleDownloadCSV = () => {
    const headers = ['Asset ID', 'Algorithm', 'Purpose', 'Application', 'Service', 'Risk Band', 'Quantum Status', 'Migration Status'];
    const rows = rawAssets.map((a) => [
      a.id,
      a.algorithm?.name || 'N/A',
      a.usage?.purpose || 'N/A',
      a.context?.applicationName || 'N/A',
      a.context?.serviceName || 'N/A',
      a.riskBand || 'N/A',
      a.status?.quantum || 'N/A',
      a.migrationStatus || 'N/A'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'ecdat_inventory_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded Cryptographic Inventory CSV');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <PageHeader
          title="Compliance & Audit Reports"
          subtitle="Generate and download publication-quality cryptographic audit reports, CBOM registers, and executive briefs as PDF documents"
        />

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button 
            variant="primary" 
            icon={Sparkles} 
            onClick={handleDownloadMasterDossierPDF}
            style={{ 
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
              fontWeight: 600,
              padding: '10px 18px'
            }}
          >
            Download Master Audit Dossier (PDF)
          </Button>
        </div>
      </div>

      {/* Quick Summary Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '8px', 
            background: '#e0f2fe', 
            color: '#0284c7', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              Standardized Vector PDF Export Engine Active
            </div>
            <div style={{ fontSize: '12.5px', color: '#64748b' }}>
              All reports format with official enterprise headers, color-coded quantum status indicators, and compliance certification badges.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Badge variant="pqc">NIST FIPS 203 / 204</Badge>
          <Badge variant="success">CYCLONEDX 1.6</Badge>
          <Badge variant="info">DIRECT PDF</Badge>
        </div>
      </div>

      {/* Grid of Report Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        
        {/* 1. Executive Quantum Risk Brief */}
        <Card title="Executive Quantum Risk Brief" subtitle="Board-level printable appraisal of enterprise PQC readiness">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Badge variant="critical">EXECUTIVE AUDIT</Badge>
              <Badge variant="info">VECTOR PDF</Badge>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
              Summarizes the estimated 2034 threat horizon, Mosca theorem deficits across core banking, key risk hotspots, and active migration progress for board members and compliance officers.
            </p>
            <div style={{ paddingTop: '8px', display: 'flex', gap: '10px' }}>
              <Button variant="primary" icon={FileText} onClick={handleDownloadExecutivePDF}>
                Download as PDF
              </Button>
            </div>
          </div>
        </Card>

        {/* 2. CBOM CycloneDX 1.6 Export */}
        <Card title="CycloneDX 1.6 CBOM Report" subtitle="Standardized machine-audited cryptographic bill of materials">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Badge variant="pqc">CYCLONEDX 1.6</Badge>
              <Badge variant="info">VECTOR PDF</Badge>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
              Official machine-audited catalog following the OWASP CycloneDX Cryptography Extension specification, detailing algorithms, key lengths, certificates, and detection evidence.
            </p>
            <div style={{ paddingTop: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Button variant="primary" icon={FileText} onClick={handleDownloadCBOMPDF}>
                Download as PDF
              </Button>
              <Button variant="outline" icon={FileJson} onClick={handleDownloadJSON}>
                Raw JSON
              </Button>
            </div>
          </div>
        </Card>

        {/* 3. Cryptographic Perimeter Inventory */}
        <Card title="Cryptographic Perimeter Inventory" subtitle="Comprehensive inventory register across enterprise microservices">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Badge variant="success">INVENTORY REGISTER</Badge>
              <Badge variant="default">1,284 ASSETS</Badge>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
              Multi-page catalog table containing asset IDs, owning applications, classical and quantum risk classifications, cipher modes, and designated migration runways.
            </p>
            <div style={{ paddingTop: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Button variant="primary" icon={FileText} onClick={handleDownloadInventoryPDF}>
                Download as PDF
              </Button>
              <Button variant="outline" icon={FileSpreadsheet} onClick={handleDownloadCSV}>
                Raw CSV
              </Button>
            </div>
          </div>
        </Card>

        {/* 4. Mosca Exposure Report */}
        <Card title="Mosca Quantum Timing Calculus" subtitle="Data retention vs threat horizon mathematical exposure">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Badge variant="warning">MOSCA THEOREM</Badge>
              <Badge variant="info">VECTOR PDF</Badge>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
              Per-application assessment of data shelf-life (X), migration time (Y), threat horizon (Z), and calculated protection margin deficits (Z - (X + Y)) with color-coded risk indicators.
            </p>
            <div style={{ paddingTop: '8px', display: 'flex', gap: '10px' }}>
              <Button variant="primary" icon={FileText} onClick={handleDownloadMoscaPDF}>
                Download as PDF
              </Button>
            </div>
          </div>
        </Card>

        {/* 5. NIST PQC Migration Roadmap */}
        <Card title="NIST PQC Migration Roadmap" subtitle="Execution tracking, stage gates, and algorithm transitions">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Badge variant="pqc">FIPS 203 / 204</Badge>
              <Badge variant="info">VECTOR PDF</Badge>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
              Detailed operational transition plan mapping classical algorithms (RSA, ECDSA) to Post-Quantum standards (ML-KEM, ML-DSA, SLH-DSA) with assigned squads and target completion dates.
            </p>
            <div style={{ paddingTop: '8px', display: 'flex', gap: '10px' }}>
              <Button variant="primary" icon={FileText} onClick={handleDownloadMigrationPlanPDF}>
                Download as PDF
              </Button>
            </div>
          </div>
        </Card>

        {/* 6. Master Compliance Dossier */}
        <Card title="Master Compliance Dossier" subtitle="Comprehensive all-in-one multi-dimensional audit report">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Badge variant="critical">MASTER DOSSIER</Badge>
              <Badge variant="success">CERTIFICATE OF AUDIT</Badge>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
              Comprehensive multi-section audit package combining the executive summary, Mosca calculus, CBOM highlights, migration runways, and formal compliance certificate in one document.
            </p>
            <div style={{ paddingTop: '8px', display: 'flex', gap: '10px' }}>
              <Button 
                variant="primary" 
                icon={FileText} 
                onClick={handleDownloadMasterDossierPDF}
                style={{ background: '#0f172a', borderColor: '#0f172a' }}
              >
                Download Master Dossier (PDF)
              </Button>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
