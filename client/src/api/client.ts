import axios, { AxiosInstance } from 'axios'
import type { Profile, Job, ApiResponse, ApplicationKit, DiscoverResult } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

class JobSearchClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })
    this.client.interceptors.response.use(
      r => r,
      (err: unknown) => {
        const e = err as { response?: { data?: { error?: string } }; message?: string; code?: string }
        const msg = e.response?.data?.error || (e.code === 'ECONNABORTED' ? 'The request took too long. Please try again.' : e.message) || 'Something went wrong'
        return Promise.reject(new Error(msg))
      },
    )
  }

  // Resume endpoints
  async uploadResume(file: File): Promise<Profile> {
    const formData = new FormData()
    formData.append('resume', file)

    const response = await this.client.post<ApiResponse<Profile>>(
      '/resume/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to upload resume')
    }

    return response.data.data!
  }

  async extractProfile(text: string): Promise<Profile> {
    const response = await this.client.post<ApiResponse<Profile>>(
      '/resume/extract',
      { text }
    )

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to extract profile')
    }

    return response.data.data!
  }

  async updateProfile(profile: Profile): Promise<Profile> {
    const response = await this.client.put<ApiResponse<Profile>>(
      `/profile/${profile.id}`,
      profile
    )

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update profile')
    }

    return response.data.data!
  }

  // Job discovery & apply
  async aiStatus(): Promise<{ ai: boolean; model: string | null; adzuna: boolean }> {
    const response = await this.client.get<ApiResponse<{ ai: boolean; model: string | null; adzuna: boolean }>>('/jobs/ai-status')
    return response.data.data || { ai: false, model: null, adzuna: false }
  }

  async discoverJobs(params: { profile: Profile; query?: string; location?: string; remote?: boolean; useAI?: boolean }): Promise<DiscoverResult> {
    const response = await this.client.post<ApiResponse<DiscoverResult>>('/jobs/discover', params, { timeout: 120000 })
    if (!response.data.success) throw new Error(response.data.error || 'Failed to find jobs')
    return response.data.data!
  }

  async applyKit(profile: Profile, job: Job): Promise<ApplicationKit> {
    const response = await this.client.post<ApiResponse<ApplicationKit>>('/jobs/apply-kit', { profile, job }, { timeout: 90000 })
    if (!response.data.success) throw new Error(response.data.error || 'Failed to prepare application')
    return response.data.data!
  }

  // Match endpoints
  async calculateMatches(profile: Profile, jobs: Job[]): Promise<Job[]> {
    const response = await this.client.post<ApiResponse<Job[]>>(
      '/match',
      { profile, jobs }
    )

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to calculate matches')
    }

    return response.data.data || []
  }

  // Analytics endpoints
  async getScoreDistribution(jobs: Job[]): Promise<Record<string, number>> {
    const response = await this.client.post<ApiResponse<Record<string, number>>>(
      '/analytics/score-distribution',
      { jobs }
    )

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get score distribution')
    }

    return response.data.data || {}
  }

  async getTopSkills(jobs: Job[], profile: Profile): Promise<Array<{ skill: string; count: number }>> {
    const response = await this.client.post<ApiResponse<Array<{ skill: string; count: number }>>>(
      '/analytics/top-skills',
      { jobs, profile }
    )

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get top skills')
    }

    return response.data.data || []
  }
}

export const apiClient = new JobSearchClient()
