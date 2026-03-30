---
name: pull-origin-main
description: Pull latest from origin main and merge into current branch, resolving any merge conflicts
user_invocable: true
---

# Pull Origin Main

Pull the latest code from origin main and merge it into the current branch, intelligently resolving any merge conflicts.

## Steps

1. **Identify the current branch:**
   - Run `git branch --show-current` to determine which branch you are on.

2. **Fetch latest from origin:**
   - Run `git fetch origin main`

3. **Merge origin/main into the current branch:**
   - If on `main`: run `git merge origin/main`
   - If on a feature branch: run `git merge origin/main`

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

5. **Report results:**
   - Show which branch was updated
   - List any files that had conflicts and how they were resolved
   - Show the final `git status`
