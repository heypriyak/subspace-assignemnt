import { useCallback, useEffect, useMemo, useState } from "react"
import "./App.css"

const SESSION_STORAGE_KEY = "subspace-auth-session"

const GET_TODOS = `
  query GetTodos {
    todos(order_by: { created_at: desc }) {
      id
      title
      is_completed
      created_at
      user_id
    }
  }
`

const ADD_TODO = `
  mutation AddTodo($title: String!, $userId: uuid!) {
    insert_todos(objects: { title: $title, is_completed: false, user_id: $userId }) {
      returning {
        id
      }
    }
  }
`

const UPDATE_TODO = `
  mutation UpdateTodo($id: uuid!, $is_completed: Boolean!) {
    update_todos_by_pk(pk_columns: { id: $id }, _set: { is_completed: $is_completed }) {
      id
    }
  }
`

const DELETE_TODO = `
  mutation DeleteTodo($id: uuid!) {
    delete_todos_by_pk(id: $id) {
      id
    }
  }
`

function App({ authUrl, graphqlUrl }) {
  const [session, setSession] = useState(() => {
    const savedSession = window.localStorage.getItem(SESSION_STORAGE_KEY)
    return savedSession ? JSON.parse(savedSession) : null
  })

  const saveSession = useCallback((nextSession) => {
    setSession(nextSession)

    if (nextSession) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession))
      return
    }

    window.localStorage.removeItem(SESSION_STORAGE_KEY)
  }, [])

  return session?.accessToken
    ? <TodoScreen graphqlUrl={graphqlUrl} session={session} onSessionChange={saveSession} authUrl={authUrl} />
    : <AuthScreen authUrl={authUrl} onSessionChange={saveSession} />
}

function AuthScreen({ authUrl, onSessionChange }) {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeError, setActiveError] = useState("")

  const authRequest = useCallback(async (path, payload) => {
    const response = await fetch(`${authUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok || data.error) {
      throw new Error(data.message || data.error?.message || data.error || "Authentication failed")
    }

    return data
  }, [authUrl])

  async function onSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setActiveError("")

    try {
      const data = isSignup
        ? await authRequest("/signup/email-password", { email, password })
        : await authRequest("/signin/email-password", { email, password })

      if (data.session) {
        onSessionChange(data.session)
        return
      }

      if (data.mfa) {
        throw new Error("Multi-factor authentication is enabled and not handled in this demo app")
      }

      throw new Error("Authentication did not return a session")
    } catch (requestError) {
      setActiveError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="container">
      <section className="card">
        <h1>{isSignup ? "Create account" : "Sign in"}</h1>
        <p className="muted">Use your Nhost email/password credentials.</p>

        <form onSubmit={onSubmit} className="stack">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
          </label>

          <button type="submit" disabled={isSubmitting}>
            {isSignup ? "Sign up" : "Sign in"}
          </button>
        </form>

        {activeError ? <p className="error">{activeError}</p> : null}

        <button
          type="button"
          className="link"
          onClick={() => setIsSignup((value) => !value)}
        >
          {isSignup ? "Already have an account? Sign in" : "Need an account? Sign up"}
        </button>
      </section>
    </main>
  )
}

function TodoScreen({ graphqlUrl, session, onSessionChange, authUrl }) {
  const user = session?.user

  const [title, setTitle] = useState("")
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const endpoint = useMemo(() => graphqlUrl, [graphqlUrl])

  const graphqlRequest = useCallback(async (query, variables = {}) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ query, variables }),
    })

    const payload = await response.json()

    if (!response.ok || payload.errors) {
      throw new Error(payload.errors?.[0]?.message || "GraphQL request failed")
    }

    return payload.data
  }, [endpoint, session.accessToken])

  const loadTodos = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      const data = await graphqlRequest(GET_TODOS)
      setTodos(data.todos)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [graphqlRequest])

  useEffect(() => {
    loadTodos()
  }, [loadTodos])

  async function addTodo(event) {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle || !user?.id) {
      return
    }

    try {
      setError("")
      await graphqlRequest(ADD_TODO, {
        title: trimmedTitle,
        userId: user.id,
      })
      setTitle("")
      await loadTodos()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function toggleTodo(todo) {
    try {
      setError("")
      await graphqlRequest(UPDATE_TODO, {
        id: todo.id,
        is_completed: !todo.is_completed,
      })
      await loadTodos()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function removeTodo(id) {
    try {
      setError("")
      await graphqlRequest(DELETE_TODO, { id })
      await loadTodos()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function signOut() {
    try {
      await fetch(`${authUrl}/signout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          refreshToken: session.refreshToken,
          all: false,
        }),
      })
    } finally {
      onSessionChange(null)
    }
  }

  return (
    <main className="container">
      <section className="card">
        <div className="header-row">
          <div>
            <h1>Todo App</h1>
            <p className="muted">Signed in as {user?.email}</p>
          </div>
          <button type="button" onClick={signOut}>
            Sign out
          </button>
        </div>

        <form onSubmit={addTodo} className="row">
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What do you need to do?"
            maxLength={120}
          />
          <button type="submit">Add</button>
        </form>

        {error ? <p className="error">{error}</p> : null}

        {loading ? (
          <p className="muted">Loading todos...</p>
        ) : (
          <ul className="todo-list">
            {todos.length === 0 ? (
              <li className="muted">No todos yet.</li>
            ) : (
              todos.map((todo) => (
                <li key={todo.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={todo.is_completed}
                      onChange={() => toggleTodo(todo)}
                    />
                    <span className={todo.is_completed ? "done" : ""}>{todo.title}</span>
                  </label>
                  <button type="button" className="danger" onClick={() => removeTodo(todo.id)}>
                    Delete
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </section>
    </main>
  )
}

export default App
