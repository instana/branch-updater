**🚨🚨🚨Do not resolve conflicts via GitHub🚨🚨🚨**

This will result in unintended merges in the opposite direction, i.e. GitHub will merge `{{base}}` into `{{head}}`. Resolve conflicts on your local machine. See the section `Manual Merge Guidance` for instructions.

# Why

There are changes within `{{head}}` that aren't yet within `{{base}}`. Let's fix this 😊!

# What

Merge `{{head}}` into `{{base}}`.

# Who

*👋 This is a message from your helpful GitHub App [branch-updater](https://github.com/instana/branch-updater).*

# Manual Merge Guidance

```shell
git checkout {{head}}
git pull origin {{head}}
git checkout {{base}}
git pull origin {{base}}
git merge {{head}}
```

**Now resolve the conflicts locally.** Do not create a new branch at this point. By creating a new branch at this point, you would accidentally leave the git merge mode.

```
# Edit files to resolve all conflicts:
git add .
git commit
```

*Please take care that these changes actually land in `{{base}}` as quickly as possible, so the next person that needs to merge changes from `{{head}}` to `{{base}}` does not encounter the same conflicts that you just resolved.*

In case you can push to `{{base}}` directly:

```
git push
```

Depending on the repository and target branch, direct pushes to `{{base}}` might be forbidden. In that case, you need to create another branch (based on `{{base}}`) and a corresponding PR:

```
git checkout -b resolve-conflicts-{{head}}-{{base}}
git push -u origin resolve-conflicts-{{head}}-{{base}}
# The command line output of the git push command will provide a URL to conveniently create the PR.
```

Take care that this PR is merged into `{{base}}` as soon as possible (you might be able to merge it yourself once the required checks have completed).

# Note

 - Please do **not** rebase/squash merge these changes. This would rewrite history and make the life of your fellow collaborators harder. Thank you for adhering to our etiquette ❤️.
 - 🚨🚨🚨Do not resolve conflicts via GitHub🚨🚨🚨: This will result in unintended merges in the opposite direction, i.e. GitHub will merge `{{base}}` into `{{head}}`. Resolve conflicts on your local machine. See the section `Manual Merge Guidance` for instructions.
