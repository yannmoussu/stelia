const API_BASE_URL = 'http://localhost:3000/api';

export const consultationService = {
  async getConsultations(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/consultations`);
    if (!response.ok) {
      throw new Error('Failed to fetch consultations');
    }
    return response.json();
  },

  async getConsultation(id: string): Promise<any | null> {
    const response = await fetch(`${API_BASE_URL}/consultations/${id}`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error('Failed to fetch consultation');
    }
    return response.json();
  },

  async createConsultation(data: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/consultations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create consultation');
    }
    return response.json();
  },

  async updateConsultation(id: string, data: any): Promise<any | null> {
    const response = await fetch(`${API_BASE_URL}/consultations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error('Failed to update consultation');
    }
    return response.json();
  },

  async deleteConsultation(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/consultations/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete consultation');
    }
  },

  async clearStorage(): Promise<void> {
    // This is not implemented on the backend for security reasons
    console.warn('clearStorage is not supported by the backend API');
  },
};
