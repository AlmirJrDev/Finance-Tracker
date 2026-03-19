// src/service/api.ts
// Serviço central para chamadas ao backend

const API_URL =  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

class ApiService {
  private token: string | null = null

  setToken(token: string | null) {
    this.token = token
    if (token) {
      localStorage.setItem('auth_token', token)
    } else {
      localStorage.removeItem('auth_token')
    }
  }

  getToken(): string | null {
    if (this.token) return this.token
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token')
    }
    return this.token
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken()

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Erro na requisição')
    }

    return data
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────

  async loginWithGoogle(idToken: string) {
    const data = await this.request<{ success: boolean; data: { token: string; user: any } }>(
      '/api/auth/google',
      { method: 'POST', body: JSON.stringify({ idToken }) }
    )
    this.setToken(data.data.token)
    return data.data
  }

  async getMe() {
    return this.request<{ success: boolean; data: any }>('/api/auth/me')
  }

  // ─── Transações ───────────────────────────────────────────────────────────

  async getTransactions(params?: { year?: number; month?: number; type?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams(params as any).toString()
    return this.request<{ success: boolean; data: any[]; pagination: any }>(`/api/transactions?${query}`)
  }

  async getTransactionsByMonth(year: number, month: number) {
    return this.request<{ success: boolean; data: any[] }>(`/api/transactions/month/${year}/${month}`)
  }

  async createTransaction(data: {
    date: string
    description: string
    amount: number
    type: 'entrada' | 'saída'
    category?: string
    note?: string
  }) {
    return this.request<{ success: boolean; data: any }>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateTransaction(id: string, data: Partial<{
    date: string
    description: string
    amount: number
    type: 'entrada' | 'saída'
    category: string
    note: string
  }>) {
    return this.request<{ success: boolean; data: any }>(`/api/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteTransaction(id: string) {
    return this.request<{ success: boolean; message: string }>(`/api/transactions/${id}`, {
      method: 'DELETE',
    })
  }

  // ─── Recorrentes ──────────────────────────────────────────────────────────

  async getRecurring(active?: boolean) {
    const query = active !== undefined ? `?active=${active}` : ''
    return this.request<{ success: boolean; data: any[] }>(`/api/recurring-transactions${query}`)
  }

  async createRecurring(data: any) {
    return this.request<{ success: boolean; data: any }>('/api/recurring-transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateRecurring(id: string, data: any) {
    return this.request<{ success: boolean; data: any }>(`/api/recurring-transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteRecurring(id: string) {
    return this.request<{ success: boolean; message: string }>(`/api/recurring-transactions/${id}`, {
      method: 'DELETE',
    })
  }

  async applyRecurringToMonth(id: string, year: number, month: number) {
    return this.request<{ success: boolean; data: any[]; message: string }>(
      `/api/recurring-transactions/${id}/apply`,
      { method: 'POST', body: JSON.stringify({ year, month }) }
    )
  }

  // ─── Categorias ───────────────────────────────────────────────────────────

  async getCategories() {
    return this.request<{ success: boolean; data: any[] }>('/api/categories')
  }

  async createCategory(data: { name: string; color?: string; icon?: string; description?: string }) {
    return this.request<{ success: boolean; data: any }>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateCategory(id: string, data: any) {
    return this.request<{ success: boolean; data: any }>(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteCategory(id: string) {
    return this.request<{ success: boolean; message: string }>(`/api/categories/${id}`, {
      method: 'DELETE',
    })
  }

  async getCategoryStats(year: number, month: number) {
    return this.request<{ success: boolean; data: any[] }>(`/api/categories/stats/${year}/${month}`)
  }

  // ─── Resumos ──────────────────────────────────────────────────────────────

  async getMonthlySummary(year: number, month: number) {
    return this.request<{ success: boolean; data: any }>(`/api/monthly-summary/${year}/${month}`)
  }

  async getAllMonths() {
    return this.request<{ success: boolean; data: any[] }>('/api/monthly-data')
  }

  async getDailyBalance(year: number, month: number) {
    return this.request<{ success: boolean; data: any[] }>(`/api/balance/daily/${year}/${month}`)
  }
}

export const api = new ApiService()
export default api