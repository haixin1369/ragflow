#!/bin/bash
cat > /tmp/login.json <<'EOF'
{"email":"admin@ragflow.io","password":"6436a2924d5e45e48d150f9c51ab0d492ef21d25365a6dc23bdc4839de46735f"}
EOF
echo "--- via WSL localhost ---"
curl -s --max-time 8 -X POST http://127.0.0.1:9380/api/v1/auth/login -H 'Content-Type: application/json' --data-binary @/tmp/login.json | head -c 300
echo
echo "--- response headers ---"
curl -s -D - -o /dev/null --max-time 8 -X POST http://127.0.0.1:9380/api/v1/auth/login -H 'Content-Type: application/json' --data-binary @/tmp/login.json | head -15
