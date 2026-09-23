import SearchInput from '../../components/ui/SearchInput';
import Button from '../../components/ui/Button';
import { Download, X } from 'lucide-react';
import { applications } from '../../mock/applications';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function InventoryToolbar({
  search,
  onSearchChange,
  riskFilter,
  onRiskFilterChange,
  quantumFilter,
  onQuantumFilterChange,
  appFilter = 'all',
  onAppFilterChange = () => {},
  purposeFilter = 'all',
  onPurposeFilterChange = () => {},
  onResetFilters,
  onExportCSV
}) {
  const hasActiveFilters = Boolean(
    search ||
    riskFilter !== 'all' ||
    quantumFilter !== 'all' ||
    appFilter !== 'all' ||
    purposeFilter !== 'all'
  );

  const riskItems = [
    { label: 'All Risk Bands', value: 'all' },
    { label: 'Critical Risk', value: 'critical' },
    { label: 'High Risk', value: 'high' },
    { label: 'Medium Risk', value: 'medium' },
    { label: 'Low Risk', value: 'low' },
  ];

  const quantumItems = [
    { label: 'All Quantum Statuses', value: 'all' },
    { label: 'Quantum Vulnerable', value: 'vulnerable' },
    { label: 'Classical Safe', value: 'safe' },
    { label: 'PQC Native', value: 'pqc_native' },
  ];

  const purposeItems = [
    { label: 'All Purposes', value: 'all' },
    { label: 'Digital Signature', value: 'digital_signature' },
    { label: 'Token Signing', value: 'token_signing' },
    { label: 'Key Exchange / KEX', value: 'key_exchange' },
    { label: 'Data At Rest', value: 'data_at_rest_encryption' },
  ];

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', flex: 1, minWidth: '280px' }}>
        <div style={{ width: '240px' }}>
          <SearchInput
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search ID, algorithm, app..."
          />
        </div>

        {/* Risk Filter */}
        <Select value={riskFilter} onValueChange={onRiskFilterChange} items={riskItems}>
          <SelectTrigger aria-label="Filter by Risk Band">
            <SelectValue placeholder="Risk Band" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Risk Bands</SelectLabel>
              {riskItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Quantum Status Filter */}
        <Select value={quantumFilter} onValueChange={onQuantumFilterChange} items={quantumItems}>
          <SelectTrigger aria-label="Filter by Quantum Status">
            <SelectValue placeholder="Quantum Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Quantum Exposure</SelectLabel>
              {quantumItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Application Filter */}
        <Select value={appFilter} onValueChange={onAppFilterChange}>
          <SelectTrigger aria-label="Filter by Application">
            <SelectValue placeholder="Application" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Applications</SelectLabel>
              <SelectItem value="all">All Applications</SelectItem>
              {applications.map((app) => (
                <SelectItem key={app.id} value={app.name}>
                  {app.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Purpose Filter */}
        <Select value={purposeFilter} onValueChange={onPurposeFilterChange} items={purposeItems}>
          <SelectTrigger aria-label="Filter by Cryptographic Purpose">
            <SelectValue placeholder="Cryptographic Purpose" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Crypto Purpose</SelectLabel>
              {purposeItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="outline" size="sm" icon={X} onClick={onResetFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      <div>
        <Button variant="secondary" size="sm" icon={Download} onClick={onExportCSV}>
          Export CSV
        </Button>
      </div>
    </div>
  );
}
