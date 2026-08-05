# 🚀 CI/CD & Deployment Guide — MERN Todo App

Poora **free** (₹0) deployment setup — **GitHub Actions + Docker Hub + AWS EC2 Free Tier + MongoDB Atlas**.
Ye document batata hai: kya-kya use hua, kyun, kaise flow chalta hai, aur step-by-step setup.

---

## 📌 1. Ye kya hai? (One line)

Jab tum `main` branch pe code **push** karte ho → GitHub apne aap code **check** karta hai (CI),
phir Docker **image banata hai**, Docker Hub pe **push** karta hai, aur tumhare AWS server pe
**deploy** kar deta hai (CD). Sab automatic, sab free.

---

## 🧱 2. Architecture (kya-kya chal raha hai)

```mermaid
flowchart TB
    subgraph DEV["👨‍💻 Tum (Developer)"]
        A[Code likha] -->|git push main| GH
    end

    subgraph GH["☁️ GitHub Actions (CI/CD)"]
        CI["CI: lint + build\n(ci.yml)"] --> CD["CD: docker build + push\n(cd.yml)"]
    end

    subgraph HUB["🐳 Docker Hub (free)"]
        IMG1[todo-server:latest]
        IMG2[todo-client:latest]
    end

    subgraph AWS["🟠 AWS EC2 t2.micro (Free Tier)"]
        direction TB
        NG["client (nginx :80)"] -->|/api , /socket.io| SRV["server (Node :5000)"]
        SRV --> RD["redis (container)"]
    end

    ATLAS[("🍃 MongoDB Atlas\nM0 free cluster")]

    CD -->|push images| HUB
    CD -->|SSH: pull + up -d| AWS
    HUB -.->|docker pull| AWS
    SRV -->|MONGO_URI| ATLAS
    USER["🌍 Browser"] -->|http://EC2_IP| NG
```

**Kaun kya karta hai:**

| Component | Role | Cost |
|-----------|------|------|
| **GitHub Actions** | CI/CD engine — lint, build, image banana, deploy | Free (public repo) |
| **Docker** | App ko container mein pack karna (server + client) | Free |
| **Docker Hub** | Bane hue images store karna | Free (public images) |
| **AWS EC2 t2.micro** | App chalane wala server (1 vCPU, 1 GB RAM) | **Free 12 months** |
| **MongoDB Atlas M0** | Database (512 MB) | **Free hamesha** |
| **Redis (container)** | Cache + queues (BullMQ) — EC2 pe hi | Free |
| **nginx** | Frontend serve + `/api` & `/socket.io` proxy | Free |

> 💡 **Mongo EC2 pe kyun nahi?** t2.micro mein sirf 1 GB RAM hai. Mongo + Redis + Node + nginx
> sab ek saath thoosne se crash hoga. Isliye DB ko Atlas (free) pe rakha — EC2 halka rehta hai.

---

## 🔄 3. CI/CD Flow (push se live tak)

```mermaid
sequenceDiagram
    participant Dev as 👨‍💻 Developer
    participant GH as GitHub Actions
    participant Hub as Docker Hub
    participant EC2 as AWS EC2

    Dev->>GH: git push origin main
    Note over GH: CI workflow (ci.yml)
    GH->>GH: server → npm ci + lint
    GH->>GH: client → npm ci + lint + build
    alt CI fail
        GH-->>Dev: ❌ email + red cross (deploy ROK diya)
    else CI pass
        Note over GH: CD workflow (cd.yml) start
        GH->>Hub: docker build + push (server + client)
        GH->>EC2: SSH → docker compose pull + up -d
        EC2->>Hub: docker pull latest images
        EC2-->>Dev: ✅ App live on http://EC2_IP
    end
```

**Rule:** CD tabhi chalega jab **CI pass** hoga. Kharab code kabhi live nahi jayega.

---

## 📁 4. Kaunsi file kya karti hai

