# CI/CD Automation

This project uses **GitHub Actions** to automatically run tests on every push.

## Workflow

The `.github/workflows/test.yml` pipeline performs the following steps on every Push to `main` and every Pull Request:

1.  Installs Node.js dependencies.
2.  Caches Playwright browser binaries (if unchanged).
3.  Lints code (ESLint).
4.  Runs Unit Tests (Vitest).
5.  Runs End-to-End Tests (Playwright).

## Environment Optimisation

To reduce build times, the pipeline uses **GitHub Actions Caching**:

- **npm Dependencies**: The `actions/setup-node` action caches the `~/.npm` directory based on `package-lock.json`.
- **Playwright Browsers**: Browser binaries are cached in `~/.cache/ms-playwright`. The cache key is tied to the specific version of Playwright found in `package-lock.json`, ensuring the environment is only rebuilt when the tool is updated.

## Setup for CI

The E2E tests require a valid Host login to verify the admin panel, which uses Firebase Authentication.

### Required Secrets

For the E2E tests to run successfully in the cloud, you must configure the following **Repository Secrets** in your GitHub repository settings (_Settings > Secrets and variables > Actions_):

- `TRIVIA_TEST_EMAIL`: Email of an authorized Firebase authentication user.
- `TRIVIA_TEST_PASSWORD`: Password for that user.

_Note: These credentials are used to simulate the Host logging in during the test._

## Automated Deployment

A separate workflow (`deploy.yml`) handles the deployment of Firebase Database Rules. It triggers **only** when `database.rules.json` or configuration files are modified on `main`.

### Required Secret for Deployment

To enable automated deployment, you must add the following **Repository Secret**:

- `FIREBASE_TOKEN`: A CI token from Firebase.
    - **How to generate:** Run `firebase login:ci` on your local machine and copy the token it outputs.
