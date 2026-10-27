import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { apiClient } from '../api/client'
import type { Job, Profile } from '../types'

interface DashboardProps {
  jobs: Job[]
  profile: Profile
}

export default function Dashboard({ jobs, profile }: DashboardProps) {
  const [scoreDistribution, setScoreDistribution] = useState<Array<{ range: string; count: number }>>([])
  const [topSkills, setTopSkills] = useState<Array<{ skill: string; count: number }>>([])

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        // Calculate score distribution
        const distribution = {
          '0-50': jobs.filter(j => (j.matchScore || 0) < 50).length,
          '50-70': jobs.filter(j => (j.matchScore || 0) >= 50 && (j.matchScore || 0) < 70).length,
          '70-85': jobs.filter(j => (j.matchScore || 0) >= 70 && (j.matchScore || 0) < 85).length,
          '85+': jobs.filter(j => (j.matchScore || 0) >= 85).length,
        }
        setScoreDistribution(Object.entries(distribution).map(([range, count]) => ({ range, count })))

        // Get top skills
        const skills = await apiClient.getTopSkills(jobs, profile)
        setTopSkills(skills.slice(0, 10))
      } catch (err) {
        console.error('Failed to load analytics:', err)
      }
    }

    loadAnalytics()
  }, [jobs, profile])

  const avgScore = jobs.length > 0 ? Math.round(jobs.reduce((sum, j) => sum + (j.matchScore || 0), 0) / jobs.length) : 0
  const highMatchJobs = jobs.filter(j => (j.matchScore || 0) >= 80).length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-slate-600 text-sm mb-1">Total Jobs Found</div>
          <div className="text-3xl font-bold text-primary-600">{jobs.length}</div>
        </div>
        <div className="card">
          <div className="text-slate-600 text-sm mb-1">Average Match Score</div>
          <div className="text-3xl font-bold text-primary-600">{avgScore}%</div>
        </div>
        <div className="card">
          <div className="text-slate-600 text-sm mb-1">High Match Jobs</div>
          <div className="text-3xl font-bold text-success-600">{highMatchJobs}</div>
        </div>
        <div className="card">
          <div className="text-slate-600 text-sm mb-1">Your Skills</div>
          <div className="text-3xl font-bold text-primary-600">{profile.skills.length}</div>
        </div>
      </div>

      {/* Score Distribution */}
      {scoreDistribution.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Match Score Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Matched Skills */}
      {topSkills.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Top Matched Skills</h3>
          <div className="space-y-3">
            {topSkills.map((skill, idx) => (
              <div key={idx}>
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-slate-700">{skill.skill}</span>
                  <span className="text-sm text-slate-600">{skill.count} jobs</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full"
                    style={{ width: `${(skill.count / Math.max(...topSkills.map(s => s.count))) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
