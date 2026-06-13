import { useState } from 'react'

const SEEN_KEY = 'orrery.onboarded'

interface Step {
  title: string
  body: string
  /** Placement class — each step's card sits near what it explains. */
  place: 'center' | 'hud' | 'hud-left'
}

const STEPS: Step[] = [
  {
    title: 'Welcome to Orrery',
    body: 'A live model of the solar system. Drag to orbit, scroll to zoom, and click any label to fly to that body.',
    place: 'center',
  },
  {
    title: 'Drive time',
    body: 'Play runs the clock; − and + change speed up to years per second, and the strip above scrubs a whole year. "Now" brings you back to the present.',
    place: 'hud',
  },
  {
    title: 'Find anything',
    body: 'Press Ctrl+K (or /) to search planets, moons, comets and upcoming eclipses. "Events" lists what is worth jumping to.',
    place: 'hud-left',
  },
  {
    title: 'Stand on Earth',
    body: 'Double-click the globe — or search a city — to stand on the surface and watch the real sky: sunrise, the stars, eclipses overhead and the aurora. "Events → Watch from ground" drops you in the right spot.',
    place: 'center',
  },
]

function seen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return true // can't persist → don't nag on every load
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* fine */
  }
}

/** Three coach marks on first visit; skippable, never shown again. */
export function Onboarding() {
  const [step, setStep] = useState(() => (seen() ? -1 : 0))
  if (step < 0) return null

  const close = () => {
    markSeen()
    setStep(-1)
  }
  const next = () => (step === STEPS.length - 1 ? close() : setStep(step + 1))
  const s = STEPS[step]

  return (
    <div
      className={`coach coach-${s.place}`}
      role="dialog"
      aria-label={`Tip ${step + 1} of ${STEPS.length}`}
    >
      <div className="coach-title">{s.title}</div>
      <p className="coach-body">{s.body}</p>
      <div className="coach-footer">
        <span className="coach-dots" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} className={`coach-dot${i === step ? ' coach-dot-on' : ''}`} />
          ))}
        </span>
        <span className="coach-actions">
          <button className="hud-btn coach-skip" onClick={close}>
            Skip
          </button>
          <button className="hud-btn coach-next" onClick={next} autoFocus>
            {step === STEPS.length - 1 ? 'Done' : 'Next'}
          </button>
        </span>
      </div>
    </div>
  )
}
