import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://fleet-pearl-psi.vercel.app';

interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string | undefined>;
}

class ApiClient {
  private token: string | null = null;
  private onUnauthorized: (() => void) | null = null;

  setOnUnauthorized(cb: () => void) {
    this.onUnauthorized = cb;
  }

  async getToken(): Promise<string | null> {
    if (this.token) return this.token;
    try {
      this.token = await SecureStore.getItemAsync('auth_token');
    } catch {
      this.token = null;
    }
    return this.token;
  }

  async setToken(token: string) {
    this.token = token;
    await SecureStore.setItemAsync('auth_token', token);
  }

  async clearToken() {
    this.token = null;
    await SecureStore.deleteItemAsync('auth_token');
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, params } = options;

    let url = `${API_BASE}${path}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, value);
      });
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    const token = await this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401) {
      await this.clearToken();
      this.onUnauthorized?.();
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async login(phone: string, password: string) {
    const result = await this.request<{
      token: string;
      user: { id: string; name: string; phone: string; role: string };
    }>('/api/auth/login', {
      method: 'POST',
      body: { phone, password },
    });
    await this.setToken(result.token);
    return result;
  }

  // Vehicles
  getVehicles() {
    return this.request<any[]>('/api/vehicles');
  }
  getVehicle(id: string) {
    return this.request<any>(`/api/vehicles/${id}`);
  }
  createVehicle(data: any) {
    return this.request<any>('/api/vehicles', { method: 'POST', body: data });
  }
  updateVehicle(id: string, data: any) {
    return this.request<any>(`/api/vehicles/${id}`, { method: 'PUT', body: data });
  }
  deleteVehicle(id: string) {
    return this.request<any>(`/api/vehicles/${id}`, { method: 'DELETE' });
  }

  // Employees
  getEmployees() {
    return this.request<any[]>('/api/employees');
  }
  getEmployee(id: string) {
    return this.request<any>(`/api/employees/${id}`);
  }
  createEmployee(data: any) {
    return this.request<any>('/api/employees', { method: 'POST', body: data });
  }
  updateEmployee(id: string, data: any) {
    return this.request<any>(`/api/employees/${id}`, { method: 'PUT', body: data });
  }
  deleteEmployee(id: string) {
    return this.request<any>(`/api/employees/${id}`, { method: 'DELETE' });
  }

  // Entries
  getEntries(params?: { vehicleId?: string; employeeId?: string; dateFrom?: string; dateTo?: string }) {
    return this.request<{ entries: any[]; total: number }>('/api/entries', { params: params as any });
  }
  createEntry(data: any) {
    return this.request<any>('/api/entries', { method: 'POST', body: data });
  }
  updateEntry(id: string, data: any) {
    return this.request<any>(`/api/entries/${id}`, { method: 'PUT', body: data });
  }
  deleteEntry(id: string) {
    return this.request<any>(`/api/entries/${id}`, { method: 'DELETE' });
  }

  // Dashboard
  getDashboardSummary(range?: string) {
    return this.request<any>('/api/dashboard/summary', { params: { range } });
  }

  // Reports
  getSalarySummary(range?: string) {
    return this.request<any>('/api/reports/salary-summary', { params: { range } });
  }
  getVehiclePnl(range?: string) {
    return this.request<any>('/api/reports/vehicle-pnl', { params: { range } });
  }
}

export const api = new ApiClient();
