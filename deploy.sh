#!/bin/bash
# ============================================================================
# DEPLOY.SH — Blue-green deploy with Podman
# ============================================================================
set -e

IMAGE_NAME="${IMAGE_NAME:-tmail}"
CONTAINER_NAME="${CONTAINER_NAME:-tmail}"
HOST_PORT="${HOST_PORT:-8901}"
CONTAINER_PORT="${CONTAINER_PORT:-8901}"

DEPLOY_START=$(date +%s)
T_BUILD=0; T_HEALTH1=0; T_SWAP=0; T_HEALTH2=0; T_CLEANUP=0

log()  { echo -ne "\r\033[K==> $1"; }
ok()   { echo -e "\r\033[K\xe2\x9c\x93 $1"; }
fail() { echo -e "\r\033[K\xe2\x9c\x97 $1"; exit 1; }

fmt_duration() {
  local s=$1
  if   [ "$s" -ge 3600 ]; then printf "%dh %dm %ds" $((s/3600)) $(((s%3600)/60)) $((s%60))
  elif [ "$s" -ge 60 ];   then printf "%dm %ds" $((s/60)) $((s%60))
  else printf "%ds" "$s"
  fi
}

IP=$(ip -4 addr show 2>/dev/null | grep -oP 'inet \K[^/]+' | grep -v '^127\.' | head -1)
[ -z "$IP" ] && IP=$(hostname -I 2>/dev/null | awk '{print $1}')
[ -z "$IP" ] && IP="localhost"

# Env file for container (pass MONGODB_URI etc.)
ENV_FILE=""
[ -f ".env.local" ] && ENV_FILE="--env-file=.env.local"
ENV_FLAGS=()
[ -n "$ENV_FILE" ] && ENV_FLAGS+=("$ENV_FILE")
# Also pass through any TM_ prefixed vars from host
for var in $(env | grep '^TM_' | cut -d= -f1); do
  ENV_FLAGS+=("-e" "$var")
done

# Detect an available port near HOST_PORT
find_port() {
  local base=$1
  while ss -tlnp "sport = :$base" 2>/dev/null | grep -q ":$base"; do
    base=$((base + 1))
  done
  echo "$base"
}
TEMP_PORT=$(find_port $((HOST_PORT + 1)))

# Grab old image ID before we build (so we can nuke it later)
OLD_IMAGE_ID=$(podman images --noheading --format '{{.ID}}' "$IMAGE_NAME" 2>/dev/null | head -1)

# Detect Dockerfile / Containerfile
CONTAINERFILE=""
for f in Containerfile Dockerfile; do
  [ -f "$f" ] && CONTAINERFILE="$f" && break
done
[ -z "$CONTAINERFILE" ] && fail "No Containerfile or Dockerfile found"

# ----- BUILD ----------------------------------------------------------------
log "Building image: $IMAGE_NAME"

_T0=$(date +%s)
BUILD_STATUS_FILE=$(mktemp)
SPINNER_CHARS='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
SPINNER_IDX=0

(
  podman build -f "$CONTAINERFILE" -t "$IMAGE_NAME" . 2>&1
  echo "$?" > "$BUILD_STATUS_FILE"
) | while IFS= read -r line; do
  # Stage progress: [N/M] ...
  if [[ "$line" =~ \[([0-9]+)/([0-9]+)\] ]]; then
    CURRENT="${BASH_REMATCH[1]}"
    TOTAL="${BASH_REMATCH[2]}"
    STEP_MSG=$(echo "$line" | sed 's/\[[0-9]*\/[0-9]*\] //')
    P=$(( CURRENT * 100 / TOTAL ))
    printf "\r\033[K[%3d/%3d] %3d%% %s" "$CURRENT" "$TOTAL" "$P" "$STEP_MSG"
  # Filter out noisy pnpm install lines
  elif [[ "$line" =~ ^[[:space:]]*(Progress:|Packages:|\[WARN\]|Done\ in) ]]; then
    SPINNER_CHAR="${SPINNER_CHARS:$((SPINNER_IDX % ${#SPINNER_CHARS})):1}"
    SPINNER_IDX=$((SPINNER_IDX + 1))
    printf "\r\033[K  %s Installing dependencies..." "$SPINNER_CHAR"
  # Show actual errors and meaningful lines
  elif [[ "$line" =~ (error|Error|ERROR|failed|FAILED) ]]; then
    printf "\r\033[K  ! %s\n" "$line"
  fi
done

BUILD_EXIT=$(cat "$BUILD_STATUS_FILE" 2>/dev/null)
rm -f "$BUILD_STATUS_FILE"

T_BUILD=$(( $(date +%s) - _T0 ))
[ "${BUILD_EXIT:-1}" -eq 0 ] && ok "Build complete ($(fmt_duration $T_BUILD))" || fail "Build failed"

# ----- START NEW on TEMP PORT -----------------------------------------------
log "Starting new container on temp port $TEMP_PORT..."
podman run -d \
  --name "${CONTAINER_NAME}-new" \
  -p "$TEMP_PORT:$CONTAINER_PORT" \
  "${ENV_FLAGS[@]}" \
  "$IMAGE_NAME" >/dev/null

