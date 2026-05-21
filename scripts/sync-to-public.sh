#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# sync-to-public.sh
#
# Sincroniza commits del repo privado al fork público, excluyendo los módulos
# sensibles. Lo invoca el workflow .github/workflows/sync-public.yml.
#
# Lógica:
#   1. Lee .sync-state del fork público para saber el último SHA privado sincronizado.
#   2. Por cada commit nuevo (en orden): genera un diff excluyendo las rutas
#      bloqueadas y manuales, lo aplica en el fork público y crea un commit.
#   3. Actualiza .sync-state y termina.
#
# Señales en los mensajes de commit:
#   [skip-sync]  → el commit se omite por completo (útil para billing, hotfixes internos, etc.)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Módulos BLOQUEADOS ────────────────────────────────────────────────────────
# Directorios/archivos que NUNCA se sincronizan.
BLOCKED=(
  "backend/apps/billing"
  "backend/apps/facturacion"
  "backend/apps/tezca"
  "frontend/src/features/billing"
  "frontend/src/components/common/SubscriptionBlockedOverlay.tsx"
)

# ── Archivos MANUALES ─────────────────────────────────────────────────────────
# Existen en el fork público con una versión sanitizada mantenida a mano.
# El script nunca los sobreescribe. Actualízalos tú directamente en el fork.
MANUAL=(
  "backend/apps/auth_module/views/auth_views.py"
  "backend/pycore/settings/base.py"
  "backend/apps/core/management/commands/seed.py"
  "nginx/conf.d/pycore.prod.conf"
  "frontend/src/components/layout/MainLayout.tsx"
  "frontend/src/router/index.tsx"
  "frontend/src/store/authStore.ts"
  "frontend/src/api/axios-config.ts"
)

# ── Constantes ────────────────────────────────────────────────────────────────
PUBLIC_DIR="public-fork"
STATE_FILE="${PUBLIC_DIR}/.sync-state"
EMPTY_TREE="4b825dc642cb6eb9a060e54bf8d69288fbee4904"

# ─────────────────────────────────────────────────────────────────────────────

log()  { echo "  $*"; }
skip() { echo "  ⊘ SKIP  ${1:0:12} — $2"; }
sync() { echo "  ✓ SYNC  ${1:0:12} — $2"; }
warn() { echo "  ⚠ WARN  $*"; }

# ── Configurar git en el fork público ────────────────────────────────────────
git -C "$PUBLIC_DIR" config user.name  "sync-bot"
git -C "$PUBLIC_DIR" config user.email "sync@noreply.github.com"

# ── Primer uso: guardar punto de partida y salir ──────────────────────────────
if [[ ! -f "$STATE_FILE" ]]; then
  CURRENT_HEAD=$(git rev-parse HEAD)
  echo "⚠  Sin .sync-state — primer uso detectado."
  echo "   Guardando HEAD actual (${CURRENT_HEAD:0:12}) como punto de partida."
  echo "   El fork público debe estar configurado manualmente hasta este punto."
  cat > "$STATE_FILE" << EOF
LAST_PRIVATE_SHA=${CURRENT_HEAD}
LAST_SYNC_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
SYNCED_COMMITS=0
SKIPPED_COMMITS=0
EOF
  git -C "$PUBLIC_DIR" add .sync-state
  git -C "$PUBLIC_DIR" commit -m "chore: inicializar estado de sincronización [skip-sync]" || true
  echo "   Listo. El próximo push sincronizará desde este punto."
  exit 0
fi

# ── Leer último SHA privado sincronizado ──────────────────────────────────────
LAST_SHA=$(grep "^LAST_PRIVATE_SHA=" "$STATE_FILE" | cut -d= -f2 | tr -d '[:space:]')
echo "Último SHA privado: ${LAST_SHA:0:12}"

# ── Commits pendientes (del más antiguo al más nuevo) ────────────────────────
mapfile -t COMMITS < <(git log --format="%H" "${LAST_SHA}..HEAD" --reverse 2>/dev/null || true)

