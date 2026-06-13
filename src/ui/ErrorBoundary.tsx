import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** What to render once an error is caught. A function receives a reset
   *  callback so the fallback can offer "try again". */
  fallback: ReactNode | ((reset: () => void) => ReactNode)
  /** Side effect on catch (e.g. recover by leaving a broken sub-scene). */
  onError?: (error: Error, info: ErrorInfo) => void
  /** When any of these change, a caught error is cleared automatically — so a
   *  fixed condition (e.g. leaving surface mode) re-mounts the children. */
  resetKeys?: readonly unknown[]
  /** Label included in the logged message, to tell boundaries apart. */
  label?: string
}

interface State {
  error: Error | null
}

function keysChanged(a: readonly unknown[] = [], b: readonly unknown[] = []): boolean {
  return a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]))
}

/**
 * Render-error boundary. Catches errors thrown while rendering its subtree
 * (including R3F scene content and failed lazy-chunk loads) so one broken
 * piece degrades gracefully instead of blanking the whole app. It does NOT
 * catch async/event-handler errors — those subsystems already fail safe.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ''}]`, error)
    if (info.componentStack) console.error(info.componentStack)
    this.props.onError?.(error, info)
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && keysChanged(prev.resetKeys, this.props.resetKeys)) {
      this.setState({ error: null })
    }
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error !== null) {
      const { fallback } = this.props
      return typeof fallback === 'function' ? fallback(this.reset) : fallback
    }
    return this.props.children
  }
}

/** Full-screen fallback for a top-level (whole-app) crash. */
export function AppCrash({ reset }: { reset: () => void }) {
  return (
    <div className="crash" role="alert">
      <div className="crash-card">
        <h1 className="crash-title">The simulator hit a snag</h1>
        <p className="crash-body">
          Something went wrong while rendering. You can try to recover, or reload the page.
        </p>
        <div className="crash-actions">
          <button className="hud-btn" onClick={reset}>
            Try again
          </button>
          <button className="hud-btn hud-btn-active" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    </div>
  )
}
