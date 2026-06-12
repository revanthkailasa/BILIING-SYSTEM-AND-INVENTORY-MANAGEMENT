# Deploying via GitHub Actions to Firebase Hosting

This repository includes a GitHub Actions workflow that deploys the app to Firebase Hosting when you push to `main` (or `master`).

## Steps to enable CI deploy

1. Generate a Firebase CI token on your local machine:

```bash
# Install firebase-tools locally if needed
npm install -g firebase-tools

# Login interactively
firebase login

# Generate a CI token (copy the output)
firebase login:ci
```

2. In your GitHub repository, go to **Settings → Secrets and variables → Actions → New repository secret** and add:
- `FIREBASE_TOKEN` — the token from `firebase login:ci`
- `FIREBASE_PROJECT` — your Firebase project id (e.g. `billingsystemandinventorysyste`)

3. Push this branch (or merge to `main`) to trigger the workflow:

```bash
git add .github/workflows/firebase-hosting.yml firebase.json DEPLOY.md
git commit -m "Add Github Actions workflow for Firebase Hosting"
git push origin main
```

4. After the workflow completes, your site will be available at:
- https://<your-project-id>.web.app
- https://<your-project-id>.firebaseapp.com

## Notes
- The workflow installs the Firebase CLI and runs `firebase deploy` with the provided token.
- If your app requires a build step (e.g., React/Vue), add the build commands before the deploy step and set the `public` field in `firebase.json` to the build output directory (e.g., `build` or `dist`).
