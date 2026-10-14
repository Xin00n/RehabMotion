import { authStore } from "@/features/auth/stores/auth-store"
import { handleMockRequest } from "@/lib/mock-handler"

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.data = data
  }
}

const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1"
// Normalize base URL so it doesn't end with a trailing slash
const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, "")

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, headers = {}, ...restOptions } = options

  const token = authStore.getAccessToken()
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  const url = `${API_BASE_URL}${normalizedEndpoint}`

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers as Record<string, string>),
  }

  try {
    const response = await fetch(url, {
      ...restOptions,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      if (response.status === 401 && token) {
        // Token kadaluarsa atau tidak valid di backend, hapus auth agar tidak terkunci di sesi mati
        authStore.clearAuth()
      }

      let errorData: unknown
      let errorMessage = `Request failed with status ${response.status}`

      try {
        errorData = await response.json()
        if (
          errorData &&
          typeof errorData === "object" &&
          "detail" in errorData &&
          typeof (errorData as { detail: unknown }).detail === "string"
        ) {
          errorMessage = (errorData as { detail: string }).detail
        }
      } catch {
        // Non-JSON response body
      }

      throw new ApiError(response.status, errorMessage, errorData)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return response.json() as Promise<T>
  } catch (err) {
    if (err instanceof ApiError) {
      throw err
    }
    // Fallback otomatis ke Mock Dev Handler jika backend FastAPI offline (NetworkError)
    const mockRes = handleMockRequest<T>(
      normalizedEndpoint,
      (restOptions.method as string) || "GET",
      body
    )
    if (mockRes !== undefined) {
      return mockRes
    }
    throw err
  }
}

export const api = {
  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return apiClient<T>(endpoint, { ...options, method: "GET" })
  },
  post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return apiClient<T>(endpoint, { ...options, method: "POST", body })
  },
  put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return apiClient<T>(endpoint, { ...options, method: "PUT", body })
  },
  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return apiClient<T>(endpoint, { ...options, method: "PATCH", body })
  },
  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return apiClient<T>(endpoint, { ...options, method: "DELETE" })
  },
}
