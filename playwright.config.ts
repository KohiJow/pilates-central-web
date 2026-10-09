import { defineConfig, devices } from '@playwright/test'

const PORTA = Number(process.env.PORTA ?? 8887)
const ENDERECO = `http://127.0.0.1:${PORTA}/pilates-central-web/`
const CI = Boolean(process.env.CI)

export default defineConfig({
  testDir: 'e2e',
  timeout: 45_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  workers: CI ? 2 : 1,
  retries: CI ? 1 : 0,
  forbidOnly: CI,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: ENDERECO,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Android: Chromium com o perfil do Pixel 7
    { name: 'chromium', use: { ...devices['Pixel 7'] } },
    // iPhone: WebKit (o motor do Safari) com o perfil do iPhone 13
    { name: 'webkit', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: `npm run preview -- --port ${PORTA}`,
    url: ENDERECO,
    reuseExistingServer: !CI,
    timeout: 60_000,
  },
})
