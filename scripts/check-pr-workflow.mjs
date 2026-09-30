// PR gate for the build-run rules in CLAUDE.md. Runs as the `pr workflow`
// step of `verify ci`. Checks the PR body and the changed files:
//   - an issue link: "Closes #12", "Fixes #12" or "Refs #12"
//   - a "Decision:" line naming Glue Decisions that exist and are not superseded
//   - source changes come with test changes, or a "No-test-reason:" line
// Outside a pull_request build it passes.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const SOURCE = /^src\/.*\.(ts|tsx)$/
const GENERATED = /(^|\/)routeTree\.gen\.ts$/
const TEST = /\.(test|spec)\.(ts|tsx|mjs|js)$|^e2e\//
const DECISION_LINE = /^Decision:\s*(.+)$/im
const DECISION_ID = /\bD\d+\b/g

// decisions: Map of id -> { status, supersededBy } for every cited id that exists.
export function problems({ body, files, decisions }) {
  const found = []
  if (!/\b(Closes|Fixes|Resolves|Refs) #\d+/i.test(body)) {
    found.push('Link the issue: "Closes #<n>" (or "Refs #<n>" when the issue stays open).')
  }
  const ids = citedDecisions(body)
  if (ids === null) {
    found.push('Name the Decision this change implements: "Decision: <id>", for example "Decision: D2".')
  } else if (ids.length === 0) {
    found.push('Name at least one Decision id in the "Decision:" line, for example "Decision: D2".')
  } else {
    for (const id of ids) {
      const decision = decisions.get(id)
      if (!decision) {
        found.push(`Decision "${id}" does not exist in Glue Product flexibeck.`)
      } else if (decision.status === 'superseded') {
        found.push(`Decision "${id}" is superseded by "${decision.supersededBy}". Cite that Decision instead.`)
      }
    }
  }
  const source = files.filter((file) => SOURCE.test(file) && !GENERATED.test(file) && !TEST.test(file))
  const tests = files.filter((file) => TEST.test(file))
  if (source.length > 0 && tests.length === 0 && !/^No-test-reason:\s*\S+/im.test(body)) {
    found.push(
      `Source changed without a test change (${source.join(', ')}). Write the test first, or add "No-test-reason: <why>".`,
    )
  }
  return found
}

export function citedDecisions(body) {
  const line = body.match(DECISION_LINE)
  if (!line) return null
  return [...new Set(line[1].match(DECISION_ID) ?? [])]
}

async function fetchDecision(id) {
  const { GLUE_API_URL, GLUE_API_TOKEN } = process.env
  const response = await fetch(`${GLUE_API_URL}/api/v1/products/flexibeck/decisions/${id}`, {
    headers: { authorization: `Bearer ${GLUE_API_TOKEN}` },
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Glue API answered ${response.status} for Decision ${id}`)
  const decision = await response.json()
  return { status: decision.status, supersededBy: decision.supersededBy?.id }
}

async function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH
  const event = eventPath ? JSON.parse(readFileSync(eventPath, 'utf8')) : {}
  if (!event.pull_request) {
    console.log('pr workflow: not a pull_request build, skipped')
    return
  }
  const body = event.pull_request.body ?? ''
  const base = event.pull_request.base.sha
  const files = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
  const decisions = new Map()
  for (const id of citedDecisions(body) ?? []) {
    const decision = await fetchDecision(id)
    if (decision) decisions.set(id, decision)
  }
  const found = problems({ body, files, decisions })
  for (const problem of found) console.error(`pr workflow: ${problem}`)
  if (found.length > 0) process.exit(1)
  console.log('pr workflow: ok')
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main()
