#!/usr/bin/env bash
# find_leaked_email_password.sh
#
# Uso: ejecutar DENTRO de una copia local ya clonada del repo PRIVADO
#   git clone git@github.com:Cyber-Core-Technology/<repo-privado>.git
#   cd <repo-privado>
#   bash find_leaked_email_password.sh
#
# Busca en TODO el historial de git (no solo el estado actual), porque
# aunque el secreto ya se haya borrado del código, sigue viviendo en commits viejos.

set -euo pipefail

echo "== 1. Archivos .env que se hayan subido alguna vez (en cualquier commit) =="
git log --all --diff-filter=A --name-only | grep -iE '\.env($|\.[a-z]+$)' | sort -u || echo "  (ninguno)"

echo
echo "== 2. Asignaciones literales tipo PASSWORD=algo relacionadas a email/SMTP en todo el historial =="
git log --all -p \
  | grep -nE "(EMAIL|SMTP|MAIL)[A-Z_]*(PASS|PWD)[A-Z_]*[[:space:]]*[:=][[:space:]]*['\"][^'\"]{6,}['\"]" \
  | grep -viE "config\(|os\.environ|process\.env|getenv|example|placeholder|change_me|changeme|xxxx" \
  || echo "  (ninguno encontrado con este patrón)"

echo
echo "== 3. Módulos que normalmente NO se sincronizan al fork público (billing, facturacion, tezca) =="
git log --all -p -- backend/apps/billing backend/apps/facturacion backend/apps/tezca 2>/dev/null \
  | grep -niE "(email|smtp|mail).{0,40}(pass|pwd)" -A2 -B2 \
  || echo "  (nada sospechoso aquí, o esas rutas no existen en este repo)"

echo
echo "== 4. Dominios SMTP conocidos junto a algo que parezca una clave real =="
git log --all -p \
  | grep -niE "smtp\.(gmail|office365|outlook|zoho|sendgrid|mailgun)\.[a-z]+" -A3 -B1 \
  || echo "  (ninguno)"

echo
echo "== 5. Archivos de CI/CD y despliegue (a veces llevan credenciales de notificación) =="
git log --all --diff-filter=A --name-only \
  | grep -iE '\.github/workflows|docker-compose|\.ya?ml$|Dockerfile' | sort -u

echo
echo "----------------------------------------------------------------"
echo "Si algo apareció arriba, ubica el commit exacto y quién lo subió con:"
echo "  git log --all -S'FRAGMENTO_SOSPECHOSO' --source --oneline"
echo "  git log --all -S'FRAGMENTO_SOSPECHOSO' --source -p | head -50"
