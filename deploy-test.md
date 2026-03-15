# 🧪 Post-Deployment Test Checklist

Replace `YOUR_CLOUD_RUN_URL` below with your actual Cloud Run URL.  
Example: `https://md2pdf-lab-abc123-uc.a.run.app`

---

## Step 1 — Get Your Cloud Run URL

```bash
gcloud run services describe md2pdf-lab \
  --region=us-central1 \
  --format="value(status.url)"
```

Set it as a variable for the tests below:

```bash
# PowerShell
$BASE = "https://YOUR_CLOUD_RUN_URL"

# Bash / WSL
export BASE="https://YOUR_CLOUD_RUN_URL"
```

---

## Step 2 — Health Check

```bash
# PowerShell
Invoke-RestMethod "$BASE/health"

# Bash
curl -s "$BASE/health" | python -m json.tool
```

✅ Expected response:
```json
{
  "status": "ok",
  "service": "md2pdf-lab",
  "uptime": 5
}
```

---

## Step 3 — Convert Markdown to PDF

```bash
# PowerShell
Invoke-RestMethod -Method POST "$BASE/convert" `
  -ContentType "application/json" `
  -Body '{"markdown":"# Hello from Cloud Run\n\nThis PDF was generated **in the cloud**!","theme":"dark"}' `
  -OutFile "cloud-output.pdf"

# Bash
curl -X POST "$BASE/convert" \
  -H "Content-Type: application/json" \
  -d '{"markdown":"# Hello from Cloud Run\n\nThis PDF was generated **in the cloud**!","theme":"dark"}' \
  --output cloud-output.pdf
```

✅ Expected: `cloud-output.pdf` created (~30–60 KB)

---

## Step 4 — Test All Themes

```bash
# Bash (loop over all themes)
for THEME in light dark github; do
  curl -s -X POST "$BASE/convert" \
    -H "Content-Type: application/json" \
    -d "{\"markdown\":\"# Theme: $THEME\n\nTesting the **$THEME** theme.\",\"theme\":\"$THEME\"}" \
    --output "test-${THEME}.pdf"
  echo "✅ $THEME.pdf done"
done
```

---

## Step 5 — Test Validation (should return 400)

```bash
# Empty markdown — should fail
curl -s -X POST "$BASE/convert" \
  -H "Content-Type: application/json" \
  -d '{"markdown":""}' | python -m json.tool

# Invalid theme — should fail
curl -s -X POST "$BASE/convert" \
  -H "Content-Type: application/json" \
  -d '{"markdown":"# Test","theme":"neon"}' | python -m json.tool
```

✅ Expected: `400` with `"error": "Invalid request body"`

---

## Step 6 — Browser HTML Preview

Open in your browser:

```
https://YOUR_CLOUD_RUN_URL/preview?md=%23%20Hello%20World%0A%0AThis%20is%20a%20**preview**!&theme=dark
```

✅ Expected: Styled HTML page rendered in browser

---

## Step 7 — Rate Limit Test (optional)

```bash
# Send 11 requests quickly — 11th should return 429
for i in {1..11}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/convert" \
    -H "Content-Type: application/json" \
    -d '{"markdown":"# Rate test '$i'"}')
  echo "Request $i: HTTP $STATUS"
done
```

✅ Expected: First 10 return `200`, 11th returns `429`

---

## Step 8 — Load / Performance Test (optional)

Requires [k6](https://k6.io/docs/get-started/installation/):

```bash
k6 run - <<EOF
import http from 'k6/http';
import { check } from 'k6';

export let options = { vus: 3, duration: '10s' };

export default function () {
  let res = http.post('$BASE/convert', JSON.stringify({
    markdown: '# Load Test\n\nParagraph.',
    theme: 'light',
    toc: false,
    math: false,
    mermaid: false,
  }), { headers: { 'Content-Type': 'application/json' } });
  check(res, { 'status 200': (r) => r.status === 200 });
}
EOF
```

---

## ✅ All Tests Summary

| Test | Command | Expected |
|------|---------|----------|
| Health check | `GET /health` | `200 {"status":"ok"}` |
| PDF conversion | `POST /convert` | `200` + PDF binary |
| Dark theme | `POST /convert` + `"theme":"dark"` | `200` + PDF |
| Invalid body | `POST /convert` empty markdown | `400` |
| Invalid theme | `POST /convert` bad theme | `400` |
| HTML preview | `GET /preview?md=...` | `200` HTML |
| Rate limit | 11 rapid requests | 11th → `429` |
