# flowpro.dev — landing page

Static HTML landing page for FlowPro. Auto-deploys to the server on every push to `main`.

## Structure

```
public/
  index.html     ← Polish landing page (flowpro.dev)
```

## Deploy

Push to `main` → GitHub Actions → rsync to `/var/www/flowpro.dev/` on server.

## Required GitHub Secrets

| Secret | Value |
|--------|-------|
| `SERVER_HOST` | IP address of the VPS |
| `SERVER_USER` | SSH user (e.g. `root` or `ubuntu`) |
| `SERVER_SSH_KEY` | Private SSH key (see setup guide) |
