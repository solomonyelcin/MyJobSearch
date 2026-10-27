import axios, { AxiosInstance } from 'axios'
import type { Profile, Job, SearchFilters, ApiResponse } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

class JobSearchClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })
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
      '/profile',
      profile
    )

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update profile')
    }

    return response.data.data!
  }

  // Job search endpoints
  async searchJobs(filters: SearchFilters): Promise<Job[]> {
    const response = await this.client.get<ApiResponse<Job[]>>(
      '/jobs/search',
      { params: filters }
    )

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to search jobs')
    }

    return response.data.data || []
  }

  async getJobDetails(jobId: string): Promise<Job> {
    const response = await this.client.get<ApiResponse<Job>>(
      `/jobs/${jobId}`
    )

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get job details')
    }

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
