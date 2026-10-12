import { expect, test } from '@playwright/test'

test.beforeEach(async ({ context, page }) => {
  // This Chrome returns "prompt" from requestPermission until the sensors are granted, and only "granted" opens the window.
  await context.grantPermissions(['accelerometer', 'gyroscope'])
  await page.addInitScript(() => {
    localStorage.clear()
  })
})

test('main flows have zero console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (err) => {
    errors.push(err.message)
  })
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: /SpinCoach/ })).toBeVisible()
  await expect(page.getByTestId('sp-value')).toHaveText('0')
  const spIds = await page.locator('[data-testid^="sp-"]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('data-testid')).sort(),
  )
  expect(spIds).toEqual(['sp-hist', 'sp-mode', 'sp-start', 'sp-value'])

  await page.getByTestId('sp-start').click()
  await expect(page.getByTestId('sp-mode')).toHaveText('Launch now. 3 s')
  await page.evaluate(() => {
    const event = new Event('devicemotion')
    Object.defineProperty(event, 'acceleration', {
      configurable: true,
      value: { x: 10, y: 0, z: 0 },
    })
    window.dispatchEvent(event)
  })
  await expect(page.getByTestId('sp-value')).toHaveText('1200')

  await page.getByTestId('nav-stopwatch').click()
  await expect(page.getByText('Spin stopwatch')).toBeVisible()
  await page.getByTestId('sw-go').click()
  await page.waitForTimeout(120)
  await page.getByTestId('sw-go').click()
  await expect(page.getByTestId('sw-value')).not.toHaveText('0.00')
  await expect(page.getByTestId('sw-hist').locator('li')).toHaveCount(1)

  await page.getByTestId('nav-shout').click()
  await expect(page.getByText('Launch shout')).toBeVisible()
  await expect(page.getByTestId('rec-btn')).toBeVisible()
  await expect(page.getByTestId('play-btn')).toBeDisabled()
  await expect(page.getByTestId('tts-btn')).toBeVisible()

  await page.getByTestId('nav-battle').click()
  await expect(page.getByText('2-player battle')).toBeVisible()
  await page.getByTestId('duo-go').click()
  await page.waitForTimeout(80)
  await page.getByTestId('s1').click()
  await page.waitForTimeout(80)
  await page.getByTestId('s2').click()
  await expect(page.getByTestId('duo-res')).toHaveText(/^(Draw!|Player [12] wins by \d+\.\d{2} s)$/)

  await page.getByTestId('lang-zh-Hant').click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant')
  await expect(page.getByText('雙人對戰')).toBeVisible()
  await expect(page.getByTestId('duo-res')).toHaveText(/^(平手！|玩家 [12] 以 \d+\.\d{2} 秒獲勝)$/)

  await page.getByTestId('nav-launch').click()
  await expect(page.getByText('發射紀錄')).toBeVisible()
  await expect(page.getByTestId('bbp-status')).toBeVisible()

  expect(errors, errors.join('\n')).toEqual([])
})
