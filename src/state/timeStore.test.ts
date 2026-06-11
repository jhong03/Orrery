import { beforeEach, describe, expect, it } from 'vitest'

import { MAX_JD, MIN_JD, SECONDS_PER_DAY } from '../ephemeris/time'
import { currentSpeed, SPEED_STEPS, useTimeStore } from './timeStore'

describe('time store', () => {
  beforeEach(() => {
    useTimeStore.setState({
      jd: 2461041.5, // 2026-01-01 00:00 UTC
      playing: true,
      speedIndex: 5, // 1 day per second
      direction: 1,
    })
  })

  it('advance moves the clock by speed * dt', () => {
    useTimeStore.getState().advance(2) // 2 real seconds at 1 day/s
    expect(useTimeStore.getState().jd).toBeCloseTo(2461043.5, 9)
  })

  it('advance does nothing while paused', () => {
    useTimeStore.setState({ playing: false })
    useTimeStore.getState().advance(10)
    expect(useTimeStore.getState().jd).toBe(2461041.5)
  })

  it('runs backwards when direction is -1', () => {
    useTimeStore.setState({ direction: -1 })
    useTimeStore.getState().advance(1)
    expect(useTimeStore.getState().jd).toBeCloseTo(2461040.5, 9)
  })

  it('clamps to the supported 1900-2100 range', () => {
    useTimeStore.setState({ jd: MAX_JD - 0.5, speedIndex: SPEED_STEPS.length - 1 })
    useTimeStore.getState().advance(60)
    expect(useTimeStore.getState().jd).toBe(MAX_JD)

    useTimeStore.setState({ jd: MIN_JD + 0.5, direction: -1 })
    useTimeStore.getState().advance(60)
    expect(useTimeStore.getState().jd).toBe(MIN_JD)
  })

  it('speed stepper saturates at both ends and tops out at 5 years/second', () => {
    const top = SPEED_STEPS[SPEED_STEPS.length - 1]
    expect(top).toBe(5 * 365.25 * SECONDS_PER_DAY)

    useTimeStore.setState({ speedIndex: SPEED_STEPS.length - 1 })
    useTimeStore.getState().stepSpeed(1)
    expect(useTimeStore.getState().speedIndex).toBe(SPEED_STEPS.length - 1)

    useTimeStore.setState({ speedIndex: 0 })
    useTimeStore.getState().stepSpeed(-1)
    expect(useTimeStore.getState().speedIndex).toBe(0)
    expect(currentSpeed(useTimeStore.getState())).toBe(1)
  })
})
