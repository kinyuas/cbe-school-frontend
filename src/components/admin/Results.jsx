// Results.js - Updated to use API
import React, { useState, useEffect } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiSearch, FiEye, FiAward } from 'react-icons/fi';

// ... (keep your existing competence levels and learning areas) ...

const Results = () => {
  const [pupils, setPupils] = useState([]);
  const [results, setResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPupil, setSelectedPupil] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch pupils from API
      const pupilsRes = await api.get('/pupils');
      if (pupilsRes.data?.success) {
        setPupils(pupilsRes.data.data || []);
      }

      // Fetch results from API
      const resultsRes = await api.get('/results');
      if (resultsRes.data?.success) {
        setResults(resultsRes.data.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getCompetenceLevel = (marks) => {
    for (const level of competenceLevels) {
      if (marks >= level.score) {
        return level;
      }
    }
    return competenceLevels[competenceLevels.length - 1];
  };

  const filteredPupils = pupils.filter(pupil =>
    pupil.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pupil.admNo?.includes(searchTerm) ||
    (pupil.upi && pupil.upi.includes(searchTerm))
  );

  const getPupilResults = (pupilId) => {
    return results.filter(r => {
      const rPupilId = r.pupilId?._id || r.pupilId || r.pupil_id;
      return rPupilId === pupilId;
    });
  };

  if (loading) {
    return (
      <Layout title="CBE Learning Outcomes" subtitle="Competency Based Assessment Results">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="CBE Learning Outcomes" subtitle="Competency Based Assessment Results">
      {/* Competence Level Guide */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-4 mb-6">
        <h3 className="text-md font-bold text-gray-800 mb-2 flex items-center gap-2">
          <FiAward className="text-blue-600" /> Competency Level Guide (CBE)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {competenceLevels.map((level) => (
            <div key={level.level} className="text-center">
              <div className={`w-3 h-3 rounded-full bg-${level.color}-500 mx-auto mb-1`}></div>
              <p className="text-xs font-semibold">{level.level}</p>
              <p className="text-xs text-gray-500">{level.score}+%</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by learner name, admission number, or UPI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Results List */}
      <div className="grid gap-4">
        {filteredPupils.map(pupil => {
          const pupilResults = getPupilResults(pupil._id);
          const averageScore = pupilResults.length > 0 
            ? pupilResults.reduce((sum, r) => sum + (r.marks || r.score || 0), 0) / pupilResults.length
            : 0;
          const competence = getCompetenceLevel(averageScore);
          
          return (
            <div key={pupil._id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{pupil.name}</h3>
                  <p className="text-sm text-gray-500">
                    Adm: {pupil.admNo} | UPI: {pupil.upi || 'N/A'} | Grade: {pupil.grade || pupil.class}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm font-medium">Competency Level:</span>
                    <span className={`px-2 py-1 text-xs rounded-full bg-${competence.color}-100 text-${competence.color}-800`}>
                      {competence.level}
                    </span>
                    <span className="text-sm text-gray-500">({averageScore.toFixed(1)}%)</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPupil(selectedPupil === pupil._id ? null : pupil._id)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <FiEye />
                </button>
              </div>
              
              {selectedPupil === pupil._id && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-semibold mb-3">Learning Areas Assessment</h4>
                  {pupilResults.length > 0 ? (
                    <div className="space-y-3">
                      {pupilResults.map(result => {
                        const resultCompetence = getCompetenceLevel(result.marks || result.score || 0);
                        return (
                          <div key={result._id || result.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium">{result.subject || result.examName || 'Assessment'}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{result.marks || result.score || 0}%</span>
                                <span className={`px-2 py-0.5 text-xs rounded-full bg-${resultCompetence.color}-100 text-${resultCompetence.color}-800`}>
                                  {resultCompetence.level}
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`bg-${resultCompetence.color}-500 rounded-full h-2 transition-all`}
                                style={{ width: `${result.marks || result.score || 0}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{result.examName || 'Assessment'} - {result.term || ''}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No learning outcomes recorded yet</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        
        {filteredPupils.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-500">No learners found matching your search</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Results;