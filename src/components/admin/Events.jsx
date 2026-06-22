import React, { useState, useEffect } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import PublishEventModal from '../modals/PublishEventModal';
import toast from 'react-hot-toast';
import { FiCalendar, FiMapPin } from 'react-icons/fi';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await api.get('/events');
      console.log('Events response:', response.data);
      
      // Handle different response formats
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
      toast.error('Error fetching events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async (eventData) => {
    try {
      const response = await api.post('/events', eventData);
      if (response.data.success) {
        setEvents([...events, response.data.data]);
        toast.success('Event published successfully');
        setIsModalOpen(false);
      } else {
        toast.error(response.data.message || 'Error publishing event');
      }
    } catch (error) {
      console.error('Error publishing event:', error);
      toast.error('Error publishing event');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
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
        toast.error('Error deleting event');
      }
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

  return (
    <Layout title="Events Management" subtitle="Publish and manage school events">
      <div className="mb-6">
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          + Publish New Event
        </button>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <FiCalendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Events Yet</h3>
          <p className="text-gray-500">Click "Publish New Event" to create your first event</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {events.map((event) => (
            <div key={event._id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800">{event.title}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <FiCalendar className="w-4 h-4" />
                      {event.date ? new Date(event.date).toLocaleDateString() : 'Date TBA'}
                    </span>
                    {event.venue && (
                      <span className="flex items-center gap-1">
                        <FiMapPin className="w-4 h-4" />
                        {event.venue}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 mt-3">{event.description}</p>
                  {event.organizer && (
                    <p className="text-sm text-gray-500 mt-2">Organizer: {event.organizer}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(event._id)}
                  className="text-red-600 hover:text-red-800 ml-4"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PublishEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddEvent}
      />
    </Layout>
  );
};

export default Events;