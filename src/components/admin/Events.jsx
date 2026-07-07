import React, { useState, useEffect } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import PublishEventModal from '../modals/PublishEventModal';
import toast from 'react-hot-toast';
import { FiCalendar, FiMapPin, FiTrash2, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState('');
  
  // Use Auth Context if available, otherwise get from localStorage as fallback
  const { user } = useAuth() || {};

  useEffect(() => {
    getUserInfo();
    fetchEvents();
  }, []);

  const getUserInfo = () => {
    try {
      // First try to get from Auth Context
      if (user) {
        setUserRole(user.role || user.userRole || 'teacher');
        setUserName(user.name || user.username || 'User');
        console.log('👤 User from Auth Context:', { role: user.role, name: user.name });
        return;
      }

      // Fallback to localStorage if Auth Context not available
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setUserRole(userData.role || userData.userRole || 'teacher');
      setUserName(userData.name || userData.username || 'User');
      console.log('👤 User from localStorage:', { role: userData.role, name: userData.name });
    } catch (e) {
      console.error('Error getting user info:', e);
      setUserRole('teacher');
      setUserName('User');
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/events');
      console.log('Events response:', response.data);
      
      let eventsData = [];
      if (response.data && response.data.success) {
        eventsData = response.data.data || [];
      } else if (Array.isArray(response.data)) {
        eventsData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        eventsData = response.data.data;
      }
      
      setEvents(eventsData);
    } catch (error) {
      console.error('Error fetching events:', error);
      if (error.response?.status === 403) {
        toast.error('You do not have permission to view events');
      } else if (error.response?.status === 401) {
        toast.error('Please login to view events');
      } else {
        toast.error('Error fetching events');
      }
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async (eventData) => {
    try {
      // Check if user has permission (admin only)
      if (userRole !== 'admin') {
        toast.error('Only administrators can publish events');
        return;
      }

      // Prepare event data with proper fields
      const formattedData = {
        title: eventData.title.trim(),
        description: eventData.description.trim(),
        date: eventData.date || new Date().toISOString().split('T')[0],
        venue: eventData.venue || '',
        organizer: eventData.organizer || userName || 'School Administration',
        isActive: true
      };

      console.log('📝 Publishing event:', formattedData);

      const response = await api.post('/events', formattedData);
      
      if (response.data.success) {
        const newEvent = response.data.data || response.data.event;
        setEvents([newEvent, ...events]);
        toast.success('Event published successfully');
        setIsModalOpen(false);
        // Refresh events to get latest data
        await fetchEvents();
      } else {
        toast.error(response.data.message || 'Error publishing event');
      }
    } catch (error) {
      console.error('Error publishing event:', error);
      
      // Handle specific error cases
      if (error.response?.status === 403) {
        toast.error('You do not have permission to publish events. Admin access required.');
      } else if (error.response?.status === 401) {
        toast.error('Please login again to publish events');
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to publish event. Please try again.');
      }
    }
  };

  const handleDelete = async (id) => {
    // Check if user has permission (admin only)
    if (userRole !== 'admin') {
      toast.error('Only administrators can delete events');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      const response = await api.delete(`/events/${id}`);
      if (response.data.success) {
        setEvents(events.filter(event => event._id !== id));
        toast.success('Event deleted successfully');
      } else {
        toast.error(response.data.message || 'Error deleting event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      if (error.response?.status === 403) {
        toast.error('You do not have permission to delete events');
      } else {
        toast.error('Error deleting event');
      }
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Date TBA';
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Layout title="Events Management" subtitle="Publish and manage school events">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  const isAdmin = userRole === 'admin';

  return (
    <Layout title="Events Management" subtitle="Publish and manage school events">
      {/* Permission Info Banner */}
      {!isAdmin && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-3 mb-4">
          <div className="flex items-start">
            <FiAlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="ml-3 text-sm text-yellow-700">
              <p>You are viewing events as a <strong>{userRole || 'teacher'}</strong>. 
              Only administrators can publish or delete events.</p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <button 
          onClick={() => setIsModalOpen(true)} 
          className={`btn-primary flex items-center gap-2 ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!isAdmin}
          title={!isAdmin ? 'Only administrators can publish events' : 'Publish a new event'}
        >
          <FiCalendar /> + Publish New Event
        </button>
        {!isAdmin && (
          <span className="text-xs text-gray-400 ml-2">(Admin only)</span>
        )}
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <FiCalendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Events Yet</h3>
          <p className="text-gray-500">
            {isAdmin 
              ? 'Click "Publish New Event" to create your first event' 
              : 'No events have been published yet. Check back later.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {events.map((event) => (
            <div key={event._id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800">{event.title}</h3>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <FiCalendar className="w-4 h-4" />
                      {formatDate(event.date)}
                    </span>
                    {event.venue && (
                      <span className="flex items-center gap-1">
                        <FiMapPin className="w-4 h-4" />
                        {event.venue}
                      </span>
                    )}
                    {event.organizer && (
                      <span className="text-gray-400">
                        Organizer: {event.organizer}
                      </span>
                    )}
                    {event.isActive === false && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 mt-3">{event.description}</p>
                  {event.createdBy && (
                    <p className="text-xs text-gray-400 mt-2">
                      Published by: {event.createdBy}
                    </p>
                  )}
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(event._id)}
                    className="text-red-600 hover:text-red-800 ml-4 p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete event"
                  >
                    <FiTrash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <PublishEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddEvent}
        userRole={userRole}
        userName={userName}
      />
    </Layout>
  );
};

export default Events;