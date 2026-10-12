import { expect, test } from 'vitest'
import { settleMotion } from './motion.ts'

test('settleMotion stays silent with no samples', () => {
  expect(settleMotion([])).toEqual({ kind: 'silent' })
})

test('settleMotion stays silent when a linear sample misses an axis', () => {
  expect(settleMotion([{ acceleration: { x: 10, y: null, z: null } }])).toEqual({ kind: 'silent' })
})

test('one gravity sample is still', () => {
  expect(settleMotion([{ accelerationIncludingGravity: { x: 0, y: 0, z: 9.8 } }])).toEqual({
    kind: 'still',
  })
})

test('a null acceleration with one gravity vector is still', () => {
  expect(
    settleMotion([{ acceleration: null, accelerationIncludingGravity: { x: 0, y: 0, z: 9.8 } }]),
  ).toEqual({ kind: 'still' })
})

test('two identical gravity samples are still', () => {
  expect(
    settleMotion([
      { accelerationIncludingGravity: { x: 0, y: 0, z: 9.8 } },
      { accelerationIncludingGravity: { x: 0, y: 0, z: 9.8 } },
    ]),
  ).toEqual({ kind: 'still' })
})

test('two identical side gravity samples are still', () => {
  expect(
    settleMotion([
      { accelerationIncludingGravity: { x: 9.8, y: 0, z: 0 } },
      { accelerationIncludingGravity: { x: 9.8, y: 0, z: 0 } },
    ]),
  ).toEqual({ kind: 'still' })
})

test('a 30 m/s² gravity delta records 3600 SP', () => {
  expect(
    settleMotion([
      { accelerationIncludingGravity: { x: 0, y: 0, z: 9.8 } },
      { accelerationIncludingGravity: { x: 30, y: 0, z: 9.8 } },
    ]),
  ).toEqual({ kind: 'recorded', sp: 3600 })
})

test('linear acceleration of 10 m/s² records 1200 SP', () => {
  expect(settleMotion([{ acceleration: { x: 10, y: 0, z: 0 } }])).toEqual({
    kind: 'recorded',
    sp: 1200,
  })
})

test('linear acceleration of 10 m/s² records 1200 SP when gravity is also present', () => {
  expect(
    settleMotion([
      {
        acceleration: { x: 10, y: 0, z: 0 },
        accelerationIncludingGravity: { x: 0, y: 0, z: 9.8 },
      },
    ]),
  ).toEqual({ kind: 'recorded', sp: 1200 })
})

test('a zero linear sample is still and does not read gravity', () => {
  expect(
    settleMotion([
      {
        acceleration: { x: 0, y: 0, z: 0 },
        accelerationIncludingGravity: { x: 0, y: 0, z: 9.8 },
      },
    ]),
  ).toEqual({ kind: 'still' })
})

test('a linear peak of 1.5 m/s² is still', () => {
  expect(settleMotion([{ acceleration: { x: 1.5, y: 0, z: 0 } }])).toEqual({ kind: 'still' })
})

test('a linear peak of 1.51 m/s² records 181 SP', () => {
  expect(settleMotion([{ acceleration: { x: 1.51, y: 0, z: 0 } }])).toEqual({
    kind: 'recorded',
    sp: 181,
  })
})
