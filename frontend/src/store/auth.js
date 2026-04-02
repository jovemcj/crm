import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../api/index.js'

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password })
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
        set({ token: data.token, user: data.user })
        return data
      },

      logout: () => {
        delete api.defaults.headers.common['Authorization']
        set({ token: null, user: null })
      },

      setToken: (token) => {
        if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        set({ token })
      },
    }),
    {
      name: 'crm-auth',
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
        }
      },
    }
  )
)
