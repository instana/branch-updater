const nock = require('nock')
// Requiring our app implementation
const myProbotApp = require('../src')
const { Probot } = require('probot')
// Requiring our fixtures
const pushTemplate = require('./fixtures/push-template')
const branches = require('./fixtures/branches')
const pullRequestTemplate = require('./fixtures/pull-request-template')
// Get pull request description
const path = require('path')
const fs = require('fs')
const description = fs.readFileSync(path.join('src', 'pullRequestDescription.md'), { encoding: 'utf8' })

nock.disableNetConnect()

describe('Branch-Updater App', () => {
  let probot

  beforeEach(() => {
    probot = new Probot({})
    // Load our app into probot
    const app = probot.load(myProbotApp)
    // just return a test token
    app.app = () => 'test'
  })

  test('push to release-147 branch creates PR for release-149', async () => {
    nock('https://api.github.com')
      .get('/repos/testUser/repoName/branches')
      .reply(200, branches)

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
      .get('/repos/testUser/repoName/branches')
      .reply(200, branches)

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
})

function getPullRequestPayload (base, head) {
  let result = pullRequestTemplate
  result.base = base
  result.head = head
  result.title = `Update ${base} with changes from ${head}`
  result.body = description
  let bodyHead = '`' + head + '`'
  let bodyBase = '`' + base + '`'
  result.body = result.body.replace('`{{head}}`', bodyHead)
  result.body = result.body.replace('`{{head}}`', bodyHead)
  result.body = result.body.replace('`{{base}}`', bodyBase)
  result.body = result.body.replace('`{{base}}`', bodyBase)
  return result
}

function getPushPayload (branchName) {
  let result = pushTemplate
  result.ref = 'refs/heads/' + branchName
  return result
}
