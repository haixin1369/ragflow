#!/bin/bash
set -e
HASH=$(python3 - <<'PYEOF'
import hashlib, secrets, base64, os
salt = os.urandom(16)
it = 260000
key = hashlib.pbkdf2_hmac('sha256', b'admin123', salt, it)
salt_b64 = base64.b64encode(salt).decode()
key_b64 = base64.b64encode(key).decode()
print(f"pbkdf2:sha256:{it}${salt_b64}${key_b64}")
PYEOF
)
echo "HASH=$HASH"
docker exec docker-mysql-1 mysql -uroot -pinfini_rag_flow -e "UPDATE rag_flow.user SET password='$HASH' WHERE email='admin@ragflow.io';" 2>/dev/null
echo "--- verify login ---"
printf '%s' '{"email":"admin@ragflow.io","password":"admin123"}' > /tmp/login.json
curl -s --max-time 8 -X POST http://127.0.0.1:9380/api/v1/auth/login -H 'Content-Type: application/json' --data-binary @/tmp/login.json | head -c 400
echo
