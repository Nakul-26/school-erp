import React from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';

interface StudentsFiltersProps {
  search: string;
  setSearch: (val: string) => void;
  selectedProgram: string;
  setSelectedProgram: (val: string) => void;
  selectedSection: string;
  setSelectedSection: (val: string) => void;
  selectedAcademicYear: string;
  setSelectedAcademicYear: (val: string) => void;
  selectedStatus: string;
  setSelectedStatus: (val: string) => void;
  programs: any[];
  sections: any[];
  academicYears: any[];
  getProgramsLabel: () => string;
}

export const StudentsFilters: React.FC<StudentsFiltersProps> = ({
  search,
  setSearch,
  selectedProgram,
  setSelectedProgram,
  selectedSection,
  setSelectedSection,
  selectedAcademicYear,
  setSelectedAcademicYear,
  selectedStatus,
  setSelectedStatus,
  programs,
  sections,
  academicYears,
  getProgramsLabel,
}) => {
  const hasActiveFilters = search || selectedProgram || selectedSection || selectedAcademicYear || selectedStatus;

  const resetFilters = () => {
    setSearch('');
    setSelectedProgram('');
    setSelectedSection('');
    setSelectedAcademicYear('');
    setSelectedStatus('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
      {/* Preset Filter Quick Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Filter size={14} /> Quick Presets:
        </span>
        <button
          type="button"
          onClick={() => { setSelectedStatus(''); setSelectedSection(''); }}
          className={`btn ${!selectedStatus && !selectedSection ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem', borderRadius: '16px' }}
        >
          All Students
        </button>
        <button
          type="button"
          onClick={() => setSelectedStatus('ACTIVE')}
          className={`btn ${selectedStatus === 'ACTIVE' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem', borderRadius: '16px' }}
        >
          Active Only
        </button>
        <button
          type="button"
          onClick={() => setSelectedStatus('Archived')}
          className={`btn ${selectedStatus === 'Archived' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem', borderRadius: '16px' }}
        >
          Archived / Inactive
        </button>
        <button
          type="button"
          onClick={() => setSelectedStatus('GRADUATED')}
          className={`btn ${selectedStatus === 'GRADUATED' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem', borderRadius: '16px' }}
        >
          Graduated
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="btn btn-secondary"
            style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem', borderRadius: '16px', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#dc2626' }}
          >
            <RotateCcw size={12} /> Reset Filters
          </button>
        )}
      </div>

      <div className="card filters students-filters-card">
        {/* Search */}
        <div className="search-container students-search-container">
          <Search size={14} className="students-Search-30" />
          <input
            type="text"
            placeholder="Search by name, admission no, roll no, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="students-input-31"
            aria-label="Search students"
          />
        </div>

        {/* Program Filter */}
        <div className="students-div-32">
          <select className="students-select" value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)} aria-label={`Filter by ${getProgramsLabel()}`}>
            <option value="">All {getProgramsLabel()}</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Section Filter */}
        <div className="students-div-33">
          <select className="students-select" value={selectedSection} onChange={e => setSelectedSection(e.target.value)} aria-label="Filter by section">
            <option value="">All Sections</option>
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Academic Year Filter */}
        <div className="students-div-34">
          <select className="students-select" value={selectedAcademicYear} onChange={e => setSelectedAcademicYear(e.target.value)} aria-label="Filter by academic year">
            <option value="">All Academic Years</option>
            {academicYears.map(y => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="students-div-35">
          <select className="students-select" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="Archived">Archived</option>
            <option value="APPLIED">APPLIED</option>
            <option value="ADMITTED">ADMITTED</option>
            <option value="GRADUATED">GRADUATED</option>
            <option value="TRANSFERRED">TRANSFERRED</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="WITHDRAWN">WITHDRAWN</option>
          </select>
        </div>
      </div>
    </div>
  );
};
