import React from 'react';
import { Search } from 'lucide-react';

interface TeachersFiltersProps {
  search: string;
  setSearch: (val: string) => void;
  selectedDepartment: string;
  setSelectedDepartment: (val: string) => void;
  selectedDesignation: string;
  setSelectedDesignation: (val: string) => void;
  selectedStatus: string;
  setSelectedStatus: (val: string) => void;
  departments: any[];
  designations: string[];
}

export const TeachersFilters: React.FC<TeachersFiltersProps> = ({
  search,
  setSearch,
  selectedDepartment,
  setSelectedDepartment,
  selectedDesignation,
  setSelectedDesignation,
  selectedStatus,
  setSelectedStatus,
  departments,
  designations,
}) => {
  return (
    <div className="card filters teachers-filters-card">
      {/* Search */}
      <div className="search-container teachers-search-container">
        <Search size={18} />
        <input 
          type="text" 
          placeholder="Search by name, ID, or department..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search teachers"
        />
      </div>

      {/* Department Filter */}
      <div>
        <select value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)} aria-label="Filter by department">
          <option value="">All Departments</option>
          {departments.map(d => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Designation Filter */}
      <div>
        <select value={selectedDesignation} onChange={e => setSelectedDesignation(e.target.value)} aria-label="Filter by designation">
          <option value="">All Designations</option>
          {designations.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Status Filter */}
      <div>
        <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
          <option value="ON_LEAVE">ON LEAVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
        </select>
      </div>
    </div>
  );
};
