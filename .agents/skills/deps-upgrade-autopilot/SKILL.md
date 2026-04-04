---
name: deps-upgrade-autopilot
description: Run a full dependency-upgrade PR for this Astro BTX repo with pnpm, repo-specific visual regression screenshots for key BTX pages and the interactive search state, then babysit the GitHub PR, address review feedback, merge it, and clean up the branch. Use when asked for a one-shot dependency upgrade, dependency refresh, upgrade PR autopilot, or fully automated dependency maintenance in this repository.
---

# Dependency Upgrade Autopilot

Use this repo-local skill when the user wants the full dependency-upgrade flow executed end to end in this repository.

## Base Skill

- Start by reading `.agents/skills/upgrade-dependencies-pr/SKILL.md`.
- Reuse its workflow and decision rules unless this repo-local skill adds a stricter repo-specific step.
- This repo uses `pnpm`. Read the `pnpm` section of `.agents/skills/upgrade-dependencies-pr/references/package-manager-playbook.md`.

## Repo-Specific Validation

- Main validation set:
  - `pnpm check`
  - `pnpm test`
  - `pnpm build`
  - repo visual regression via `pnpm run deps:visual`
- If Playwright Chromium is missing, run `pnpm run deps:visual:install-browser` once before the first visual capture.

## Visual Regression Flow

- Never commit screenshots or diff images.
- Always create one temp artifact root, for example `ARTIFACT_ROOT="$(mktemp -d -t btx-blue-visual-XXXXXX)"`.
- Capture these states before and after the dependency changes:
  - `/000`
  - `/105`
  - `/340`
  - `/800` after entering `ipv6` into the Seitenfinder
  - `/998/2`
- The capture script already forces BAUD to `LINE`, turns bit-flip noise off, disables CSS animation/transition noise, captures the stable `.btx-screen-shell` region, and calibrates a small tolerated diff per target from repeated same-state screenshots.
- Before screenshots:
  1. Ensure the tree is clean enough to branch safely.
  2. Build the current branch.
  3. Start preview with `pnpm run deps:visual:preview`.
  4. Run `pnpm run deps:visual -- capture --base-url http://localhost:4321 --output-dir "$ARTIFACT_ROOT/before"`.
- After the dependency upgrade and fixes:
  1. Rebuild the branch.
  2. Start preview again with `pnpm run deps:visual:preview`.
  3. Run `pnpm run deps:visual -- capture --base-url http://localhost:4321 --output-dir "$ARTIFACT_ROOT/after"`.
  4. Run `pnpm run deps:visual -- compare --before-dir "$ARTIFACT_ROOT/before" --after-dir "$ARTIFACT_ROOT/after" --output-dir "$ARTIFACT_ROOT/report"`.
- Treat a compare failure as a real blocker (and create an issue) unless the generated diff report shows a tiny, clearly explainable rendering drift. If you keep such a drift, say so explicitly in the PR body.

## Execution Order

1. Inventory the repo exactly as the base skill requires.
2. Check for actual available updates before creating a branch or capturing screenshots. Use `pnpm outdated --format json` and stop the task immediately if every tracked package is already at its latest published version.
3. Create a fresh branch before editing. Prefer `codex/deps-btx-blue-<yyyymmdd>`.
4. Capture the pre-upgrade screenshots into the temp dir.
5. Upgrade dependencies with `pnpm` and regenerate the lockfile.
6. Run the base skill’s release-note triage and apply required fallout fixes.
7. Run `pnpm check`, `pnpm test`, and `pnpm build`.
8. Capture post-upgrade screenshots and run the compare step.
9. Stage only the dependency upgrade work and directly related fixes.
10. Commit, push, and open a ready PR unless there is a clear reason to keep it draft.

## PR Body

- Include:
  - notable package upgrades
  - any required code/config fixes
  - the commands run for validation
  - the visual regression result summary
  - any intentionally accepted tiny visual drift with a concrete explanation
  - any follow-up issues created from release-note review

## GitHub Babysitting

- After the PR is created, use the [@github](plugin://github@openai-curated) plugin for PR metadata and comment inspection.
- Wait about 5 to 8 minutes before the first triage pass so bot reviews can land.
- Inspect both:
  - formal reviews / review threads
  - top-level PR conversation, including emoji/reaction-based bot signals from tools such as Codex or Gemini Code Assist
- If there is actionable feedback:
  1. Cluster it by behavior or file.
  2. Address the requested changes locally.
  3. Rerun the smallest complete validation set, including the visual compare against the original `before` capture when UI-affecting files changed.
  4. Push the follow-up commit(s).
  5. Reply or react on GitHub when appropriate so the thread shows the feedback was handled.
  6. Resolve the review comments when they got resolved.
- If review-thread state matters, follow the thread-aware approach from the GitHub plugin skill at `$HOME/.codex/plugins/cache/openai-curated/github/*/skills/gh-address-comments/SKILL.md` (use globbing).
- Repeat the babysitting loop until:
  - there is no unresolved actionable feedback,
  - required checks are green,
  - and the PR is mergeable.

## Merge And Cleanup

- Merge the PR once it is green and unblocked. Prefer `gh pr merge --squash --delete-branch` unless the repo convention clearly prefers another merge strategy.
- After merge:
  - `git checkout main`
  - `git pull --ff-only`
  - delete the local branch if it still exists
  - delete the remote branch if the merge command did not already remove it
- Report the merged PR URL, the final commit on `main`, and the temp artifact root that contains the screenshots/diff report.

## Stop Conditions

- Stop and report if:
  - `pnpm outdated --format json` shows no available dependency updates
  - GitHub auth or push access is missing
  - the worktree contains unrelated risky user changes
  - the visual compare shows a material UI change you cannot justify
  - the PR cannot be merged because of a policy or permission blocker
