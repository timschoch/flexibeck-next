import assert from 'node:assert/strict'
import { test } from 'node:test'
import { citedDecisions, fetchDecision, problems } from './check-pr-workflow.mjs'

const accepted = new Map([['D1', { status: 'accepted' }]])
const good = 'Closes #4\n\nDecision: D1'

test('a linked issue, an existing Decision and a test pass', () => {
  assert.deepEqual(problems({ body: good, files: ['src/a.ts', 'src/a.test.ts'], decisions: accepted }), [])
})

test('a missing issue link fails', () => {
  assert.match(problems({ body: 'Decision: D1', files: [], decisions: accepted })[0], /Link the issue/)
})

test('a missing Decision line fails', () => {
  assert.match(problems({ body: 'Closes #4', files: [], decisions: accepted })[0], /Name the Decision/)
})

test('an unknown Decision fails', () => {
  assert.match(problems({ body: 'Closes #4\nDecision: D9', files: [], decisions: accepted })[0], /does not exist/)
})

test('a superseded Decision fails', () => {
  const decisions = new Map([['D1', { status: 'superseded', supersededBy: 'D2' }]])
  assert.match(problems({ body: good, files: [], decisions })[0], /superseded by "D2"/)
})

test('source without tests fails unless a reason is given', () => {
  assert.match(problems({ body: good, files: ['src/a.ts'], decisions: accepted })[0], /without a test/)
  assert.deepEqual(problems({ body: `${good}\nNo-test-reason: copy only`, files: ['src/a.ts'], decisions: accepted }), [])
})

test('the generated route tree does not count as source', () => {
  assert.deepEqual(problems({ body: good, files: ['src/routeTree.gen.ts'], decisions: accepted }), [])
})

test('cited ids are unique', () => {
  assert.deepEqual(citedDecisions('Decision: D1, D2 and D1'), ['D1', 'D2'])
})

function stubFetch(t, response) {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options })
    return response
  })
  return calls
}

test('a Decision is read as a Part, without following redirects', async (t) => {
  process.env.GLUE_API_URL = 'https://glue.test'
  const part = { status: 'superseded', supersededBy: { id: 'D2' } }
  const calls = stubFetch(t, { status: 200, ok: true, json: async () => part })
  assert.deepEqual(await fetchDecision('D1'), { status: 'superseded', supersededBy: 'D2' })
  assert.equal(calls[0].url, 'https://glue.test/api/v1/projects/flexibeck/parts/D1')
  assert.equal(calls[0].options.redirect, 'manual')
})

test('a missing Part is no Decision', async (t) => {
  stubFetch(t, { status: 404, ok: false })
  assert.equal(await fetchDecision('D9'), null)
})

test('a redirect is an error, not a Decision', async (t) => {
  stubFetch(t, { status: 307, ok: false })
  await assert.rejects(fetchDecision('D1'), /answered 307/)
})
