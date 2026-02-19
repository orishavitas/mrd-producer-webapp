# Security Policy

## 🔒 API Key Protection Rules

**CRITICAL: This repository has ZERO TOLERANCE for exposed credentials.**

### Enforcement Mechanisms

1. **Pre-commit Hook** - Automatically blocks commits containing:
   - OpenAI API keys (`sk-...`)
   - Anthropic API keys (`sk-ant-api...`)
   - Google API keys (`AIza...`)
   - AWS credentials (`AKIA...`)
   - GitHub tokens (`ghp_...`, `gho_...`)
   - Bearer tokens
   - Generic API keys in JSON/config files
   - Passwords in configuration files

2. **GitHub Push Protection** - Repository-level secret scanning
3. **`.gitignore` Rules** - All `.env*` files (except templates) are ignored

### Approved Storage Locations

✅ **SAFE** - Use these for API keys:
- `.env.local` (git-ignored, local development)
- Vercel Dashboard (environment variables)
- Password managers (1Password, LastPass, etc.)
- CI/CD secrets (GitHub Actions secrets)

❌ **FORBIDDEN** - Never store keys here:
- Any file committed to git
- Source code files
- Configuration files in git
- Comments in code
- Documentation files
- Test files

### What to Do If You Expose a Key

1. **Immediately rotate the key** in the provider's dashboard
2. **Remove from git history** using `git filter-branch` or BFG Repo-Cleaner
3. **Update all deployment environments** with new key
4. **Notify team members** if this is a shared repository

### Environment File Rules

| File | Status | Purpose |
|------|--------|---------|
| `.env.local` | ❌ Never commit | Local development secrets |
| `.env.example` | ✅ Commit | Template without real values |
| `.env.vercel-*` | ❌ Never commit | Vercel CLI generated (has real keys) |
| `.env.development.local` | ❌ Never commit | Development secrets |
| `.env.test.local` | ❌ Never commit | Test secrets |
| `.env.production.local` | ❌ Never commit | Production secrets |

### Testing the Protection

To verify the pre-commit hook works:

```bash
# This should be BLOCKED:
echo "GOOGLE_API_KEY=AIzaSyTest123" > test-secrets.txt
git add test-secrets.txt
git commit -m "test"
# ❌ Should fail with security violation

# Clean up:
git reset HEAD test-secrets.txt
rm test-secrets.txt
```

### Developer Responsibilities

**Every developer MUST:**
1. ✅ Keep `.env.local` with real keys (never commit)
2. ✅ Use `.env.example` as template (commit this)
3. ✅ Update Vercel dashboard when rotating keys
4. ✅ Never hardcode API keys in source files
5. ✅ Never commit files containing secrets
6. ✅ Report exposed keys immediately

### API Key Rotation Schedule

| Provider | Rotation Policy | Last Rotated |
|----------|----------------|--------------|
| Google AI (Gemini) | Every 90 days or on exposure | 2026-02-17 |
| OpenAI | Every 90 days or on exposure | 2026-02-17 |
| Anthropic | Not currently used | N/A |

### Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT open a public issue**
2. Email: [your-security-email@domain.com]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Automated Security Checks

This repository uses:
- ✅ Git pre-commit hooks (local)
- ✅ GitHub secret scanning (on push)
- ✅ Vercel build-time checks
- ✅ `.gitignore` protection

### Verification Commands

```bash
# Check if hook is installed:
ls -la .git/hooks/pre-commit

# Test if .env.local is ignored:
git check-ignore .env.local
# Should output: .env.local

# View what would be committed:
git diff --cached

# Scan current working directory for secrets:
grep -r "sk-[a-zA-Z0-9]\{20,\}" . --exclude-dir=node_modules --exclude-dir=.git
```

### Emergency Response

If keys are exposed in git history:

```bash
# 1. Rotate ALL exposed keys immediately
# 2. Remove from history (example):
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.vercel-preview" \
  --prune-empty --tag-name-filter cat -- --all

# 3. Force push (DANGEROUS - coordinate with team):
git push origin --force --all

# 4. Update all environments
```

---

**Remember: Prevention is easier than cleanup. When in doubt, DON'T commit it.**

## Additional Resources

- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
