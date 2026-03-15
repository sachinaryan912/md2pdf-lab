<div align="center">

# 📄 md2pdf-lab

**Convert Markdown to beautiful, production-grade PDFs**

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green?logo=node.js)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5%2B-blue?logo=typescript)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://www.docker.com)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-orange?logo=githubactions)](https://github.com/features/actions)

> A full-stack Markdown → PDF platform with CLI tool, REST API, Docker support, Google Cloud Run deployment, and a fun terminal game — all in TypeScript.

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎨 **3 Themes** | `light`, `dark`, `github` |
| 📐 **Page Sizes** | A4, Letter, Legal |
| 📋 **Table of Contents** | Auto-generated from headings |
| 🔢 **Math Rendering** | MathJax (inline & display) |
| 🔀 **Mermaid Diagrams** | Flowcharts, sequences, class diagrams |
| 🎨 **Syntax Highlighting** | 100+ languages via Highlight.js |
| 👁️ **Watch Mode** | Auto-regenerate on file save |
| 🌐 **REST API** | Express with Zod validation |
| 🎮 **Terminal Game** | Markdown Dungeon adventure |
| 🐳 **Docker Ready** | Multi-stage Alpine image |
| 🚀 **Cloud Run Deploy** | GitHub Actions CI/CD |

---

## 📦 Installation

```bash
# Clone and install
git clone https://github.com/your-org/md2pdf-lab.git
cd md2pdf-lab
npm install

# Build TypeScript
npm run build

# Link CLI globally
npm link
```

### Prerequisites
- **Node.js 20+**
- **npm 10+**
- Puppeteer downloads Chromium automatically (`~170 MB`)

---

## 🖥️ CLI Usage

### Convert a file

```bash
# Basic conversion (auto-names output)
md2pdf convert README.md

# Custom output path
md2pdf convert notes.md output/notes.pdf

# With options
md2pdf convert report.md report.pdf \
  --theme dark \
  --page-size Letter \
  --margin 20 \
  --header-footer

# Disable optional features
md2pdf convert simple.md --no-toc --no-math --no-mermaid
```

### Watch mode (auto-regenerate)

```bash
# Watch and auto-regenerate when file changes
md2pdf watch notes.md

# Custom output path + theme
md2pdf watch notes.md --output notes.pdf --theme github
```

### Start the REST API

```bash
# Start on default port 8080
md2pdf serve

# Custom port
md2pdf serve --port 3001
```

### Play the game 🎮

```bash
md2pdf game
```

---

## 🌐 REST API

### Start the server

```bash
npm start
# or with dev hot-reload:
npm run dev
```

### Endpoints

#### `POST /convert`

Convert Markdown to PDF.

```bash
curl -X POST http://localhost:8080/convert \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "# Hello World\n\nThis is **awesome**!",
    "theme": "dark",
    "pageSize": "A4",
    "margin": 15,
    "toc": true
  }' \
  --output result.pdf
```

**Request body schema:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `markdown` | string | required | Raw Markdown content |
| `theme` | `light\|dark\|github` | `light` | PDF theme |
| `pageSize` | `A4\|Letter\|Legal` | `A4` | PDF page size |
| `margin` | number (0-50) | `15` | Margin in mm |
| `toc` | boolean | `true` | Table of contents |
| `math` | boolean | `true` | MathJax rendering |
| `mermaid` | boolean | `true` | Mermaid diagrams |
| `displayHeaderFooter` | boolean | `false` | Page header/footer |
| `filename` | string | `document` | Download filename |

#### `GET /health`

```bash
curl http://localhost:8080/health
# → { "status": "ok", "service": "md2pdf-lab", "uptime": 42, ... }
```

#### `GET /preview`

Browser-based HTML preview:

```
http://localhost:8080/preview?md=%23%20Hello&theme=dark
```

---

## 🎮 Markdown Dungeon Game

Play a 5-room terminal adventure where you fix broken Markdown puzzles!

```bash
md2pdf game
```

Rooms include:
1. 🏰 The Broken Heading
2. 🗝️ The Unordered List Trap
3. 📜 The Fenced Code Block
4. ⚔️ The Broken Link
5. 🐉 The Dragon Boss (bold text)

---

## 🐳 Docker

### Build and run locally

