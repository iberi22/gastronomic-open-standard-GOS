# 🔐 Setup Guide for Automated Workflows

## Prerequisites

The following secrets need to be configured in your repository settings.

---

## 📧 Email Cleanup Workflow

### Required Secrets

#### 1. `GMAIL_CREDENTIALS`

**What:** OAuth2 client credentials from Google Cloud Console

**How to get:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project `saber-proactivo-2025`
3. Navigate to **APIs & Services** → **Credentials**
4. Download OAuth2 client credentials JSON
5. Copy the entire JSON content

**Add to GitHub:**

```bash
gh secret set GMAIL_CREDENTIALS --repo iberi22/Git-Core-Protocol
# Paste the JSON content when prompted
```

#### 2. `GMAIL_TOKEN`

**What:** OAuth2 access/refresh token (generated after first authentication)

**How to get:**

1. Run the email handler locally first:

   ```bash
   python tools/email-handler/src/main.py
   ```

2. Complete OAuth flow in browser
3. Copy content of generated `tools/email-handler/token.json`

**Add to GitHub:**

```bash
gh secret set GMAIL_TOKEN --repo iberi22/Git-Core-Protocol
# Paste the token.json content when prompted
```

**Note:** This token will need to be updated periodically if it expires.

---

## 🌐 Global Self-Healing Monitor

### Required Permissions

The `GITHUB_TOKEN` (automatically provided) needs access to:

- ✅ Read workflow runs (all repos)
- ✅ Create issues (all repos)
- ✅ Rerun workflows (all repos)

**Grant access:**

For each target repo, ensure the GitHub App or Personal Access Token has:

- `actions: read`
- `contents: read`
- `issues: write`

---

## 🚀 Protocol Propagation

### Required Permissions

The `GITHUB_TOKEN` needs:

- ✅ Read source repo (`Git-Core-Protocol`)
- ✅ Create branches (target repos)
- ✅ Create PRs (target repos)

**Note:** Uses the same token as Global Self-Healing.

---

## 🔧 Testing Setup

### Test Email Cleanup

```bash
# Manual trigger
gh workflow run email-cleanup.yml --repo iberi22/Git-Core-Protocol
```

### Test Global Monitor

```bash
# Manual trigger
gh workflow run global-self-healing.yml --repo iberi22/Git-Core-Protocol
```

### Test Protocol Propagation

```powershell
# Dry run
.\scripts\release-protocol.ps1 -DryRun
```

---

## 🛡️ Security Best Practices

1. **Rotate secrets regularly** (every 90 days)
2. **Use minimal scopes** for OAuth tokens
3. **Monitor secret usage** in workflow logs
4. **Never commit secrets** to repository

---

## 📊 Monitoring

### Check Workflow Status

```bash
# Email cleanup
gh run list --workflow email-cleanup.yml --limit 5

# Global self-healing
gh run list --workflow global-self-healing.yml --limit 5

# Protocol propagation
gh run list --workflow protocol-propagation.yml --limit 5
```

### View Logs

```bash
gh run view <RUN_ID> --log
```

---

## 🆘 Troubleshooting

### Email Cleanup Fails

**Error:** `GMAIL_CREDENTIALS not found`
**Solution:** Verify secret is set correctly

**Error:** `Invalid token`
**Solution:** Regenerate `GMAIL_TOKEN` by running locally

### Global Monitor Cannot Access Repo

**Error:** `Resource not accessible`
**Solution:** Check GitHub token permissions for that repo

### Protocol Propagation Creates Empty PRs

**Error:** `No changes detected`
**Solution:** This is expected if repo is already up to date

---

## 🔄 Updating Secrets

```bash
# Update Gmail credentials
gh secret set GMAIL_CREDENTIALS --repo iberi22/Git-Core-Protocol < credentials.json

# Update Gmail token
gh secret set GMAIL_TOKEN --repo iberi22/Git-Core-Protocol < token.json
```

---

*Last updated: December 2025*
