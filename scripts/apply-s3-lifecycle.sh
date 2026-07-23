#!/usr/bin/env bash
#
# Aplica la política de retención al bucket de backups de PyCore.
#
#   daily/     → expira a los 30 días  (solo producción escribe aquí)
#   weekly/    → expira a los 90 días  (solo producción escribe aquí)
#   non-prod/  → expira a los 7 días   (dev, testing y demás entornos)
#   multipart incompletos → se abortan a los 7 días
#
# La tarea core.backup_db solo sube objetos; el borrado lo hace S3 con estas
# reglas. Sin ellas los backups se acumulan indefinidamente.
#
# Uso:
#   ./scripts/apply-s3-lifecycle.sh                    # usa el bucket por defecto
#   BUCKET=otro-bucket ./scripts/apply-s3-lifecycle.sh
#
# Requiere awscli con credenciales que tengan s3:PutLifecycleConfiguration.
# Se puede correr desde AWS CloudShell.

set -euo pipefail

BUCKET="${BUCKET:-pycore-backups-cycotech-563565469089-us-east-2-an}"
REGION="${REGION:-us-east-2}"
CONFIG="$(dirname "$0")/s3-backup-lifecycle.json"

echo "→ Bucket: ${BUCKET} (${REGION})"
echo "→ Política: ${CONFIG}"
echo

echo "Estado actual:"
aws s3api get-bucket-lifecycle-configuration \
    --bucket "${BUCKET}" \
    --region "${REGION}" 2>/dev/null || echo "  (sin política de ciclo de vida)"
echo

read -r -p "¿Aplicar la política de retención? [s/N] " respuesta
if [[ ! "${respuesta}" =~ ^[sSyY]$ ]]; then
    echo "Cancelado."
    exit 0
fi

aws s3api put-bucket-lifecycle-configuration \
    --bucket "${BUCKET}" \
    --region "${REGION}" \
    --lifecycle-configuration "file://${CONFIG}"

echo
echo "✅ Política aplicada. Verificación:"
aws s3api get-bucket-lifecycle-configuration \
    --bucket "${BUCKET}" \
    --region "${REGION}"

echo
echo "Nota: S3 evalúa las reglas una vez al día de forma asíncrona. Los objetos"
echo "que ya superan el plazo pueden tardar hasta 48 h en desaparecer, y dejan"
echo "de cobrarse desde que se marcan para expirar."
