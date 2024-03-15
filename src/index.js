const { ProbotOctokit } = require('probot')
const path = require('path')
const fs = require('fs')

const description = fs.readFileSync(path.join(__dirname, 'pullRequestDescription.md'), { encoding: 'utf8' })
const changeSourceRegEx = /^release-(?:\d+|v?\d\.\d\.x)$/i
const branchReferencePrefix = 'refs/heads/'

module.exports = ({ app }) => {
  app.log.info(`branch-updater started, using ${process.env.GHE_HOST || 'api.github.com'}.`)

  let prApprovalOctokit
  if (process.env.PR_APPROVAL_PERSONAL_ACCESS_TOKEN) {
    prApprovalOctokit = new ProbotOctokit({
      baseUrl: process.env.GHE_HOST
        ? `${process.env.GHE_PROTOCOL || 'https'}://${process.env.GHE_HOST}/api/v3`
        : 'https://api.github.com',
      auth: {
        token: process.env.PR_APPROVAL_PERSONAL_ACCESS_TOKEN
      }
    })
  }

  app.on('push', c => onPush(c, prApprovalOctokit))
  app.on('status', onStatus)
}

async function onStatus (context) {
  if (context.payload.state !== 'success') {
    return
  }

  const pull = await findPullRequest(context)
  if (!pull || !isReleaseBranch(pull.head.ref)) {
    return
  }

  await merge(context, pull)
}

// Can we more efficiently find the PR? :)
async function findPullRequest (context) {
  const sha = context.payload.sha
  const allPulls = await context.octokit.paginate(
    context.octokit.pulls.list,
    {
      ...context.repo(),
      state: 'open'
    }
  )

  for (const pull of allPulls) {
    if (pull.head.sha === sha) {
      return pull
    }
  }
  context.log.info(`Could not find existing pull request for ${sha}`)
}

async function merge (context, pull) {
  try {
    await context.octokit.pulls.merge({
      ...context.repo(),
      pull_number: pull.number,
      merge_method: 'merge'
    })
  } catch (e) {
    context.log.warn(`Could not automatically merge pull request ${pull.number}: ${e}`)
  }
}

async function onPush (context, prApprovalOctokit) {
  if (context.payload.deleted) {
    // Deleted branches will never require PRs
    return
  }

  const branch = getBranch(context.payload.ref)
  context.log.info(`Processing push on branch ${branch}`)
  if (!branch) {
    context.log.warn(`Could not identify branch to which the changes were pushed. Retrieved ${context.payload.ref}`)
    return
  }

  if (!isReleaseBranch(branch)) {
    context.log.info(`Branch is not one of the potential change sources.`)
    return
  }

  const allBranches = await context.octokit.paginate(
    context.octokit.repos.listBranches,
    context.repo(),
    res => res.data.map(branch => branch.name)
  )

  let releaseBranches = allBranches
    .filter(isReleaseBranch)
    .sort((a, b) => a.localeCompare(b))

  let base = null
  for (let i = 0; i < releaseBranches.length; i++) {
    if (branch === releaseBranches[i]) {
      if (i === releaseBranches.length - 1) {
        base = context.payload.repository.default_branch
        break
      } else {
        base = releaseBranches[i + 1]
        break
      }
    }
  }

  let pull = await findPullRequest(context)
  if (!pull) {
    const response = await createPull(base, branch, context)
    if (response && response.status === 201) {
      await approvePull(response.data.number, context, prApprovalOctokit)
    }
  } else {
    await approvePull(pull.number, context, prApprovalOctokit)
  }
}

function getBranch (ref) {
  if (!ref.startsWith(branchReferencePrefix)) {
    return null
  }

  return ref.substring(branchReferencePrefix.length)
}

function isReleaseBranch (branch) {
  return changeSourceRegEx.test(branch)
}

async function approvePull (pullNumber, context, prApprovalOctokit) {
  context.log.info(`Attempting to approve PR ${pullNumber}`)
  if (!prApprovalOctokit) {
    context.log.error('Missing approval octokit, unable to approve pull request')
    return
  }

  try {
    await prApprovalOctokit.pulls.createReview({
      owner: context.payload.repository.owner.name,
      repo: context.payload.repository.name,
      pull_number: pullNumber,
      event: 'APPROVE',
      comments: []
    })
  } catch (e) {
    context.log.error(`Failed to approve the created PR: ${e}`)
  }
}

async function createPull (base, branch, context) {
  context.log.info(`Attempting to create pull request from ${branch} to ${base}`)
  let pullCreationResponse
  try {
    pullCreationResponse = await context.octokit.pulls.create({
      owner: context.payload.repository.owner.name,
      repo: context.payload.repository.name,
      title: `Update ${base} with changes from ${branch}`,
      body: description
        .replace(/\{\{base\}\}/g, base)
        .replace(/\{\{head\}\}/g, branch),
      head: branch,
      base,
      maintainer_can_modify: true
    })
  } catch (e) {
    const isIgnorableError = e.status === 422 && (
      e.message.indexOf('No commits between') !== -1 ||
      e.message.indexOf('A pull request already exists for') !== -1)
    if (!isIgnorableError) {
      context.log.error(`Failed to create PR: ${e}`)
      throw e
    } else {
      context.log.info(`Ignoring failure to create PR: ${e}`)
    }
  }
  return pullCreationResponse
}
