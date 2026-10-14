import { useSyncExternalStore } from "react"
import type { User } from "@/types/auth"

interface AuthState {
  token: string | null
  user: User | null
}

const TOKEN_KEY = "rehabmotion_access_token"
const USER_KEY = "rehabmotion_user"

function loadInitialState(): AuthState {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const userJson = localStorage.getItem(USER_KEY)
    const user = userJson ? (JSON.parse(userJson) as User) : null
    return { token, user }
  } catch {
    return { token: null, user: null }
  }
}

let currentState: AuthState = loadInitialState()
const listeners = new Set<() => void>()

function notifyListeners() {
  listeners.forEach((listener) => listener())
}

export const authStore = {
  getState(): AuthState {
    return currentState
  },

  getAccessToken(): string | null {
    return currentState.token
  },

  getUser(): User | null {
    return currentState.user
  },

  isAuthenticated(): boolean {
    return Boolean(currentState.token)
  },

  setAuth(token: string, user: User) {
    currentState = { token, user }
    try {
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    } catch {
      // Storage unavailable or quota exceeded
    }
    notifyListeners()
  },

  updateUser(updatedFields: Partial<User>) {
    if (!currentState.user) return
    const updatedUser = { ...currentState.user, ...updatedFields }
    currentState = { ...currentState, user: updatedUser }
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser))
    } catch {
      // Storage unavailable
    }
    notifyListeners()
  },

  clearAuth() {
    currentState = { token: null, user: null }
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    } catch {
      // Storage unavailable
    }
    notifyListeners()
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

export function useAuth(): AuthState {
  return useSyncExternalStore(authStore.subscribe, authStore.getState)
}
