// src/components/ScholarshipsAndEventsWidget.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  FiAward, FiCalendar, FiExternalLink, FiGlobe, FiMapPin,
  FiStar, FiFilter, FiRefreshCw
} from 'react-icons/fi';

const ScholarshipsAndEventsWidget = ({ compact = false, title = 'Scholarships & National Events' }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | scholarship | event
  const [scope, setScope] = useState(''); // '' | kenya | international

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') params.category = filter;
      if (scope) params.scope = scope;
      if (compact) params.limit = 5;
      const res = await api.get('/public/scholarships-events', { params });
      setItems(res.data.data || []);
    } catch (e) {
      toast.error('Failed to load scholarships');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); /* eslint-disable-next-line */ }, [filter, scope]);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <FiAward className="text-yellow-500" /> {title}
        </h3>
        <div className="flex gap-2 items-center">
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="text-xs border rounded px-2 py-1">
            <option value="all">All</option>
            <option value="scholarship">Scholarships</option>
            <option value="event">Events</option>
          </select>
          <select value={scope} onChange={e => setScope(e.target.value)}
            className="text-xs border rounded px-2 py-1">
            <option value="">All regions</option>
            <option value="kenya">Kenya</option>
            <option value="international">International</option>
          </select>
          <button onClick={fetchItems} className="p-1 text-gray-500 hover:text-gray-700">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-sm text-gray-500 py-6">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-center text-sm text-gray-500 italic py-6">No scholarships or events available.</p>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item._id} className={`border-l-4 ${
              item.category === 'scholarship' ? 'border-blue-500' : 'border-purple-500'
            } pl-3 py-2 bg-gray-50 rounded-r-lg`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-gray-800 break-words">{item.title}</p>
                    {item.isFeatured && <FiStar className="w-3 h-3 text-yellow-500 flex-shrink-0" title="Featured" />}
                  </div>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1">
                      {item.scope === 'kenya' ? <FiMapPin className="w-3 h-3" /> : <FiGlobe className="w-3 h-3" />}
                      {item.scope}
                    </span>
                    {item.category === 'scholarship' && item.deadline && (
                      <span className="flex items-center gap-1"><FiCalendar className="w-3 h-3" /> Deadline: {formatDate(item.deadline)}</span>
                    )}
                    {item.category === 'event' && item.eventDate && (
                      <span className="flex items-center gap-1"><FiCalendar className="w-3 h-3" /> {formatDate(item.eventDate)}</span>
                    )}
                    {item.provider && <span>By: {item.provider}</span>}
                  </div>
                </div>
                {item.linkUrl && (
                  <a href={item.linkUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 flex items-center gap-1 flex-shrink-0">
                    <FiExternalLink className="w-3 h-3" /> {item.linkLabel || 'View'}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScholarshipsAndEventsWidget;