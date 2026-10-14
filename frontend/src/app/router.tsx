import { createBrowserRouter } from "react-router-dom"
import LandingPage from "@/pages/landing"
import RegisterPage from "@/pages/auth/register"
import LoginPage from "@/pages/auth/login"
import DashboardPage from "@/pages/dashboard"
import PatientDashboardPage from "@/pages/dashboard/patient"
import CaregiverDashboardPage from "@/pages/dashboard/caregiver"
import ClinicianDashboardPage from "@/pages/dashboard/clinician"
import ExercisesPage from "@/pages/exercises"
import SessionSetupPage from "@/pages/session-setup"
import SessionPlayPage from "@/pages/session-play"
import ProgressPage from "@/pages/progress"
import PatientDetailPage from "@/pages/patients/[id]"
import AccountPage from "@/pages/account"
import NotFoundPage from "@/pages/not-found"
import { ProtectedRoute } from "@/app/protected-route"
import { useAuth } from "@/features/auth/stores/auth-store"

function DashboardIndexRoute() {
  const { user } = useAuth()
  if (user?.role === "patient") {
    return <PatientDashboardPage />
  }
  if (user?.role === "caregiver") {
    return <CaregiverDashboardPage />
  }
  if (user?.role === "clinician") {
    return <ClinicianDashboardPage />
  }
  return <DashboardPage />
}

export const router = createBrowserRouter([
  // Rute Publik
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },

  // Rute Terproteksi
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <DashboardIndexRoute />
      </ProtectedRoute>
    ),
  },
  {
    path: "/dashboard/patient",
    element: (
      <ProtectedRoute allowedRoles={["patient"]}>
        <PatientDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/dashboard/caregiver",
    element: (
      <ProtectedRoute allowedRoles={["caregiver"]}>
        <CaregiverDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/dashboard/clinician",
    element: (
      <ProtectedRoute allowedRoles={["clinician"]}>
        <ClinicianDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/exercises",
    element: (
      <ProtectedRoute allowedRoles={["patient", "caregiver"]}>
        <ExercisesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/session-setup/:prescriptionId",
    element: (
      <ProtectedRoute allowedRoles={["patient", "caregiver"]}>
        <SessionSetupPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/session-play/:sessionId",
    element: (
      <ProtectedRoute allowedRoles={["patient", "caregiver"]}>
        <SessionPlayPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/progress",
    element: (
      <ProtectedRoute allowedRoles={["patient", "caregiver", "clinician"]}>
        <ProgressPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/patients/:id",
    element: (
      <ProtectedRoute allowedRoles={["clinician"]}>
        <PatientDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/account",
    element: (
      <ProtectedRoute>
        <AccountPage />
      </ProtectedRoute>
    ),
  },

  // Halaman 404 & Unauthorized
  {
    path: "/not-found",
    element: <NotFoundPage />,
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
])
