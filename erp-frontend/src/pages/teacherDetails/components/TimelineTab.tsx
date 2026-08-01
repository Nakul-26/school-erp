import React from 'react';

interface TimelineTabProps {
  timelineEvents: any[];
  canWriteTimeline: boolean;
  onAddEvent: () => void;
}

export function TimelineTab({ timelineEvents, canWriteTimeline, onAddEvent }: TimelineTabProps) {
  return (
    <div className="card teacher-tab-panel-card">
      <div className="teacher-details-timeline-header-row">
        <h4 className="teacher-details-title-66 teacher-details-timeline-title">Action Audit Timeline</h4>
        {canWriteTimeline && (
          <button className="btn btn-secondary btn-sm" onClick={onAddEvent}>
            + Add Event Log
          </button>
        )}
      </div>

      <div className="teacher-details-timeline-log-list">
        {timelineEvents.map(evt => (
          <div key={evt.id} className="teacher-details-timeline-item-container">
            <div className="teacher-details-timeline-bullet-node" />
            <div className="teacher-details-timeline-date">{evt.date}</div>
            <h5 className="teacher-details-timeline-event-title">{evt.title}</h5>
            <p className="teacher-details-timeline-event-desc">{evt.desc}</p>
          </div>
        ))}
        {timelineEvents.length === 0 && (
          <div className="teacher-details-timeline-empty">No timeline logs present.</div>
        )}
      </div>
    </div>
  );
}
