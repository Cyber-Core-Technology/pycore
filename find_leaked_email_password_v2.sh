#!/usr/bin/env bash
# find_leaked_email_password_v2.sh
# Ejecutar dentro del repo privado ya clonado.
#
# Corrige el v1: ahora detecta también valores SIN comillas
# (formato típico de .env: EMAIL_HOST_PASSWORD=algo123)
# y agrega búsqueda directa de "hostinger" + variables en español.

set -euo pipefail

echo "== 1. Búsqueda directa de 'hostinger' en todo el historial =="
git log --all -p | grep -niE "hostinger" -B2 -A2 || echo "  (nada)"

echo
echo "== 2. Asignaciones EMAIL/SMTP/MAIL/CORREO con valor real, CON o SIN comillas =="
git log --all -p \
  | grep -nE "(EMAIL|SMTP|MAIL|CORREO)[A-Z_]*(PASS|PWD|CLAVE|CONTRASENA)[A-Z_]*[[:space:]]*[:=][[:space:]]*[\"']?[^[:space:]\"']{4,}" \
  | grep -viE "config\(|os\.environ|process\.env|getenv|example|placeholder|change_me|changeme|xxxx|^\s*[-+]?\s*$|=['\"]?\s*$" \
  || echo "  (ninguno)"

echo
echo "== 3. Variables en español para credenciales de correo =="
git log --all -p \
  | grep -niE "(CORREO|CLAVE_?CORREO|CONTRASENA_?CORREO|CLAVE_?SMTP|PASSWORD_?CORREO)[[:space:]]*[:=]" -A1 -B1 \
  || echo "  (ninguno)"

echo
echo "== 4. Revisando específicamente el feature de backups/alertas (suele mandar correos) =="
git log --all --oneline | grep -i backup
echo "  --- contenido relacionado a email en esos commits ---"
git log --all -p --follow -- '*backup*' '*alert*' 2>/dev/null \
  | grep -niE "(email|smtp|correo|mail).{0,50}(pass|pwd|clave)" -A2 -B2 \
  || echo "  (nada)"

echo
echo "== 5. Cualquier archivo .env real (no .example) que se haya subido en TODA la historia =="
git log --all --diff-filter=A --name-only | grep -iE '(^|/)\.env$|(^|/)\.env\.[a-z]+$' | grep -viE '\.example' | sort -u \
  || echo "  (ninguno)"

echo
echo "----------------------------------------------------------------"
echo "Si algo aparece arriba, para ubicar el commit y quién lo subió:"
echo "  git log --all -S'FRAGMENTO_SOSPECHOSO' --source --oneline"
