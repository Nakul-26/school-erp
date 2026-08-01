import React from 'react';

interface TimelineItem {
  title: string;
  description: string;
  date: string | null;
  completed: boolean;
}

interface TimelineTabProps {
  timelineItems: TimelineItem[];
}

export function TimelineTab({ timelineItems }: TimelineTabProps) {
  return (
    <div>
      <h3 className="student-details-title-135">Student Milestones Timeline</h3>

      <div className="student-details-col-136">
        {/* Vertical line indicator */}
        <div className="student-details-div-137" />

        {timelineItems.map((item, index) => (
          <div key={index} className="student-details-col-138">
            {/* Dot */}
            <div className={`student-details-timeline-dot ${item.completed ? 'is-completed' : ''}`} />

            <h5 className="student-details-row-139">
              {item.title}
              {item.completed ? (
                <span className="student-details-span-140">Completed</span>
              ) : (
                <span className="student-details-span-141">Pending</span>
              )}
            </h5>
            <p className="student-details-text-142">
              {item.description}
            </p>
            {item.date && (
              <span className="student-details-span-143">
                Date: {item.date}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
