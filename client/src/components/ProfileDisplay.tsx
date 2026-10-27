import { useState } from 'react'
import { apiClient } from '../api/client'
import { Edit2, Save, X } from 'lucide-react'
import type { Profile } from '../types'

interface ProfileDisplayProps {
  profile: Profile
  onProfileUpdated: (profile: Profile) => void
}

export default function ProfileDisplay({ profile, onProfileUpdated }: ProfileDisplayProps) {
  const [editingProfile, setEditingProfile] = useState(profile)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updated = await apiClient.updateProfile(editingProfile)
      onProfileUpdated(updated)
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to update profile:', err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2>Your Profile</h2>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="btn-secondary flex items-center gap-2"
          >
            {isEditing ? <X size={18} /> : <Edit2 size={18} />}
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {/* Basic Info */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProfile.name || ''}
                  onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                  className="input-base"
                />
              ) : (
                <p className="text-slate-700">{editingProfile.name || 'Not provided'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              {isEditing ? (
                <input
                  type="email"
                  value={editingProfile.email || ''}
                  onChange={(e) => setEditingProfile({ ...editingProfile, email: e.target.value })}
                  className="input-base"
                />
              ) : (
                <p className="text-slate-700">{editingProfile.email || 'Not provided'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProfile.location || ''}
                  onChange={(e) => setEditingProfile({ ...editingProfile, location: e.target.value })}
                  className="input-base"
                />
              ) : (
                <p className="text-slate-700">{editingProfile.location || 'Not provided'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editingProfile.phone || ''}
                  onChange={(e) => setEditingProfile({ ...editingProfile, phone: e.target.value })}
                  className="input-base"
                />
              ) : (
                <p className="text-slate-700">{editingProfile.phone || 'Not provided'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Skills ({editingProfile.skills.length})</h3>
          <div className="flex flex-wrap gap-2">
            {editingProfile.skills.map((skill, idx) => (
              <span key={idx} className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                {skill.name}
              </span>
            ))}
          </div>
        </div>

        {/* Experience */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Experience ({editingProfile.experience.length})</h3>
          <div className="space-y-4">
            {editingProfile.experience.map((exp, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-lg">
                <p className="font-semibold">{exp.title} at {exp.company}</p>
                <p className="text-sm text-slate-600">{exp.years} years</p>
                {exp.description && <p className="text-sm mt-2">{exp.description}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Education */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Education ({editingProfile.education.length})</h3>
          <div className="space-y-2">
            {editingProfile.education.map((edu, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                <p className="font-semibold">{edu.degree} in {edu.field || 'Not specified'}</p>
                <p className="text-sm text-slate-600">{edu.institution}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        {isEditing && (
          <div className="mt-6 flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-success flex items-center gap-2"
            >
              <Save size={18} /> {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
