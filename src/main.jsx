import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { NhostClient, NhostProvider } from "@nhost/react"
import "./index.css"
import App from "./App.jsx"

const subdomain = import.meta.env.VITE_NHOST_SUBDOMAIN
const region = import.meta.env.VITE_NHOST_REGION
const authUrl = import.meta.env.VITE_NHOST_AUTH_URL
const graphqlUrl = import.meta.env.VITE_NHOST_GRAPHQL_URL
const storageUrl = import.meta.env.VITE_NHOST_STORAGE_URL

function MissingConfig() {
  return (
    <main style={{ maxWidth: 760, margin: "40px auto", fontFamily: "sans-serif", padding: 16 }}>
      <h1>Nhost configuration missing</h1>
      <p>
        Add <strong>VITE_NHOST_SUBDOMAIN</strong> and <strong>VITE_NHOST_REGION</strong> to your .env file,
        then restart the dev server.
      </p>
      <p>
        Or provide direct URLs with <strong>VITE_NHOST_AUTH_URL</strong> and <strong>VITE_NHOST_GRAPHQL_URL</strong>.
      </p>
    </main>
  )
}

const nhostConfig = authUrl && graphqlUrl
  ? {
      authUrl,
      graphqlUrl,
      storageUrl,
    }
  : subdomain && region
    ? {
        subdomain,
        region,
      }
    : null

const nhost = nhostConfig ? new NhostClient(nhostConfig) : null

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {nhost ? (
      <NhostProvider nhost={nhost}>
        <App />
      </NhostProvider>
    ) : (
      <MissingConfig />
    )}
  </StrictMode>,
)
