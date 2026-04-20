const { changeSourceRegEx, extractVersion, compareBranches } = require('../src/version-utils')

describe('Version Comparison', () => {
  describe('changeSourceRegEx', () => {
    test('matches valid integer release branches', () => {
      expect(changeSourceRegEx.test('release-1')).toBe(true)
      expect(changeSourceRegEx.test('release-147')).toBe(true)
      expect(changeSourceRegEx.test('release-999')).toBe(true)
    })

    test('matches valid integer patch branches', () => {
      expect(changeSourceRegEx.test('patch-1')).toBe(true)
      expect(changeSourceRegEx.test('patch-42')).toBe(true)
    })

    test('matches valid semver branches with v prefix', () => {
      expect(changeSourceRegEx.test('release-v1.2.x')).toBe(true)
      expect(changeSourceRegEx.test('patch-v3.5.x')).toBe(true)
    })

    test('matches valid semver branches without v prefix', () => {
      expect(changeSourceRegEx.test('release-1.2.x')).toBe(true)
      expect(changeSourceRegEx.test('patch-3.5.x')).toBe(true)
    })

    test('is case insensitive', () => {
      expect(changeSourceRegEx.test('RELEASE-100')).toBe(true)
      expect(changeSourceRegEx.test('PATCH-V2.1.X')).toBe(true)
    })

    test('does not match invalid branches', () => {
      expect(changeSourceRegEx.test('master')).toBe(false)
      expect(changeSourceRegEx.test('feature-123')).toBe(false)
      expect(changeSourceRegEx.test('release-')).toBe(false)
      expect(changeSourceRegEx.test('release-abc')).toBe(false)
      expect(changeSourceRegEx.test('release-1.2')).toBe(false) // missing .x
      expect(changeSourceRegEx.test('release-1.2.3')).toBe(false) // should be .x not .3
    })
  })

  describe('extractVersion', () => {
    test('extracts integer version from release branch', () => {
      expect(extractVersion('release-147')).toEqual({
        branchType: 'release',
        versionType: 'integer',
        value: 147
      })
    })

    test('extracts integer version from patch branch', () => {
      expect(extractVersion('patch-42')).toEqual({
        branchType: 'patch',
        versionType: 'integer',
        value: 42
      })
    })

    test('extracts semver from release branch with v prefix', () => {
      expect(extractVersion('release-v1.2.x')).toEqual({
        branchType: 'release',
        versionType: 'semver',
        value: { major: 1, minor: 2 }
      })
    })

    test('extracts semver from release branch without v prefix', () => {
      expect(extractVersion('release-1.2.x')).toEqual({
        branchType: 'release',
        versionType: 'semver',
        value: { major: 1, minor: 2 }
      })
    })

    test('extracts semver from patch branch', () => {
      expect(extractVersion('patch-v3.5.x')).toEqual({
        branchType: 'patch',
        versionType: 'semver',
        value: { major: 3, minor: 5 }
      })
    })

    test('handles case insensitive branch names', () => {
      expect(extractVersion('RELEASE-100')).toEqual({
        branchType: 'release',
        versionType: 'integer',
        value: 100
      })
      expect(extractVersion('PATCH-V2.1.X')).toEqual({
        branchType: 'patch',
        versionType: 'semver',
        value: { major: 2, minor: 1 }
      })
    })

    test('returns null for invalid branch names', () => {
      expect(extractVersion('master')).toBeNull()
      expect(extractVersion('feature-123')).toBeNull()
      expect(extractVersion('release-')).toBeNull()
      expect(extractVersion('release-abc')).toBeNull()
      expect(extractVersion('release-1.2')).toBeNull() // missing .x
    })
  })

  describe('compareBranches', () => {
    describe('integer versions', () => {
      test('compares single digit versions correctly', () => {
        expect(compareBranches('release-1', 'release-2')).toBeLessThan(0)
        expect(compareBranches('release-2', 'release-1')).toBeGreaterThan(0)
        expect(compareBranches('release-5', 'release-5')).toBe(0)
      })

      test('compares multi-digit versions correctly', () => {
        expect(compareBranches('release-147', 'release-149')).toBeLessThan(0)
        expect(compareBranches('release-149', 'release-147')).toBeGreaterThan(0)
      })

      test('handles version number magnitude correctly', () => {
        // This is the key fix: "2" should come before "147" numerically
        expect(compareBranches('release-2', 'release-147')).toBeLessThan(0)
        expect(compareBranches('release-9', 'release-10')).toBeLessThan(0)
        expect(compareBranches('release-99', 'release-100')).toBeLessThan(0)
      })

      test('works with patch branches', () => {
        expect(compareBranches('patch-10', 'patch-20')).toBeLessThan(0)
        expect(compareBranches('patch-100', 'patch-99')).toBeGreaterThan(0)
      })
    })

    describe('semantic versions', () => {
      test('compares by major version first', () => {
        expect(compareBranches('release-v1.5.x', 'release-v2.1.x')).toBeLessThan(0)
        expect(compareBranches('release-v3.0.x', 'release-v2.9.x')).toBeGreaterThan(0)
      })

      test('compares by minor version when major is equal', () => {
        expect(compareBranches('release-v1.5.x', 'release-v1.10.x')).toBeLessThan(0)
        expect(compareBranches('release-v2.20.x', 'release-v2.3.x')).toBeGreaterThan(0)
      })

      test('handles double-digit minor versions correctly', () => {
        // This is the key fix: "1.9.x" should come before "1.10.x"
        expect(compareBranches('release-v1.9.x', 'release-v1.10.x')).toBeLessThan(0)
        expect(compareBranches('release-v1.99.x', 'release-v1.100.x')).toBeLessThan(0)
      })

      test('returns 0 for equal versions', () => {
        expect(compareBranches('release-v1.5.x', 'release-v1.5.x')).toBe(0)
      })

      test('works without v prefix', () => {
        expect(compareBranches('release-1.5.x', 'release-1.10.x')).toBeLessThan(0)
      })
    })

    describe('cross-type comparison prevention', () => {
      test('throws error when comparing patch with release branches', () => {
        expect(() => compareBranches('patch-1', 'release-1')).toThrow('Cannot compare branches of different types')
        expect(() => compareBranches('release-100', 'patch-50')).toThrow('Cannot compare branches of different types')
      })

      test('throws error when comparing patch semver with release semver', () => {
        expect(() => compareBranches('patch-v1.0.x', 'release-v1.0.x')).toThrow('Cannot compare branches of different types')
      })

      test('throws error when comparing integer with semver versions (release)', () => {
        expect(() => compareBranches('release-100', 'release-v1.0.x')).toThrow('Cannot compare branches with different version formats')
        expect(() => compareBranches('release-v1.0.x', 'release-100')).toThrow('Cannot compare branches with different version formats')
      })

      test('throws error when comparing integer with semver versions (patch)', () => {
        expect(() => compareBranches('patch-100', 'patch-v1.0.x')).toThrow('Cannot compare branches with different version formats')
        expect(() => compareBranches('patch-v1.0.x', 'patch-100')).toThrow('Cannot compare branches with different version formats')
      })

      test('throws error when comparing mixed types and formats', () => {
        expect(() => compareBranches('patch-100', 'release-v1.0.x')).toThrow('Cannot compare branches of different types')
        expect(() => compareBranches('release-v2.0.x', 'patch-50')).toThrow('Cannot compare branches of different types')
      })
    })

    describe('invalid branches', () => {
      test('falls back to string comparison for invalid branches', () => {
        expect(compareBranches('master', 'develop')).toBeGreaterThan(0)
        expect(compareBranches('feature-a', 'feature-b')).toBeLessThan(0)
      })

      test('handles one valid and one invalid branch', () => {
        // Falls back to string comparison
        const result = compareBranches('release-100', 'master')
        expect(typeof result).toBe('number')
      })
    })

    describe('sorting arrays', () => {
      test('sorts release integer versions correctly', () => {
        const branches = ['release-2', 'release-152', 'release-10', 'release-147', 'release-1']
        const sorted = branches.sort(compareBranches)
        expect(sorted).toEqual(['release-1', 'release-2', 'release-10', 'release-147', 'release-152'])
      })

      test('sorts patch integer versions correctly', () => {
        const branches = ['patch-5', 'patch-100', 'patch-1', 'patch-50']
        const sorted = branches.sort(compareBranches)
        expect(sorted).toEqual(['patch-1', 'patch-5', 'patch-50', 'patch-100'])
      })

      test('sorts release semver versions correctly', () => {
        const branches = ['release-v1.10.x', 'release-v1.2.x', 'release-v2.1.x', 'release-v1.9.x']
        const sorted = branches.sort(compareBranches)
        expect(sorted).toEqual(['release-v1.2.x', 'release-v1.9.x', 'release-v1.10.x', 'release-v2.1.x'])
      })

      test('sorts patch semver versions correctly', () => {
        const branches = ['patch-v2.5.x', 'patch-v1.10.x', 'patch-v1.2.x']
        const sorted = branches.sort(compareBranches)
        expect(sorted).toEqual(['patch-v1.2.x', 'patch-v1.10.x', 'patch-v2.5.x'])
      })

      test('cannot sort array with mixed branch types', () => {
        const branches = ['release-1', 'patch-1', 'release-2']
        expect(() => branches.sort(compareBranches)).toThrow('Cannot compare branches of different types')
      })

      test('cannot sort array with mixed version formats (release)', () => {
        const branches = ['release-v1.0.x', 'release-100', 'release-2', 'release-v2.0.x']
        expect(() => branches.sort(compareBranches)).toThrow('Cannot compare branches with different version formats')
      })

      test('cannot sort array with mixed version formats (patch)', () => {
        const branches = ['patch-v1.0.x', 'patch-50', 'patch-1', 'patch-v2.0.x']
        expect(() => branches.sort(compareBranches)).toThrow('Cannot compare branches with different version formats')
      })
    })
  })
})
