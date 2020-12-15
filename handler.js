const { serverless } = require('@probot/serverless-lambda')
const appFn = require('./src')
module.exports.probot = serverless(appFn)
