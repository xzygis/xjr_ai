---
name: "commit-code"
description: "Automates code submission. Invoke when the user says '提交代码', '保存代码', or '保存游戏'."
---

# Commit Code Skill

This skill provides a standardized workflow for committing code and creating Pull Requests to ensure clean version control.

## When to Invoke

Invoke this skill whenever the user indicates they want to save or submit their work. Trigger phrases include:
- "提交代码" (Commit code)
- "保存代码" (Save code)
- "保存游戏" (Save game)
- "提交一下" (Submit this)

## Workflow Steps

When invoked, strictly follow these steps in order:

### 1. Check and Switch Branch
- Check the current git branch using `git branch --show-current`.
- If the current branch is `master` or `main`, you **must** create and checkout a new feature branch.
- Ask the user for a feature name or generate a reasonable one based on recent changes (e.g., `feature/add-parkour-game`).
- Use `git checkout -b <branch-name>` to create and switch to the new branch.

### 2. Commit Code
- Check the status of modified files using `git status`.
- Add all modified files using `git add .`.
- Commit the changes with a clear and descriptive commit message using `git commit -m "<message>"`.
  - The commit message should follow standard conventions (e.g., `feat: ...`, `fix: ...`, `docs: ...`).
  - Summarize the actual changes made in the workspace.

### 3. Check and Create/Update Pull Request (PR)
- Push the current branch to the remote repository using `git push -u origin <branch-name>`.
- **Check for existing PR**: Use the GitHub CLI (`gh pr view`) or standard git tools to check if a Pull Request already exists for the current branch.
- **If PR exists**: 
  - Do not create a new PR.
  - Update the existing PR's description to reflect the latest commits and changes you just made (e.g., using `gh pr edit --body "<updated description>"`).
- **If PR does NOT exist**:
  - Use the GitHub CLI (`gh pr create`) to create a new Pull Request.
  - Set a descriptive title and detailed body summarizing all changes in the branch.
- If the user has not configured a remote or CLI tools, provide them with the exact git commands and the manual URL to create or update the PR on their git hosting platform.
- Inform the user that the code has been successfully committed and the PR has been updated/created (or is ready to be handled manually).

## Execution Guidelines

- **Autonomy**: Proactively run the git commands without asking for permission for every single step, unless you need clarification on the branch name or commit message.
- **Error Handling**: If a git command fails (e.g., no remote configured), clearly explain the error to the user and offer a solution.