```bash
# Build image
docker build -t md2pdf-lab .

# Run container
docker run -p 8080:8080 md2pdf-lab

# Or use docker-compose
docker-compose up -d
```

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP server port |
| `NODE_ENV` | `production` | Environment |
| `LOG_LEVEL` | `info` | Log verbosity |
| `DEFAULT_THEME` | `light` | Default PDF theme |

---

## 🚀 Google Cloud Run Deployment

### 1. Google Cloud Setup

```bash
# Create project
gcloud projects create my-md2pdf-project
gcloud config set project my-md2pdf-project

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iam.googleapis.com

# Create Artifact Registry repo
gcloud artifacts repositories create md2pdf-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="md2pdf-lab container images"

# Create service account
gcloud iam service-accounts create md2pdf-deployer \
  --display-name="md2pdf Lab Deployer"

# Grant required roles
gcloud projects add-iam-policy-binding my-md2pdf-project \
  --member="serviceAccount:md2pdf-deployer@my-md2pdf-project.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding my-md2pdf-project \
  --member="serviceAccount:md2pdf-deployer@my-md2pdf-project.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding my-md2pdf-project \
  --member="serviceAccount:md2pdf-deployer@my-md2pdf-project.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Generate key
gcloud iam service-accounts keys create ~/md2pdf-key.json \
  --iam-account=md2pdf-deployer@my-md2pdf-project.iam.gserviceaccount.com
```

### 2. GitHub Secrets

Add these secrets to your GitHub repository (`Settings → Secrets → Actions`):

| Secret | Value |
|--------|-------|
| `GCP_PROJECT_ID` | Your GCP project ID |
| `GCP_SA_KEY` | Contents of `md2pdf-key.json` |
| `GCP_REGION` | e.g., `us-central1` |
| `ARTIFACT_REPO` | e.g., `md2pdf-repo` |
| `SERVICE_NAME` | e.g., `md2pdf-lab` |

### 3. Deploy

Push to `main` branch to trigger automatic deployment:

```bash
git push origin main
```

The pipeline will:
1. ✅ Run lint + tests
2. 🔨 Compile TypeScript
3. 🐳 Build & push Docker image
4. 🚀 Deploy to Cloud Run
5. 💨 Run smoke test on `/health`

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Type-check only
npm run typecheck
```

Tests cover:
- **Markdown Parser**: headings, lists, tables, code, math, Mermaid, TOC
- **HTML Template**: all 3 themes, MathJax/Mermaid injection, XSS prevention
- **REST API**: all endpoints, Zod validation, error cases

---

## 📐 Architecture

```
md2pdf-lab/
│
├── src/
│   ├── cli/
│   │   └── cli.ts              # Commander.js CLI (convert/watch/serve/game)
│   ├── api/
│   │   └── server.ts           # Express REST API
│   ├── converter/
│   │   ├── markdownParser.ts   # markdown-it + highlight.js + TOC/math/mermaid
│   │   ├── htmlTemplate.ts     # HTML + CSS theme generator
│   │   └── pdfGenerator.ts     # Puppeteer PDF engine
│   ├── game/
│   │   └── markdownDungeon.ts  # 5-room terminal adventure
│   ├── utils/
│   │   └── logger.ts           # Winston logger
│   └── index.ts                # Library entrypoint + server bootstrap
│
├── tests/
│   ├── markdownParser.test.ts
│   ├── htmlTemplate.test.ts
│   └── api.test.ts
│
├── examples/
│   └── sample.md               # Feature showcase document
│
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline
│
├── Dockerfile                  # Multi-stage Alpine build
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

### Conversion pipeline

```
Markdown Input
     │
     ▼
markdownParser.ts       ← markdown-it + highlight.js + anchor + toc
     │  preprocessMath() → wraps $...$ / $$...$$ for MathJax
     │  postprocessMermaid() → converts ```mermaid to <div class="mermaid">
     │
     ▼
htmlTemplate.ts         ← Injects CSS vars (theme), MathJax CDN, Mermaid CDN
     │
     ▼
pdfGenerator.ts         ← Puppeteer renders full HTML → PDF buffer
     │
     ▼
PDF Output / HTTP Response
```

---

## 🛠️ Development

```bash
# Install deps
npm install

# TypeScript watch mode
npm run build:watch

# Run dev server
npm run dev

# Lint
npm run lint
npm run lint:fix

# Format
npm run format
```

---

## 📄 License

MIT © 2026 md2pdf-lab contributors

---

<div align="center">
Built with ❤️ using Node.js, TypeScript, Puppeteer, and Express
</div>
