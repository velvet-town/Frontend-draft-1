import React, { useState } from 'react'
import { useAuthStore } from '../Zustad_Store/Auth_Store'
import { BACKEND_HTTP_URL } from '../PIXI/multiplayer/API_CALLS/config';
import { supabase } from '../lib/supabase';

interface TakeUserDataProps {
  open: boolean;
  onClose: () => void;
}

const Take_User_data: React.FC<TakeUserDataProps> = ({ open, onClose }) => {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    username: '',
    gender: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Use Zustand user if available, otherwise get Google user directly from Supabase
    let googleUser = user;
    if (!googleUser) {
      const { data } = await supabase.auth.getUser();
      googleUser = data.user ? {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.full_name || '',
        picture: data.user.user_metadata?.avatar_url
      } : null;
    }
    if (!googleUser) {
      setError('User not found');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`${BACKEND_HTTP_URL}/auth/update-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: googleUser.id,
          username: formData.username,
          gender: formData.gender,
          email: googleUser.email,
          profile_pic: googleUser.picture
        })
      });
      if (!res.ok) throw new Error('Failed to update user');
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } catch {
      setError('Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 w-96 shadow-2xl transform transition-all">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">User Information</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent outline-none transition-all"
              placeholder="Enter your username"
              required
            />
          </div>

          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
              Gender
            </label>
            <select
              id="gender"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent outline-none transition-all appearance-none bg-white"
              required
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-[#8B5CF6] text-white py-2 px-4 rounded-lg hover:bg-[#7C3AED] transition-colors duration-300"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Submit'}
          </button>
          {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
          {success && <div className="text-green-600 text-sm mt-2">Saved!</div>}
        </form>
      </div>
    </div>
  )
}

export default Take_User_data