| File | Kaam |
|------|------|
| [.github/workflows/ci.yml](.github/workflows/ci.yml) | **CI** — server lint, client lint + build (har push/PR pe) |
| [.github/workflows/cd.yml](.github/workflows/cd.yml) | **CD** — image build+push (Docker Hub) + EC2 pe deploy |
| [server/Dockerfile](server/Dockerfile) | Backend ko Node image mein pack karta hai |
| [client/Dockerfile](client/Dockerfile) | Frontend build (Vite) + nginx image (multi-stage) |
| [client/nginx.conf](client/nginx.conf) | SPA serve + `/api` aur `/socket.io` ko backend pe proxy |
| [docker-compose.yml](docker-compose.yml) | **Local** dev stack (mongo + redis + server + client) |
| [docker-compose.prod.yml](docker-compose.prod.yml) | **Production** stack — Docker Hub se pulled images |
| [client/.npmrc](client/.npmrc) | `legacy-peer-deps` — React 19 vs Redux Toolkit peer fix |

---

## ⚙️ 5. Ek baar ka Setup (step-by-step)

### Step 1 — Docker Hub account + token
1. https://hub.docker.com pe free account banao (username yaad rakho).
2. **Account Settings → Personal access tokens → Generate new token**
   → Permissions: **Read & Write** → token **copy** karo (dubara nahi dikhega).

### Step 2 — MongoDB Atlas (free DB)
1. https://www.mongodb.com/cloud/atlas pe account → **Build a Database → M0 (FREE)**.
2. **Database Access** → ek user banao (username + password).
3. **Network Access** → Add IP → `0.0.0.0/0` (demo ke liye; production mein sirf EC2 IP daalna).
4. **Connect → Drivers** → connection string copy karo:
   `mongodb+srv://<user>:<pass>@cluster0.xxxx.mongodb.net/Todo`

### Step 3 — AWS EC2 launch (Free Tier)
1. AWS Console → **EC2 → Launch instance**.
2. **AMI:** Ubuntu Server 22.04 LTS — ✅ *Free tier eligible*.
3. **Instance type:** `t2.micro` (ya `t3.micro`) — ✅ *Free tier eligible*. **Sirf yahi choose karna.**
4. **Key pair:** naya banao (`.pem` file download karo — SSH ke liye chahiye).
5. **Storage:** 8–30 GB gp3 (30 GB tak free).
6. **Security group** (firewall) — inbound rules:
   | Type | Port | Source |
   |------|------|--------|
   | SSH | 22 | My IP |
   | HTTP | 80 | Anywhere (0.0.0.0/0) |
7. **Launch.** Public IPv4 address note kar lo → ye tumhara `EC2_HOST`.

### Step 4 — EC2 pe Docker install karo
SSH se connect: `ssh -i your-key.pem ubuntu@<EC2_IP>` — phir:
```bash
# Docker + compose plugin install
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin git
sudo usermod -aG docker ubuntu          # sudo ke bina docker chalane ke liye
newgrp docker                            # ya SSH se dobara login

# Repo clone karo
git clone https://github.com/Sahibealam2003/mern-demo.git ~/mern-demo
cd ~/mern-demo
```

### Step 5 — EC2 pe `.env` file banao
`~/mern-demo/.env` banao (ye file kabhi git mein commit mat karna):
```env
# Docker Hub (compose image names ke liye)
DOCKERHUB_USERNAME=tumhara_dockerhub_user

# Database
MONGO_URI=mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/Todo

# Auth / secrets (apne actual values daalo)
JWT_SECRET=koi_lamba_random_string
REFRESH_TOKEN_SECRET=doosra_random_string

# Frontend origin (CORS) — apna EC2 IP
CLIENT_URL=http://<EC2_PUBLIC_IP>

# Baaki jo server chahta hai: EMAIL_*, CLOUDINARY_*, FIREBASE_* ...
```
> `server/index.js` jo bhi env vars maangta hai, wo sab yahaan hone chahiye.

### Step 6 — GitHub Secrets add karo
GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**.
Ye 5 secrets banao:

| Secret name | Value |
|-------------|-------|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Step 1 wala access token |
| `EC2_HOST` | EC2 public IP |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | `.pem` file ka **poora content** (paste) |

