---
name: push-to-git-origin-main
description: Pull origin main, resolve conflicts, and push latest code to origin main with proper commit messages
user_invocable: true
---

# Push To Git Origin Main

Pull the latest from origin main, resolve any merge conflicts, and push your local code to origin main with proper commit messages.

## Steps

1. **Check working tree status:**
   - Run `git status` to see if there are uncommitted changes.
   - If there are unstaged or staged changes, commit them first:
     - Run `git diff --stat` and `git diff --cached --stat` to understand the changes
     - Create a descriptive commit message summarizing what changed and why
     - Stage relevant files (avoid secrets/env files) and commit

2. **Identify the current branch:**
   - Run `git branch --show-current`

3. **Fetch and merge origin/main:**
   - Run `git fetch origin main`
   - Run `git merge origin/main`

4. **Handle merge conflicts (if any):**
   - Run `git diff --name-only --diff-filter=U` to list conflicted files.
   - For each conflicted file:
     - Read the file and examine the conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
     - Understand the intent of BOTH sides of each conflict
     - Resolve by choosing the best combination that preserves the intent of both changes
     - If one side is clearly newer/better, prefer it; if both have valuable changes, merge them logically
     - Remove all conflict markers after resolution
     - Stage the resolved file with `git add <file>`
   - After all conflicts are resolved, complete the merge with `git commit --no-edit`

5. **Push to origin main:**
   - If on `main`: run `git push origin main`
   - If on a feature branch:
     - First merge your branch into main: `git checkout main && git merge <branch-name>`
     - Then push: `git push origin main`
     - Switch back to the feature branch: `git checkout <branch-name>`

6. **Report results:**
   - Show what was pushed (commits, files changed)
   - List any conflicts that were resolved and how
   - Show the final `git status` and `git log --oneline -5`
