import './PageGuidance.css';
import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface PageGuidanceProps {
  title: string;
  description: string;
  steps?: string[];
}

export const PageGuidance: React.FC<PageGuidanceProps> = ({ title, description, steps }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="page-guidance-div-1">
      <div onClick={() => setIsOpen(!isOpen)} className="page-guidance-row-2">
        <div className="page-guidance-row-3">
          <HelpCircle size={18} className="page-guidance-HelpCircle-4"  />
          <span className="page-guidance-span-5">Quick Guide: {title}</span>
        </div>
        <div className="page-guidance-row-6">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {isOpen && (
        <div className="page-guidance-div-7">
          <p className="page-guidance-text-8">{description}</p>
          {steps && steps.length > 0 && (
            <ul className="page-guidance-ul-9">
              {steps.map((step, idx) => (
                <li key={idx} className="page-guidance-li-10">{step}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