if [[ ${#COMMITS[@]} -eq 0 ]]; then
  echo "✓ Fork público ya está al día."
  exit 0
fi

echo "Commits pendientes: ${#COMMITS[@]}"
echo ""

# ── Construir pathspecs de exclusión ─────────────────────────────────────────
EXCLUDE=()
for p in "${BLOCKED[@]}" "${MANUAL[@]}"; do
  EXCLUDE+=(":(exclude)${p}")
done

# ── Procesar cada commit ──────────────────────────────────────────────────────
SYNCED=0
SKIPPED=0
NEW_LAST_SHA="$LAST_SHA"

for COMMIT in "${COMMITS[@]}"; do
  MSG=$(git log -1 --format="%s" "$COMMIT")

  # Omitir commits marcados con [skip-sync]
  if [[ "$MSG" == *"[skip-sync]"* ]]; then
    skip "$COMMIT" "$MSG"
    NEW_LAST_SHA="$COMMIT"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # SHA padre (árbol vacío si es el primer commit del repo)
  PREV=$(git rev-parse "${COMMIT}^" 2>/dev/null || echo "$EMPTY_TREE")

  # Diff excluyendo rutas bloqueadas y manuales
  DIFF=$(git diff "$PREV" "$COMMIT" -- . "${EXCLUDE[@]}" 2>/dev/null || true)

  if [[ -z "$DIFF" ]]; then
    skip "$COMMIT" "$MSG (sin cambios en módulos permitidos)"
    NEW_LAST_SHA="$COMMIT"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Aplicar diff al fork público (--3way permite merge si hay cambios locales)
  if ! echo "$DIFF" | git -C "$PUBLIC_DIR" apply --3way --whitespace=nowarn 2>/dev/null; then
    warn "Conflicto al aplicar ${COMMIT:0:12} — omitiendo este commit"
    git -C "$PUBLIC_DIR" checkout -- . 2>/dev/null || true
    git -C "$PUBLIC_DIR" clean -fd  2>/dev/null || true
    NEW_LAST_SHA="$COMMIT"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Verificar que haya cambios reales en el árbol de trabajo
  if [[ -z "$(git -C "$PUBLIC_DIR" status --porcelain 2>/dev/null)" ]]; then
    skip "$COMMIT" "$MSG (diff vacío tras aplicar)"
    NEW_LAST_SHA="$COMMIT"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Preservar autoría original del commit
  AUTHOR_NAME=$(git log -1 --format="%an" "$COMMIT")
  AUTHOR_EMAIL=$(git log -1 --format="%ae" "$COMMIT")
  AUTHOR_DATE=$(git log -1 --format="%aI" "$COMMIT")
  BODY=$(git log -1 --format="%b" "$COMMIT")

  FULL_MSG="$MSG"
  [[ -n "$BODY" ]] && FULL_MSG="${FULL_MSG}

${BODY}"
  FULL_MSG="${FULL_MSG}

[synced-from: ${COMMIT}]"

  git -C "$PUBLIC_DIR" add -A
  GIT_AUTHOR_NAME="$AUTHOR_NAME" \
  GIT_AUTHOR_EMAIL="$AUTHOR_EMAIL" \
  GIT_AUTHOR_DATE="$AUTHOR_DATE" \
  git -C "$PUBLIC_DIR" commit -m "$FULL_MSG"

  sync "$COMMIT" "$MSG"
  NEW_LAST_SHA="$COMMIT"
  SYNCED=$((SYNCED + 1))
done

# ── Actualizar .sync-state ────────────────────────────────────────────────────
cat > "$STATE_FILE" << EOF
LAST_PRIVATE_SHA=${NEW_LAST_SHA}
LAST_SYNC_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
SYNCED_COMMITS=${SYNCED}
SKIPPED_COMMITS=${SKIPPED}
EOF

git -C "$PUBLIC_DIR" add .sync-state
git -C "$PUBLIC_DIR" commit -m "chore: actualizar estado de sincronización [skip-sync]" 2>/dev/null || true

echo ""
echo "─────────────────────────────────────────"
echo " Sincronización completa"
echo " Sincronizados : ${SYNCED}"
echo " Omitidos      : ${SKIPPED}"
echo "─────────────────────────────────────────"
