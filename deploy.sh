#!/bin/bash
# ============================================================================
# Tmail Tmail — Blue-green deploy with Podman
# ============================================================================
set -e

IMAGE_NAME="${IMAGE_NAME:-tmail}"
CONTAINER_NAME="${CONTAINER_NAME:-tmail}"
HOST_PORT="${HOST_PORT:-8901}"
CONTAINER_PORT="${CONTAINER_PORT:-8901}"

log()  { echo -ne "\r\033[K==> $1"; }
ok()   { echo -e "\r\033[K\xe2\x9c\x93 $1"; }
fail() { echo -e "\r\033[K\xe2\x9c\x97 $1"; exit 1; }

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

# ----- BUILD ----------------------------------------------------------------
log "Building image: $IMAGE_NAME"

TOTAL=0
CURRENT=0
podman build -t "$IMAGE_NAME" . 2>&1 | while IFS= read -r line; do
  if [[ "$line" =~ \[([0-9]+)/([0-9]+)\] ]]; then
    CURRENT="${BASH_REMATCH[1]}"
    TOTAL="${BASH_REMATCH[2]}"
    STEP_MSG=$(echo "$line" | sed 's/\[[0-9]*\/[0-9]*\] //')
    P=$(( CURRENT * 100 / TOTAL ))
    printf "\r\033[K[%3d/%3d] %3d%% %s" "$CURRENT" "$TOTAL" "$P" "$STEP_MSG"
  else
    # Show non-progress lines (errors, warnings, etc.)
    printf "\r\033[K  %s\n" "$line"
  fi
done

[ "${PIPESTATUS[0]}" -eq 0 ] && ok "Build complete" || fail "Build failed"

# ----- START NEW on TEMP PORT -----------------------------------------------
log "Starting new container on temp port $TEMP_PORT..."
podman run -d \
  --name "${CONTAINER_NAME}-new" \
  -p "$TEMP_PORT:$CONTAINER_PORT" \
  "${ENV_FLAGS[@]}" \
  "$IMAGE_NAME" >/dev/null

for i in $(seq 1 15); do
  if curl -sf "http://localhost:$TEMP_PORT" >/dev/null 2>&1; then
    ok "New container is up (port $TEMP_PORT)"
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
OLD_CONTAINER_ID=$(podman ps --noheading --format '{{.ID}}' --filter "name=^${CONTAINER_NAME}$" 2>/dev/null)
podman rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
ok "Old container stopped"

# ----- MIGRATE TO REAL PORT --------------------------------------------------
log "Migrating to port $HOST_PORT..."
podman rm -f "${CONTAINER_NAME}-new" >/dev/null 2>&1 || true
podman run -d \
  --name "$CONTAINER_NAME" \
  -p "$HOST_PORT:$CONTAINER_PORT" \
  "${ENV_FLAGS[@]}" \
  "$IMAGE_NAME" >/dev/null
ok "Migrated to port $HOST_PORT"

for i in $(seq 1 10); do
  if curl -sf "http://localhost:$HOST_PORT" >/dev/null 2>&1; then
    ok "Container running at http://$IP:$HOST_PORT"
    break
  fi
  sleep 1
done

# ----- CLEANUP ---------------------------------------------------------------
log "Cleaning up..."
# Remove unused images — force-remove dangling images leftover from multi-stage builds
podman images --filter dangling=true --format '{{.ID}}' 2>/dev/null | xargs -r podman rmi -f >/dev/null 2>&1 || true
# Explicitly remove old image from previous build
if [ -n "$OLD_IMAGE_ID" ]; then
  CURRENT_ID=$(podman images --noheading --format '{{.ID}}' "$IMAGE_NAME" 2>/dev/null | head -1)
  if [ "$OLD_IMAGE_ID" != "$CURRENT_ID" ]; then
    podman rmi -f "$OLD_IMAGE_ID" >/dev/null 2>&1 || true
  fi
fi
# Remove base image so next deploy pulls fresh
BASE_IMAGE=$(grep '^FROM ' Containerfile | head -1 | awk '{print $2}')
podman rmi "$BASE_IMAGE" >/dev/null 2>&1 || true
ok "Cleanup done"
