import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.jsx"

const subdomain = import.meta.env.VITE_NHOST_SUBDOMAIN
const region = import.meta.env.VITE_NHOST_REGION
const authUrl = import.meta.env.VITE_NHOST_AUTH_URL
const graphqlUrl = import.meta.env.VITE_NHOST_GRAPHQL_URL
const storageUrl = import.meta.env.VITE_NHOST_STORAGE_URL

const resolvedAuthUrl = authUrl || (subdomain && region
  ? `https://${subdomain}.auth.${region}.nhost.run/v1`
  : null)

const resolvedGraphqlUrl = graphqlUrl || (subdomain && region
  ? `https://${subdomain}.graphql.${region}.nhost.run/v1`
  : null)

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

const hasConfig = Boolean(resolvedAuthUrl && resolvedGraphqlUrl)

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {hasConfig ? (
      <App
        authUrl={resolvedAuthUrl}
        graphqlUrl={resolvedGraphqlUrl}
        storageUrl={storageUrl}
      />
    ) : (
      <MissingConfig />
    )}
  </StrictMode>,
)
