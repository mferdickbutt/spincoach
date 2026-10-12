const REST_LINEAR_MPS2 = 1.5
const SP_PER_MPS2 = 120
const MOTION_WINDOW_MS = 3000

type LinearSample = {
  x: number
  y: number
  z: number
}

type MotionSample =
  | { kind: 'linear'; sample: LinearSample }
  | { kind: 'gravity'; sample: LinearSample }

type MotionPermission = {
  requestPermission?: () => Promise<PermissionState>
}

type ActiveRun = {
  stop: () => void
}

export type SampleVerdict =
  | { kind: 'silent' }
  | { kind: 'still' }
  | { kind: 'recorded'; sp: number }

export type MotionVerdict = { kind: 'missing' } | { kind: 'denied' } | SampleVerdict

export type MotionHooks = {
  onListening: (seconds: number) => void
  onLiveSp: (sp: number) => void
  onVerdict: (verdict: MotionVerdict) => void
}

let active: ActiveRun | null = null

export function settleMotion(events: readonly unknown[]): SampleVerdict {
  let rest: LinearSample | null = null
  let peak = 0
  let saw = false
  for (const event of events) {
    const sample = readSample(event)
    if (!sample) {
      continue
    }
    saw = true
    switch (sample.kind) {
      case 'linear':
        peak = Math.max(peak, magnitude(sample.sample))
        break
      case 'gravity': {
        const next = restDelta(rest, sample.sample)
        rest = next.rest
        peak = Math.max(peak, next.delta)
        break
      }
      default: {
        const _never: never = sample
        return _never
      }
    }
  }
  if (!saw) {
    return { kind: 'silent' }
  }
  if (peak <= REST_LINEAR_MPS2) {
    return { kind: 'still' }
  }
  return { kind: 'recorded', sp: Math.round(peak * SP_PER_MPS2) }
}

export function runLaunchMotion(hooks: MotionHooks): void {
  cancelLaunchMotion()
  const run: ActiveRun = {
    stop() {},
  }
  active = run
  void arm(run, hooks)
}

export function cancelLaunchMotion(): void {
  if (!active) {
    return
  }
  active.stop()
  active = null
}

async function arm(run: ActiveRun, hooks: MotionHooks): Promise<void> {
  const permission = await requestMotionPermission()
  if (active !== run) {
    return
  }
  switch (permission) {
    case 'missing':
      active = null
      hooks.onVerdict({ kind: 'missing' })
      return
    case 'denied':
      active = null
      hooks.onVerdict({ kind: 'denied' })
      return
    case 'ok':
      break
    default: {
      const _never: never = permission
      return _never
    }
  }
  const events: unknown[] = []
  const onMotion = (event: Event) => {
    if (active !== run) {
      return
    }
    events.push(event)
    hooks.onLiveSp(liveSp(settleMotion(events)))
  }
  const timer = window.setTimeout(() => {
    if (active !== run) {
      return
    }
    window.removeEventListener('devicemotion', onMotion)
    active = null
    hooks.onVerdict(settleMotion(events))
  }, MOTION_WINDOW_MS)
  run.stop = () => {
    window.clearTimeout(timer)
    window.removeEventListener('devicemotion', onMotion)
  }
  window.addEventListener('devicemotion', onMotion)
  hooks.onListening(MOTION_WINDOW_MS / 1000)
}

function liveSp(verdict: SampleVerdict): number {
  switch (verdict.kind) {
    case 'recorded':
      return verdict.sp
    case 'silent':
    case 'still':
      return 0
    default: {
      const _never: never = verdict
      return _never
    }
  }
}

function readSample(event: unknown): MotionSample | null {
  if (typeof event !== 'object' || event === null) {
    return null
  }
  if ('acceleration' in event) {
    const linear = axes(event.acceleration)
    if (linear) {
      return { kind: 'linear', sample: linear }
    }
  }
  if (!('accelerationIncludingGravity' in event)) {
    return null
  }
  const gravity = axes(event.accelerationIncludingGravity)
  if (!gravity) {
    return null
  }
  return { kind: 'gravity', sample: gravity }
}

function axes(value: unknown): LinearSample | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  if (!('x' in value) || !('y' in value) || !('z' in value)) {
    return null
  }
  const { x, y, z } = value
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
    return null
  }
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return null
  }
  return { x, y, z }
}

function magnitude(sample: LinearSample): number {
  return Math.hypot(sample.x, sample.y, sample.z)
}

function restDelta(
  rest: LinearSample | null,
  sample: LinearSample,
): { rest: LinearSample; delta: number } {
  if (rest === null) {
    return { rest: sample, delta: 0 }
  }
  return {
    rest,
    delta: Math.hypot(sample.x - rest.x, sample.y - rest.y, sample.z - rest.z),
  }
}

async function requestMotionPermission(): Promise<'ok' | 'denied' | 'missing'> {
  if (typeof DeviceMotionEvent === 'undefined') {
    return 'missing'
  }
  const ctor = DeviceMotionEvent as unknown as MotionPermission
  if (typeof ctor.requestPermission !== 'function') {
    return 'ok'
  }
  try {
    const result = await ctor.requestPermission()
    return result === 'granted' ? 'ok' : 'denied'
  } catch {
    return 'denied'
  }
}
