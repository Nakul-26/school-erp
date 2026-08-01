import React from 'react';
import { Shield, Calendar, BookOpen } from 'lucide-react';

interface ProgramsKpiCardsProps {
  totalProgramsCount: number;
  semesterEnabledCount: number;
  creditSystemCount: number;
}

export function ProgramsKpiCards({ totalProgramsCount, semesterEnabledCount, creditSystemCount }: ProgramsKpiCardsProps) {
  return (
    <div className="classes-grid-79">
      <div className="card classes-program-kpi-card">
        <div className="classes-div-81">
          <Shield size={24} />
        </div>
        <div>
          <span className="classes-span-82">Total Active</span>
          <span className="classes-span-83">{totalProgramsCount}</span>
        </div>
      </div>

      <div className="card classes-program-kpi-card">
        <div className="classes-div-85">
          <Calendar size={24} />
        </div>
        <div>
          <span className="classes-span-86">Semester Based</span>
          <span className="classes-span-87">{semesterEnabledCount}</span>
        </div>
      </div>

      <div className="card classes-program-kpi-card">
        <div className="classes-div-89">
          <BookOpen size={24} />
        </div>
        <div>
          <span className="classes-span-90">Credit System</span>
          <span className="classes-span-91">{creditSystemCount}</span>
        </div>
      </div>
    </div>
  );
}