_T0=$(date +%s)
for i in $(seq 1 15); do
  if curl -sf "http://localhost:$TEMP_PORT" >/dev/null 2>&1; then
    T_HEALTH1=$(( $(date +%s) - _T0 ))
    ok "New container is up (port $TEMP_PORT, $(fmt_duration $T_HEALTH1))"
    break
  fi
  [ "$i" -eq 15 ] && {
    podman rm -f "${CONTAINER_NAME}-new" >/dev/null 2>&1 || true
    fail "New container failed to start"
  }
  sleep 1
done

# ----- STOP & REMOVE OLD ----------------------------------------------------
log "Stopping old container..."
_T0=$(date +%s)
podman rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
T_SWAP=$(( $(date +%s) - _T0 ))
ok "Old container stopped"

# ----- MIGRATE TO REAL PORT --------------------------------------------------
log "Migrating to port $HOST_PORT..."
podman rm -f "${CONTAINER_NAME}-new" >/dev/null 2>&1 || true
podman run -d \
  --name "$CONTAINER_NAME" \
  --restart=unless-stopped \
  -p "$HOST_PORT:$CONTAINER_PORT" \
  "${ENV_FLAGS[@]}" \
  "$IMAGE_NAME" >/dev/null
ok "Migrated to port $HOST_PORT"

_T0=$(date +%s)
FINAL_UP=0
for i in $(seq 1 10); do
  if curl -sf "http://localhost:$HOST_PORT" >/dev/null 2>&1; then
    T_HEALTH2=$(( $(date +%s) - _T0 ))
    ok "Container running at http://$IP:$HOST_PORT"
    FINAL_UP=1
    break
  fi
  sleep 1
done
[ "$FINAL_UP" -eq 0 ] && fail "Container on port $HOST_PORT did not respond after migration"

# ----- CLEANUP ---------------------------------------------------------------
log "Cleaning up..."
_T0=$(date +%s)

# 1. Remove leftover buildah working containers from multi-stage build
podman ps -a --external --format '{{.ID}} {{.Names}}' 2>/dev/null \
  | grep 'working-container' \
  | awk '{print $1}' \
  | xargs -r podman rm -f >/dev/null 2>&1 || true

# 2. Remove old named image from previous deploy (now safe since working containers are gone)
if [ -n "$OLD_IMAGE_ID" ]; then
  CURRENT_ID=$(podman images --noheading --format '{{.ID}}' "$IMAGE_NAME" 2>/dev/null | head -1)
  if [ "$OLD_IMAGE_ID" != "$CURRENT_ID" ]; then
    podman rmi -f "$OLD_IMAGE_ID" >/dev/null 2>&1 || true
  fi
fi

# 3. Remove dangling/intermediate images left from multi-stage build
podman images --filter dangling=true --format '{{.ID}}' 2>/dev/null \
  | xargs -r podman rmi -f >/dev/null 2>&1 || true

# NOTE: base image (alpine:edge) is intentionally kept — speeds up next build

T_CLEANUP=$(( $(date +%s) - _T0 ))
ok "Cleanup done"

# ----- SUMMARY ---------------------------------------------------------------
DEPLOY_END=$(date +%s)
DEPLOY_TOTAL=$(( DEPLOY_END - DEPLOY_START ))
NEW_IMAGE_ID=$(podman images --noheading --format '{{.ID}}' "$IMAGE_NAME" 2>/dev/null | head -1)
IMAGE_SIZE=$(podman images --noheading --format '{{.Size}}' "$IMAGE_NAME" 2>/dev/null | head -1)

echo ""
echo "  ┌─────────────────────────────────────────────┐"
printf "  │  %-43s│\n" "Deploy Summary — $(date '+%Y-%m-%d %H:%M:%S')"
echo "  ├─────────────────────────────────────────────┤"
printf "  │  %-20s %-22s│\n" "Image"        "$IMAGE_NAME ($NEW_IMAGE_ID)"
printf "  │  %-20s %-22s│\n" "Image size"   "$IMAGE_SIZE"
printf "  │  %-20s %-22s│\n" "URL"          "http://$IP:$HOST_PORT"
echo "  ├─────────────────────────────────────────────┤"
printf "  │  %-20s %-22s│\n" "Build"        "$(fmt_duration $T_BUILD)"
printf "  │  %-20s %-22s│\n" "Health check" "$(fmt_duration $T_HEALTH1)"
printf "  │  %-20s %-22s│\n" "Swap"         "$(fmt_duration $T_SWAP)"
printf "  │  %-20s %-22s│\n" "Final check"  "$(fmt_duration $T_HEALTH2)"
printf "  │  %-20s %-22s│\n" "Cleanup"      "$(fmt_duration $T_CLEANUP)"
echo "  ├─────────────────────────────────────────────┤"
printf "  │  %-20s %-22s│\n" "Total"        "$(fmt_duration $DEPLOY_TOTAL)"
echo "  └─────────────────────────────────────────────┘"
echo ""
