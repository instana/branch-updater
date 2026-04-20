// Regex to match valid release/patch branch names
const changeSourceRegEx = /^(?:patch|release)-(?:\d+|v?\d+\.\d+\.x)$/i

/**
 * Extract version and branch type from branch name
 * @param {string} branch - Branch name like 'release-147' or 'patch-v1.2.x'
 * @returns {object} - { branchType: 'patch'|'release', versionType: 'integer'|'semver', value: number|{major, minor} }
 */
function extractVersion (branch) {
  const match = branch.match(/^(patch|release)-v?(\d+(?:\.\d+\.x)?)$/i)
  if (!match) {
    return null
  }

  const branchType = match[1].toLowerCase()
  const version = match[2]

  // Check if it's a semantic version (e.g., "1.2.x")
  const semverMatch = version.match(/^(\d+)\.(\d+)\.x$/i)
  if (semverMatch) {
    return {
      branchType,
      versionType: 'semver',
      value: {
        major: parseInt(semverMatch[1], 10),
        minor: parseInt(semverMatch[2], 10)
      }
    }
  }

  // Otherwise it's an integer version
  return {
    branchType,
    versionType: 'integer',
    value: parseInt(version, 10)
  }
}

/**
 * Compare two branch names by their versions
 * IMPORTANT: Only compares branches of the same type (patch with patch, release with release)
 * and same version format (integer with integer, semver with semver)
 * @param {string} a - First branch name
 * @param {string} b - Second branch name
 * @returns {number} - Negative if a < b, positive if a > b, 0 if equal
 * @throws {Error} - If attempting to compare branches of different types or version formats
 */
function compareBranches (a, b) {
  const versionA = extractVersion(a)
  const versionB = extractVersion(b)

  // If either version can't be extracted, fall back to string comparison
  if (!versionA || !versionB) {
    return a.localeCompare(b)
  }

  // NEVER compare patch branches with release branches
  if (versionA.branchType !== versionB.branchType) {
    throw new Error(`Cannot compare branches of different types: ${a} (${versionA.branchType}) vs ${b} (${versionB.branchType})`)
  }

  // NEVER compare integer versions with semver versions
  if (versionA.versionType !== versionB.versionType) {
    throw new Error(`Cannot compare branches with different version formats: ${a} (${versionA.versionType}) vs ${b} (${versionB.versionType})`)
  }

  // Compare integer versions
  if (versionA.versionType === 'integer') {
    return versionA.value - versionB.value
  }

  // Compare semver versions
  if (versionA.value.major !== versionB.value.major) {
    return versionA.value.major - versionB.value.major
  }
  return versionA.value.minor - versionB.value.minor
}

module.exports = {
  changeSourceRegEx,
  extractVersion,
  compareBranches
}
