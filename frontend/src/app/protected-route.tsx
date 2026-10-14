import { Navigate, Outlet, useLocation } from "react-router-dom"
import type { UserRole } from "@/types/auth"
import { useAuth } from "@/features/auth/stores/auth-store"

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
  children?: React.ReactNode
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { token, user } = useAuth()
  const location = useLocation()

  // 1. Belum login -> redirect ke /login
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // 2. Role tidak cocok -> redirect ke halaman unauthorized (/not-found dengan state reason)
  if (allowedRoles && (!user?.role || !allowedRoles.includes(user.role))) {
    return <Navigate to="/not-found" replace state={{ reason: "unauthorized" }} />
  }

  // 3. Izin valid -> tampilkan children atau Outlet
  return children ? <>{children}</> : <Outlet />
}
