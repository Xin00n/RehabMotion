import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@/styles/globals.css"
import App from "@/app/App"
import { ThemeProvider } from "@/app/theme-provider"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
)
