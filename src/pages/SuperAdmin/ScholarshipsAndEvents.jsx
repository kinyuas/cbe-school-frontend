// src/pages/SuperAdmin/ScholarshipsAndEvents.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiSearch,
  FiAward, FiCalendar, FiExternalLink, FiStar, FiGlobe, FiMapPin
} from 'react-icons/fi';

const EMPTY_FORM = {
  title: '', description: '', category: 'scholarship', scope: 'kenya',
  provider: '', venue: '', deadline: '', eventDate: '',
  targetLevels: '', linkUrl: '', linkLabel: 'Learn More',
  isActive: true, isFeatured: false, displayOrder: 0,
};

const ScholarshipsAndEvents = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCategory) params.category = filterCategory;
      if (search) params.search = search;
      const res = await api.get('/administrator/scholarships', { params });
      setItems(res.data.scholarships || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [filterCategory, search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingId(item._id);
    setForm({
      ...EMPTY_FORM,
      ...item,
      deadline: item.deadline ? item.deadline.slice(0, 10) : '',
      eventDate: item.eventDate ? item.eventDate.slice(0, 10) : '',
      targetLevels: (item.targetLevels || []).join(', '),
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        targetLevels: form.targetLevels
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
      };
      if (editingId) {
        await api.put(`/administrator/scholarships/${editingId}`, payload);
        toast.success('Updated successfully');
      } else {
        await api.post('/administrator/scholarships', payload);
        toast.success('Created successfully');
      }
      setShowModal(false);
      fetchItems();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await api.delete(`/administrator/scholarships/${id}`);
      toast.success('Deleted');
      fetchItems();
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FiAward className="text-yellow-400" /> Scholarships & National Events
            </h1>
            <p className="text-gray-400 text-sm">
              Global opportunities visible to all schools
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchItems} className="bg-gray-800 hover:bg-gray-700 p-2 rounded-lg">
              <FiRefreshCw />
            </button>
            <button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg flex items-center gap-2">
              <FiPlus /> Add New
            </button>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-3 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, provider, description..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-3 py-2 text-sm"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All categories</option>
            <option value="scholarship">Scholarships</option>
            <option value="event">Events</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-gray-800 rounded-xl">
            <FiAward className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No scholarships or events yet.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map(item => (
              <div key={item._id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-lg">{item.title}</h3>
                      {item.isFeatured && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded flex items-center gap-1">
                          <FiStar className="w-3 h-3" /> Featured
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        item.category === 'scholarship'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-purple-500/20 text-purple-300'
                      }`}>
                        {item.category}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-700 flex items-center gap-1">
                        {item.scope === 'kenya' ? <FiMapPin className="w-3 h-3" /> : <FiGlobe className="w-3 h-3" />}
                        {item.scope}
                      </span>
                      {!item.isActive && (
                        <span className="text-xs bg-red-900/40 text-red-300 px-2 py-0.5 rounded">Inactive</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-300 line-clamp-2">{item.description}</p>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-400">
                      {item.provider && <span>Provider: {item.provider}</span>}
                      {item.venue && <span>Venue: {item.venue}</span>}
                      {item.deadline && <span>Deadline: {new Date(item.deadline).toLocaleDateString()}</span>}
                      {item.eventDate && <span>Event date: {new Date(item.eventDate).toLocaleDateString()}</span>}
                      {item.linkUrl && (
                        <a href={item.linkUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline flex items-center gap-1">
                          <FiExternalLink className="w-3 h-3" /> {item.linkLabel}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(item)} className="p-2 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/40">
                      <FiEdit2 />
                    </button>
                    <button onClick={() => handleDelete(item._id)} className="p-2 bg-red-600/20 text-red-400 rounded hover:bg-red-600/40">
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl my-8 border border-gray-700">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit' : 'Add'} Scholarship / Event</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Title *</label>
                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-gray-700 rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description *</label>
                <textarea required rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-gray-700 rounded px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-gray-700 rounded px-3 py-2">
                    <option value="scholarship">Scholarship</option>
                    <option value="event">Event</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Scope</label>
                  <select value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })}
                    className="w-full bg-gray-700 rounded px-3 py-2">
                    <option value="kenya">Kenya</option>
                    <option value="international">International</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Provider / Organizer</label>
                  <input value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })}
                    className="w-full bg-gray-700 rounded px-3 py-2" placeholder="e.g. Mastercard Foundation" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Venue (for events)</label>
                  <input value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })}
                    className="w-full bg-gray-700 rounded px-3 py-2" placeholder="e.g. Nairobi" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Deadline (scholarships)</label>
                  <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
                    className="w-full bg-gray-700 rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Event Date</label>
                  <input type="date" value={form.eventDate} onChange={e => setForm({ ...form, eventDate: e.target.value })}
                    className="w-full bg-gray-700 rounded px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Target Levels (comma separated)</label>
                <input value={form.targetLevels} onChange={e => setForm({ ...form, targetLevels: e.target.value })}
                  className="w-full bg-gray-700 rounded px-3 py-2" placeholder="e.g. Form 4, Grade 9" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Link URL</label>
                  <input type="url" value={form.linkUrl} onChange={e => setForm({ ...form, linkUrl: e.target.value })}
                    className="w-full bg-gray-700 rounded px-3 py-2" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Link Label</label>
                  <input value={form.linkLabel} onChange={e => setForm({ ...form, linkLabel: e.target.value })}
                    className="w-full bg-gray-700 rounded px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isFeatured} onChange={e => setForm({ ...form, isFeatured: e.target.checked })} />
                  Featured
                </label>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Order</label>
                  <input type="number" value={form.displayOrder} onChange={e => setForm({ ...form, displayOrder: e.target.value })}
                    className="w-full bg-gray-700 rounded px-2 py-1 text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 py-2 rounded-lg disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScholarshipsAndEvents;