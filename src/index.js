if (process.env.NODE_ENV === 'production') {
  require('@instana/collector')();
}

const path = require('path')
const fs = require('fs')

const description = fs.readFileSync(path.join(__dirname, 'pullRequestDescription.md'), {encoding: 'utf8'})
const changeSourceRegEx = /release-\d+/i
const branchReferencePrefix = 'refs/heads/'

module.exports = app => {
  app.log('branch-updater started')

  app.on('push', async context => {
    if (context.payload.deleted) {
      // Deleted branches will never require PRs
      return
    }

    const branch = getBranch(context.payload.ref)
    if (!branch) {
      app.log('Could not identify branch to which the changes were pushed. Retrieved', context.payload)
      return
    }

    if (!isBranchWhichShouldBeMergedIntoDefaultBranch(branch)) {
      app.log('Branch is not one of the potential change sources. Got', branch)
      return
    }

    const base = context.payload.repository.default_branch;

    try {
      await context.github.pullRequests.create({
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
      const isIgnorableError = e.code === 422 && (
        e.message.indexOf('No commits between') !== -1 ||
          e.message.indexOf('A pull request already exists for') !== -1)
      if (!isIgnorableError) {
        app.log('Failed to create PR', context, e)
        throw e
      }
    }
  })
}

function getBranch (ref) {
  if (!ref.startsWith(branchReferencePrefix)) {
    return null
  }

  return ref.substring(branchReferencePrefix.length)
}

function isBranchWhichShouldBeMergedIntoDefaultBranch (branch) {
  return changeSourceRegEx.test(branch)
}
