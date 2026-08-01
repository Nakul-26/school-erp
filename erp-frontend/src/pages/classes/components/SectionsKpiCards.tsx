import React from 'react';
import { SlidersHorizontal, CheckCircle2, Info, Users } from 'lucide-react';

interface SectionsKpiCardsProps {
  totalSectionsCount: number;
  assignedTeachersCount: number;
  avgCapacity: number;
  enrolledStudentsCount: number;
}

export function SectionsKpiCards({ totalSectionsCount, assignedTeachersCount, avgCapacity, enrolledStudentsCount }: SectionsKpiCardsProps) {
  return (
    <div className="classes-grid-7">
      <div className="classes-row-8">
        <div className="classes-row-9">
          <SlidersHorizontal size={24} />
        </div>
        <div>
          <span className="classes-span-10">Total Sections</span>
          <span className="classes-span-11">{totalSectionsCount}</span>
        </div>
      </div>

      <div className="classes-row-12">
        <div className="classes-row-13">
          <CheckCircle2 size={24} />
        </div>
        <div>
          <span className="classes-span-14">Number of Class Teachers Assigned</span>
          <span className="classes-span-15">{assignedTeachersCount}</span>
        </div>
      </div>

      <div className="classes-row-16">
        <div className="classes-row-17">
          <Info size={24} />
        </div>
        <div>
          <span className="classes-span-18">Avg Capacity</span>
          <span className="classes-span-19">{avgCapacity}</span>
        </div>
      </div>

      <div className="classes-row-20">
        <div className="classes-row-21">
          <Users size={24} />
        </div>
        <div>
          <span className="classes-span-22">Active Enrolled</span>
          <span className="classes-span-23">{enrolledStudentsCount}</span>
        </div>
      </div>
    </div>
  );
}
