import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { registrationAccess } from '../src/utils/registrationAccess.js'

test('activates a new institution and user at registration', () => {
  assert.deepEqual(registrationAccess, {
    institutionStatus: 'ATIVO',
    isActive: true,
  })
})

test('migration activates existing pending registrations', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20260717180000_enable_registration_immediately.sql', import.meta.url),
    'utf8',
  )

  assert.match(migration, /set status = 'ATIVO'/)
  assert.match(migration, /set is_active = true/)
  assert.match(migration, /true\s*\n\s*\)\s*\n\s*on conflict/)
})
