import React from 'react';
import { Search, RefreshCw } from 'lucide-react';

interface ProgramsFiltersBarProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  statusFilter: 'ACTIVE' | 'ARCHIVED' | 'ALL';
  setStatusFilter: (v: 'ACTIVE' | 'ARCHIVED' | 'ALL') => void;
  deptFilter: string;
  setDeptFilter: (v: string) => void;
  degreeFilter: string;
  setDegreeFilter: (v: string) => void;
  durationFilter: string;
  setDurationFilter: (v: string) => void;
  departments: any[];
  institutionType: string;
  getProgramLabel: () => string;
  onRefresh: () => void;
}

export function ProgramsFiltersBar({
  searchQuery, setSearchQuery, statusFilter, setStatusFilter, deptFilter, setDeptFilter,
  degreeFilter, setDegreeFilter, durationFilter, setDurationFilter, departments, institutionType, getProgramLabel, onRefresh,
}: ProgramsFiltersBarProps) {
  return (
    <div className="card filters classes-program-filters-card">
      <div className="search-container classes-search-container">
        <Search size={18} color="var(--text-muted)" />
        <input
          type="text"
          placeholder={`Search by ${getProgramLabel().toLowerCase()} name or code...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="classes-input-94"
        />
      </div>
      <div className="classes-row-95">
        {institutionType !== 'school' && (
          <>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="classes-select-96">
              <option value="ALL">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select value={degreeFilter} onChange={(e) => setDegreeFilter(e.target.value)} className="classes-select-96">
              <option value="ALL">All Degree Types</option>
              <option value="UG">UG (Undergraduate)</option>
              <option value="PG">PG (Postgraduate)</option>
              <option value="Diploma">Diploma</option>
              <option value="Doctorate">Doctorate</option>
              <option value="Certificate">Certificate</option>
            </select>
            <select value={durationFilter} onChange={(e) => setDurationFilter(e.target.value)} className="classes-select-96">
              <option value="ALL">All Durations</option>
              <option value="1">1 Year / Cycle</option>
              <option value="2">2 Years</option>
              <option value="3">3 Years</option>
              <option value="4">4 Years</option>
              <option value="5">5 Years</option>
            </select>
          </>
        )}
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="classes-select-97">
          <option value="ACTIVE">Active Only</option>
          <option value="ARCHIVED">Archived Only</option>
          <option value="ALL">All Statuses</option>
        </select>
        <button className="btn btn-secondary classes-btn" onClick={onRefresh}>
          <RefreshCw size={14} /> Sync
        </button>
      </div>
    </div>
  );
}
