import React from 'react';
import { Search } from 'lucide-react';

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
  return (
    <div className="card filters students-filters-card">
      {/* Search */}
      <div className="search-container students-search-container">
        <Search size={14} className="students-Search-30" />
        <input
          type="text"
          placeholder="Search by name, adm no, or roll no..."
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
          <option value="APPLIED">APPLIED</option>
          <option value="ADMITTED">ADMITTED</option>
          <option value="GRADUATED">GRADUATED</option>
          <option value="TRANSFERRED">TRANSFERRED</option>
          <option value="DROPPED">DROPPED</option>
          <option value="ALUMNI">ALUMNI</option>
        </select>
      </div>
    </div>
  );
};
