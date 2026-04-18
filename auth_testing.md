# Auth Testing Playbook

## MongoDB Checks
```
mongosh
use agro_mlm_db
db.users.findOne({role: "admin"}, {password_hash: 1})
db.users.getIndexes()
```
Expect: bcrypt hash starting with `$2b$`, unique index on `users.email`, TTL index on `password_reset_tokens.expires_at`, index on `login_attempts.identifier`.

## API Checks
```
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@agromlm.com","password":"Admin@12345"}'

curl -b cookies.txt http://localhost:8001/api/auth/me
```

Admin credentials: `admin@agromlm.com` / `Admin@12345`