### Step 7 — Pehli baar chalao 🎉
```bash
git add .
git commit -m "ci/cd: docker + github actions + aws deploy"
git push origin main
```
GitHub → **Actions** tab → CI green → CD green → browser mein **`http://<EC2_IP>`** kholo. Live! 🚀

Ab har `git push origin main` → apne aap deploy ho jayega.

---

## 💸 6. ₹0 rakhne ke rules (ZAROORI padho)

```mermaid
flowchart LR
    A[Free rehne ke liye] --> B[✅ Sirf t2.micro / t3.micro]
    A --> C[✅ Sirf 1 instance]
    A --> D[✅ Storage ≤ 30 GB]
    A --> E[⚠️ Elastic IP: ya attach rakho ya release]
    A --> F[🔔 Zero-spend Budget banao]
    A --> G[🗓️ 12 mahine baad instance band]
```

1. **Instance type:** hamesha `t2.micro`/`t3.micro`. Galti se bada select kiya to paisa lagega.
2. **1 hi instance** chalao (750 free hours/month = 1 machine 24×7).
3. **Elastic IP:** agar allocate kiya par kisi instance se attach nahi → AWS charge karta hai.
   Ya to attach rakho, ya **release** kar do.
4. **Billing alarm:** AWS Console → **Billing → Budgets → Create budget → Zero spend budget**.
   1 paisa bhi kharch ho to email aa jayegi.
5. **12 mahine** baad EC2 free tier khatam — tab instance **stop/terminate** kar dena.
6. Data transfer 100 GB/month tak free — demo ke liye kaafi.

---

## 🖥️ 7. Local development (Docker se)

Poora stack local pe chalane ke liye (mongo + redis + server + client):
```bash
docker compose up --build
# client → http://localhost:8080
# server → http://localhost:5000
```
Ya bina docker (fast dev):
```bash
cd server && npm install && npm run dev     # :5000
cd client && npm install && npm run dev     # :5173 (Vite)
```

---

## 🔧 8. Troubleshooting

| Problem | Wajah / Fix |
|---------|-------------|
| CD chala hi nahi | CI fail hua hoga — pehle CI green karo. Ya `main` branch pe push nahi kiya. |
| `docker login` fail (Actions) | `DOCKERHUB_TOKEN` galat/expired — naya token banao. |
| SSH deploy fail | `EC2_SSH_KEY` (poora `.pem` content), `EC2_HOST`, security-group port 22 check karo. |
| Site khulti nahi (`http://EC2_IP`) | Security group mein **port 80** open hai? `docker ps` se containers chal rahe? |
| API 500 / DB error | `.env` mein `MONGO_URI` sahi? Atlas **Network Access** mein IP allow kiya? |
| Socket connect nahi hota | nginx `/socket.io/` proxy (already set hai) + container up? |
| Client build ERESOLVE | `client/.npmrc` (`legacy-peer-deps`) missing — ab fix hai. |
| EC2 slow / OOM | 1 GB RAM full. Mongo Atlas use karo (EC2 pe mongo mat chalao) + `docker system prune`. |

---

## 🗺️ 9. Quick Reference — poora flow ek nazar mein

```mermaid
flowchart LR
    subgraph Once["🔧 Ek baar setup"]
        S1[Docker Hub token] --> S2[Atlas free DB]
        S2 --> S3[EC2 t2.micro + Docker]
        S3 --> S4[EC2 .env + repo clone]
        S4 --> S5[GitHub 5 secrets]
    end
    subgraph Loop["🔁 Har baar (automatic)"]
        P1[git push main] --> P2[CI: lint+build]
        P2 --> P3[CD: image push]
        P3 --> P4[EC2 deploy]
        P4 --> P5[🌍 Live]
    end
    S5 --> P1
```

---

### ✅ Summary
- **CI** = code sahi hai? (lint + build)
- **CD** = image banao → Docker Hub → EC2 pe deploy
- **AWS EC2 (free) + Atlas (free) + Docker Hub (free)** = total **₹0**
- Sab kuch **GitHub Actions** se automatic — Jenkins ki zaroorat nahi.
