# Release Process

This document describes the release process for all packages in the monorepo (`@mixedbread/cli`, `@mixedbread/mcp`).

## Prerequisites

### 1. NPM Authentication

To publish packages, you need to set up the `NPM_TOKEN` secret in your GitHub repository:

1. Create an npm access token:
   - Go to [npmjs.com](https://www.npmjs.com/) and sign in
   - Click on your profile picture → Access Tokens
   - Generate New Token → Classic Token
   - Select "Automation" type
   - Copy the generated token

2. Add the token to GitHub:
   - Go to your repository on GitHub
   - Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Your npm token

### 2. Permissions

Ensure your npm account has publish access to the `@mixedbread` scope.

## Release Workflow

### 1. Creating a Changeset

When you make changes that should be released:

```bash
# Create a new changeset
pnpm changeset

# Follow the prompts to:
# - Select which packages have changed
# - Choose the version bump type (major/minor/patch)
# - Write a summary of the changes
```

### 2. Commit the Changeset

```bash
git add .changeset
git commit -m "chore: add changeset for [your changes]"
git push
```

### 3. Automated Release Process

When changesets are pushed to the `main` branch:

1. The GitHub Action creates a "Version Packages" PR automatically
2. This PR will:
   - Update package versions
   - Update CHANGELOG.md files
   - Remove consumed changesets

3. Review and merge the "Version Packages" PR

4. Upon merging, the GitHub Action will:
   - Build all packages with changes
   - Publish to npm with provenance
   - Create a GitHub release with changelog

## Manual Release (Emergency Only)

If automated release fails:

```bash
# Ensure you're on main branch with latest changes
git checkout main
git pull

# Build and publish
pnpm release
```

## Version Guidelines

Follow [Semantic Versioning](https://semver.org/):

- **Patch** (0.0.X): Bug fixes, documentation updates
- **Minor** (0.X.0): New features, backwards-compatible changes
- **Major** (X.0.0): Breaking changes

## Troubleshooting

### Release Action Fails

1. Check GitHub Actions logs for errors
2. Verify `NPM_TOKEN` is set correctly
3. Ensure you have publish permissions for all packages

### Package Not Published

1. Check if the version already exists on npm
2. Verify the changeset was consumed
3. Check npm account permissions

## Best Practices

1. Always create changesets for user-facing changes
2. Write clear, descriptive changeset summaries
3. Group related changes in a single changeset
4. Test locally before creating a changeset
5. Review the Version Packages PR carefully before merging