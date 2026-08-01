import React from 'react';
import { Search, RefreshCw } from 'lucide-react';

interface SectionsFiltersBarProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filterYear: string;
  setFilterYear: (v: string) => void;
  filterProgram: string;
  setFilterProgram: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  years: any[];
  programs: any[];
  getProgramLabel: () => string;
  onRefresh: () => void;
}

export function SectionsFiltersBar({
  searchQuery, setSearchQuery, filterYear, setFilterYear, filterProgram, setFilterProgram,
  filterStatus, setFilterStatus, years, programs, getProgramLabel, onRefresh,
}: SectionsFiltersBarProps) {
  return (
    <div className="card filters classes-filters-card">
      <div className="search-container classes-search-container">
        <Search size={14} className="classes-Search-26" />
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by section name, room, or teacher..." className="classes-input-27" />
      </div>

      <div className="classes-filter-item">
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="classes-select-29">
          <option value="">All Academic Years</option>
          {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>
      </div>

      <div className="classes-filter-item">
        <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)} className="classes-select-30">
          <option value="">All {getProgramLabel()}s</option>
          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="classes-filter-item">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="classes-select-31">
          <option value="1">Active Only</option>
          <option value="0">Archived Only</option>
          <option value="">All Statuses</option>
        </select>
      </div>

      <div className="classes-filter-action">
        <button className="btn btn-secondary classes-btn" onClick={onRefresh}>
          <RefreshCw size={14} /> Sync
        </button>
      </div>
    </div>
  );
}
