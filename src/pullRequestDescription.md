<strong style="color: red">
  Do not try to resolve the conflicts via GitHub. This will result in unintended merges in the opposite direction. Resolve conflicts on your local machine. See the section `Manual Merge Guidance`.
</strong>

# Why

There are changes within `{{head}}` that aren't yet within `{{base}}`. Let's fix this 😊!

# What

Merge `{{head}}` into `{{base}}`.

# Who

👋 This is a message from your helpful GitHub App [branch-updater](https://github.com/instana/branch-updater).*

# Manual Merge Guidance

```shell
git checkout {{head}}
git pull origin {{head}}
git checkout {{base}}
git pull origin {{base}}
git merge {{head}}
```

# Note

 - Please do **not** rebase/squash merge these changes. This would rewrite history and make the life of your fellow collaborators harder. Thank you for adhering to our etiquette ❤️.
