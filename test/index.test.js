const { Probot, ProbotOctokit } = require('probot')
const nock = require('nock')
const path = require('path')
const fs = require('fs')

// Requiring our app implementation
const branchUpdater = require('../src')

// Requiring our fixtures
const pushTemplate = require('./fixtures/push-template')
const branchesWithInteger2 = require('./fixtures/branches-with-integer')
const branchesSemverPatch = require('./fixtures/branches-semver-patch')
const branchesSemverRelease = require('./fixtures/branches-semver-release')
const pullRequestTemplate = require('./fixtures/pull-request-template')

// Get pull request description
const description = fs.readFileSync(path.join('src', 'pullRequestDescription.md'), { encoding: 'utf8' })

nock.disableNetConnect()
jest.setTimeout(20000)

describe('Branch-Updater App', () => {
  let probot

  beforeEach(() => {
    nock.disableNetConnect()

    process.env.PR_APPROVAL_PERSONAL_ACCESS_TOKEN = 'fakeToken'

    probot = new Probot({
      githubToken: 'test',
      // Disable throttling & retrying requests for easier testing
      Octokit: ProbotOctokit.defaults({
        retry: { enabled: false },
        throttle: { enabled: false }
      })
    })

    branchUpdater({ app: probot })
  })

  test('push to release-147 branch creates PR for release-149', async () => {
    nock('https://api.github.com')
      .get('/repos/testUser/repoName/pulls?state=open')
      .reply(200, [])

    nock('https://api.github.com')
      .get('/repos/testUser/repoName/branches')
      .reply(200, branchesWithInteger2)

    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })

    // Test that a pull request is with base 149 and head 147
    nock('https://api.github.com')
      .post('/repos/testUser/repoName/pulls', (body) => {
        expect(body).toMatchObject(getPullRequestPayload('release-149', 'release-147'))
        return true
      })
      .reply(200)

    // Receive a webhook event
    const payload = getPushPayload('release-147')
    await probot.receive({ name: 'push', payload })
  })

  test('push to release-152 branch creates PR for default branch (master)', async () => {
    nock('https://api.github.com')
      .get('/repos/testUser/repoName/pulls?state=open')
      .reply(200, [])

    nock('https://api.github.com')
      .get('/repos/testUser/repoName/branches')
      .reply(200, branchesWithInteger2)

    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })

    // Test that a pull request is with base 149 and head 147
    nock('https://api.github.com')
      .post('/repos/testUser/repoName/pulls', (body) => {
        expect(body).toMatchObject(getPullRequestPayload('master', 'release-152'))
        return true
      })
      .reply(200)

    // Receive a webhook event
    const payload = getPushPayload('release-152')
    await probot.receive({ name: 'push', payload })
  })

  test('push to release-152 with an existing PR is re-approved', async () => {
    const sha = branchesWithInteger2.find(b => b.name === 'release-152').commit.sha
    const payload = { ...getPushPayload('release-152'), sha }

    nock('https://api.github.com')
      .get('/repos/testUser/repoName/pulls?state=open')
      .reply(200, [{ number: 55, head: { sha } }])

    nock('https://api.github.com')
      .get('/repos/testUser/repoName/branches')
      .reply(200, branchesWithInteger2)

    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })

    // Test that a PR review is being created
    nock('https://api.github.com')
      .post('/repos/testUser/repoName/pulls/55/reviews', (body) => {
        expect(body).toEqual(expect.objectContaining({ event: 'APPROVE' }))
        return true
      })
      .reply(200)

    // Receive a webhook event
    await probot.receive({ name: 'push', payload })
  })

  test('push to release-2 branch creates PR for release-10 (not release-147)', async () => {
    // This test verifies the fix for numeric version comparison
    // Previously, string comparison would incorrectly order: release-147 < release-2
    // Now with numeric comparison: release-2 < release-10 < release-147
    nock('https://api.github.com')
      .get('/repos/testUser/repoName/pulls?state=open')
      .reply(200, [])

    nock('https://api.github.com')
      .get('/repos/testUser/repoName/branches')
      .reply(200, branchesWithInteger2)

    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })

    // Test that a pull request is created with base release-10 (not release-147)
    nock('https://api.github.com')
      .post('/repos/testUser/repoName/pulls', (body) => {
        expect(body).toMatchObject(getPullRequestPayload('release-10', 'release-2'))
        return true
      })
      .reply(200)

    // Receive a webhook event
    const payload = getPushPayload('release-2')
    await probot.receive({ name: 'push', payload })
  })

  test('push to patch-v1.9.x branch creates PR for patch-v1.10.x (not patch-v1.2.x)', async () => {
    // This test verifies semantic version comparison
    // Previously, string comparison would incorrectly order: patch-v1.10.x < patch-v1.2.x < patch-v1.9.x
    // Now with semver comparison: patch-v1.2.x < patch-v1.9.x < patch-v1.10.x
    nock('https://api.github.com')
      .get('/repos/testUser/repoName/pulls?state=open')
      .reply(200, [])

    nock('https://api.github.com')
      .get('/repos/testUser/repoName/branches')
      .reply(200, branchesSemverPatch)

    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })

    // Test that a pull request is created with base patch-v1.10.x (not patch-v1.2.x)
    nock('https://api.github.com')
      .post('/repos/testUser/repoName/pulls', (body) => {
        expect(body).toMatchObject(getPullRequestPayload('patch-v1.10.x', 'patch-v1.9.x'))
        return true
      })
      .reply(200)

    // Receive a webhook event
    const payload = getPushPayload('patch-v1.9.x')
    await probot.receive({ name: 'push', payload })
  })

  test('push to release-1.10.x branch creates PR for release-2.0.x', async () => {
    // Test semantic version comparison across major versions
    nock('https://api.github.com')
      .get('/repos/testUser/repoName/pulls?state=open')
      .reply(200, [])

    nock('https://api.github.com')
      .get('/repos/testUser/repoName/branches')
      .reply(200, branchesSemverRelease)

    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })

    // Test that a pull request is created with base release-2.0.x
    nock('https://api.github.com')
      .post('/repos/testUser/repoName/pulls', (body) => {
        expect(body).toMatchObject(getPullRequestPayload('release-2.0.x', 'release-1.10.x'))
        return true
      })
      .reply(200)

    // Receive a webhook event
    const payload = getPushPayload('release-1.10.x')
    await probot.receive({ name: 'push', payload })
  })

  test('push to release-2.0.x (last semver branch) creates PR for master', async () => {
    // Test that the last semantic version branch merges to master
    nock('https://api.github.com')
      .get('/repos/testUser/repoName/pulls?state=open')
      .reply(200, [])

    nock('https://api.github.com')
      .get('/repos/testUser/repoName/branches')
      .reply(200, branchesSemverRelease)

    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })

    // Test that a pull request is created with base master
    nock('https://api.github.com')
      .post('/repos/testUser/repoName/pulls', (body) => {
        expect(body).toMatchObject(getPullRequestPayload('master', 'release-2.0.x'))
        return true
      })
      .reply(200)

    // Receive a webhook event
    const payload = getPushPayload('release-2.0.x')
    await probot.receive({ name: 'push', payload })
  })
})

function getPullRequestPayload (base, head) {
  const result = pullRequestTemplate
  result.base = base
  result.head = head
  result.title = `Update ${base} with changes from ${head}`
  result.body = description
  result.body = replaceAll(result.body, '{{head}}', head)
  result.body = replaceAll(result.body, '{{base}}', base)
  return result
}

function replaceAll (str, regexp, newSubstr) {
  return str.replace(new RegExp(regexp, 'g'), newSubstr)
}

function getPushPayload (branchName) {
  const result = pushTemplate
  result.ref = 'refs/heads/' + branchName
  return result
}
