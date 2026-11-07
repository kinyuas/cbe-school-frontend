// src/pages/parent/components/AttendanceTab.jsx
import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { FiCalendar, FiAlertCircle } from 'react-icons/fi';

const AttendanceTab = ({ pupil }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/parent/attendance/${pupil._id}`);
        setData(res.data?.data || null);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [pupil._id]);

  if (loading) return <div className="text-center py-12 text-sm text-gray-500">Loading attendance…</div>;
  if (!data) return (
    <div className="bg-white rounded-xl shadow p-12 text-center">
      <FiCalendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-sm text-gray-600">Attendance is not yet tracked for this pupil.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-600 uppercase">Present</p>
          <p className="text-2xl font-bold text-green-600">{data.present || 0}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-600 uppercase">Absent</p>
          <p className="text-2xl font-bold text-red-600">{data.absent || 0}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-600 uppercase">Late</p>
          <p className="text-2xl font-bold text-yellow-600">{data.late || 0}</p>
        </div>
      </div>

      {data.recent && data.recent.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-800 mb-2">Recent Records</h3>
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-2 py-1.5">Date</th>
                <th className="text-left px-2 py-1.5">Status</th>
                <th className="text-left px-2 py-1.5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.recent.slice(0, 20).map((r, i) => (
                <tr key={i}>
                  <td className="px-2 py-1.5">{new Date(r.date).toLocaleDateString()}</td>
                  <td className={`px-2 py-1.5 font-semibold ${
                    r.status === 'present' ? 'text-green-600' :
                    r.status === 'late' ? 'text-yellow-600' : 'text-red-600'
                  }`}>{r.status}</td>
                  <td className="px-2 py-1.5 text-gray-600">{r.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.missedAssignments && data.missedAssignments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-4">
          <h3 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
            <FiAlertCircle /> Missed Assignments / Tasks
          </h3>
          <ul className="space-y-1 text-sm">
            {data.missedAssignments.map((a, i) => (
              <li key={i} className="text-gray-700">
                • <strong>{a.title}</strong> — due {new Date(a.dueDate).toLocaleDateString()}
                {a.teacherNote && <span className="text-xs text-gray-500 italic"> ({a.teacherNote})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AttendanceTab;