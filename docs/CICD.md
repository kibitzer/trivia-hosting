# CI/CD Automation

This project uses **GitHub Actions** to automatically run tests on every push.

## Workflow
The `.github/workflows/test.yml` pipeline performs the following steps on every Push to `main` and every Pull Request:
1.  Installs Node.js dependencies.
2.  Installs Playwright browsers.
3.  Runs Unit Tests (Vitest).
4.  Runs End-to-End Tests (Playwright).

## Setup for CI
The E2E tests require a valid Host login to verify the admin panel, which uses Firebase Authentication.

### Required Secrets
For the E2E tests to run successfully in the cloud, you must configure the following **Repository Secrets** in your GitHub repository settings (*Settings > Secrets and variables > Actions*):

*   `TRIVIA_TEST_EMAIL`: Email of an authorized Firebase authentication user.
*   `TRIVIA_TEST_PASSWORD`: Password for that user.

*Note: These credentials are used to simulate the Host logging in during the test.*

## Automated Deployment
A separate workflow (`deploy.yml`) handles the deployment of Firebase Database Rules. It triggers **only** when `database.rules.json` or configuration files are modified on `main`.

### Required Secret for Deployment
To enable automated deployment, you must add the following **Repository Secret**:

*   `FIREBASE_TOKEN`: A CI token from Firebase.
    *   **How to generate:** Run `firebase login:ci` on your local machine and copy the token it outputs.
