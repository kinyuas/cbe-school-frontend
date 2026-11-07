// src/pages/parent/components/SbaTimelineTab.jsx
import React from 'react';
import { FiClock } from 'react-icons/fi';

const SbaTimelineTab = ({ pupil }) => {
  const termWindows = [
    { term: 'Term 1', window: 'January – April',  focus: 'Baseline + Mid-term assessments', color: 'bg-blue-500' },
    { term: 'Term 2', window: 'May – August',     focus: 'Mid-year SBA + Projects',          color: 'bg-green-500' },
    { term: 'Term 3', window: 'September – December', focus: 'End-of-year SBA + Reporting',  color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 text-white">
        <h2 className="font-bold text-sm flex items-center gap-2"><FiClock /> School-Based Assessment (SBA) Timeline</h2>
        <p className="text-xs opacity-90 mt-1">
          Keep track of what to expect and how you can support {pupil.name.split(' ')[0]} at home.
        </p>
      </div>

      <div className="space-y-3">
        {termWindows.map((t, i) => (
          <div key={t.term} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex gap-3">
            <div className={`w-2 rounded-full ${t.color}`} />
            <div className="flex-1">
              <div className="flex justify-between items-start flex-wrap">
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">{t.term}</h3>
                  <p className="text-xs text-gray-500">{t.window}</p>
                </div>
                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Focus</span>
              </div>
              <p className="text-sm text-gray-700 mt-2">{t.focus}</p>
              <p className="text-xs text-gray-500 mt-2 italic">
                Tip: Ensure {pupil.name.split(' ')[0]} completes homework on time and reports any learning challenges early.
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SbaTimelineTab;