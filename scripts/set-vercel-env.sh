#!/usr/bin/env bash
# Push all blog-agent env vars to Vercel (both projects) and redeploy.
#
# Reads shared secrets from the LinkedIn agent's .env.local (Anthropic + Unipile),
# uses the known Supabase URL, generates the two secrets, and requires ONLY the
# blog project's service-role key via $BLOG_SR_KEY (the one value no tool exposes).
#
# Usage:
#   BLOG_SR_KEY='eyJ...the blog project service_role key...' bash scripts/set-vercel-env.sh
#
set -euo pipefail

TEAM="robert-benders-projects"
BLOG_DIR="/c/Users/rbend/Desktop/Claude Projects/golfvilla-blog-agent"
LI_DIR="/c/Users/rbend/Desktop/Claude Projects/LinkendIN Agent"
LI_ENV="$LI_DIR/.env.local"

[ -n "${BLOG_SR_KEY:-}" ] || { echo "ERROR: set BLOG_SR_KEY to the blog project's service_role key first."; exit 1; }
[ -f "$LI_ENV" ] || { echo "ERROR: LinkedIn .env.local not found at $LI_ENV"; exit 1; }

# Pull shared values from the LinkedIn agent env (value after first '=').
get() { grep -E "^$1=" "$LI_ENV" | head -1 | cut -d= -f2-; }
ANTHROPIC_API_KEY="$(get ANTHROPIC_API_KEY)"
UNIPILE_API_KEY="$(get UNIPILE_API_KEY)"
UNIPILE_DSN="$(get UNIPILE_DSN)"
UNIPILE_WA_ACCT="$(get UNIPILE_WHATSAPP_ACCOUNT_ID)"
UNIPILE_WA_OWNER="$(get UNIPILE_WHATSAPP_OWNER_NUMBER)"

# Known + generated.
SUPABASE_URL="https://genidekhqwsxvsboyrih.supabase.co"
GOLFVILLA_REPO="rbender-boop/golfvilla-com"
CRON_SECRET="$(openssl rand -hex 24)"
INBOUND_RESOLVE_SECRET="$(openssl rand -hex 24)"

# set NAME VALUE [dir] [project]  — idempotent (rm then add), production scope.
set_env() {
  local name="$1" val="$2" dir="$3" proj="$4"
  ( cd "$dir" && vercel link --yes --project "$proj" --scope "$TEAM" >/dev/null 2>&1 || true
    vercel env rm "$name" production --yes --scope "$TEAM" >/dev/null 2>&1 || true
    printf '%s' "$val" | vercel env add "$name" production --scope "$TEAM" >/dev/null
    echo "  set $name" )
}

echo "== golfvilla-blog-agent =="
set_env SUPABASE_URL                "$SUPABASE_URL"           "$BLOG_DIR" golfvilla-blog-agent
set_env SUPABASE_SERVICE_ROLE_KEY   "$BLOG_SR_KEY"            "$BLOG_DIR" golfvilla-blog-agent
set_env ANTHROPIC_API_KEY           "$ANTHROPIC_API_KEY"      "$BLOG_DIR" golfvilla-blog-agent
set_env UNIPILE_API_KEY             "$UNIPILE_API_KEY"        "$BLOG_DIR" golfvilla-blog-agent
set_env UNIPILE_DSN                 "$UNIPILE_DSN"            "$BLOG_DIR" golfvilla-blog-agent
set_env UNIPILE_WHATSAPP_ACCOUNT_ID "$UNIPILE_WA_ACCT"        "$BLOG_DIR" golfvilla-blog-agent
set_env UNIPILE_WHATSAPP_OWNER_NUMBER "$UNIPILE_WA_OWNER"     "$BLOG_DIR" golfvilla-blog-agent
set_env GOLFVILLA_REPO              "$GOLFVILLA_REPO"         "$BLOG_DIR" golfvilla-blog-agent
set_env CRON_SECRET                 "$CRON_SECRET"            "$BLOG_DIR" golfvilla-blog-agent
set_env INBOUND_RESOLVE_SECRET      "$INBOUND_RESOLVE_SECRET" "$BLOG_DIR" golfvilla-blog-agent

echo "== linkedin-agent (shared inbound secret) =="
set_env INBOUND_RESOLVE_SECRET      "$INBOUND_RESOLVE_SECRET" "$LI_DIR" linkedin-agent

echo "== redeploy both (pick up new env) =="
( cd "$BLOG_DIR" && vercel redeploy golfvilla-blog-agent.vercel.app --scope "$TEAM" >/dev/null 2>&1 || vercel --prod --yes --scope "$TEAM" >/dev/null 2>&1 || true )
echo "Done. GITHUB_TOKEN_GOLFVILLA was already set; left as-is."
echo "INBOUND_RESOLVE_SECRET (shared) = $INBOUND_RESOLVE_SECRET"
