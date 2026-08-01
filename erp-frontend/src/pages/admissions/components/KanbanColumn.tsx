import React from 'react';
import type { BoardStage } from '../admissions.types';

interface KanbanColumnProps {
  stage: BoardStage;
  icon: React.ReactNode;
  title: string;
  count: number;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  children: React.ReactNode;
}

export function KanbanColumn({ icon, title, count, isDragOver, onDragOver, onDragLeave, onDrop, children }: KanbanColumnProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="admissions-column"
      style={{
        border: isDragOver ? '2px dashed var(--primary)' : '1px solid var(--border)'
      }}
    >
      <div className="admissions-row-16">
        <h3 className="admissions-row-17">
          {icon}
          {title}
        </h3>
        <span className="admissions-span-19">
          {count}
        </span>
      </div>

      <div className="admissions-col-20">
        {children}
      </div>
    </div>
  );
}
