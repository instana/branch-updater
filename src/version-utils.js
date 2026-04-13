// Regex to match valid release/patch branch names
const changeSourceRegEx = /^(?:patch|release)-(?:\d+|v?\d+\.\d+\.x)$/i

/**
 * Extract version from branch name
 * @param {string} branch - Branch name like 'release-147' or 'patch-v1.2.x'
 * @returns {object} - { type: 'integer'|'semver', value: number|{major, minor} }
 */
function extractVersion (branch) {
  const match = branch.match(/^(?:patch|release)-v?(\d+(?:\.\d+\.x)?)$/i)
  if (!match) {
    return null
  }

  const version = match[1]

  // Check if it's a semantic version (e.g., "1.2.x")
  const semverMatch = version.match(/^(\d+)\.(\d+)\.x$/i)
  if (semverMatch) {
    return {
      type: 'semver',
      value: {
        major: parseInt(semverMatch[1], 10),
        minor: parseInt(semverMatch[2], 10)
      }
    }
  }

  // Otherwise it's an integer version
  return {
    type: 'integer',
    value: parseInt(version, 10)
  }
}

/**
 * Compare two branch names by their versions
 * @param {string} a - First branch name
 * @param {string} b - Second branch name
 * @returns {number} - Negative if a < b, positive if a > b, 0 if equal
 */
function compareBranches (a, b) {
  const versionA = extractVersion(a)
  const versionB = extractVersion(b)

  // If either version can't be extracted, fall back to string comparison
  if (!versionA || !versionB) {
    return a.localeCompare(b)
  }

  // If types differ, compare by type (integer < semver for consistency)
  if (versionA.type !== versionB.type) {
    return versionA.type === 'integer' ? -1 : 1
  }

  // Compare integer versions
  if (versionA.type === 'integer') {
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
