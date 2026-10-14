# RehabMotion

> **Panduan Fisioterapi Pasca-Stroke Berbasis AI Skeleton & Real-Time Audio Feedback**

RehabMotion adalah platform telerehabilitasi berbasis web yang dirancang khusus untuk memandu pasien pasca-stroke dalam menjalani latihan fisioterapi mandiri di rumah dengan aman, terukur, dan terarah.

---

## 🏛️ Arsitektur & Prinsip Desain

- **Edge-First Computer Vision**: Pelacakan kerangka tubuh (*pose tracking*) menggunakan MediaPipe BlazePose dan kalkulasi sudut *Range of Motion* (ROM) dieksekusi **100% di browser pengguna**. Tidak ada rekaman kamera atau frame video mentah yang diunggah ke server demi privasi pasien (*privacy-by-design*).
- **Real-Time Audio Coaching**: Memberikan feedback suara interaktif (misalnya pengingat saat kompensasi bahu terdeteksi atau motivasi ketika target sudut tercapai) langsung saat sesi latihan berjalan.
- **Micro-Structured Metrics**: Backend hanya menerima data metrik terstruktur (sudut ROM, fase gerakan, capaian repetisi, durasi latihan, dan catatan klinis).
- **Role-Based Collaboration**: Menghubungkan 3 peran pengguna utama:
  - **Pasien**: Menjalankan sesi latihan dengan panduan HUD & audio coach, memantau kemajuan ROM mandiri.
  - **Caregiver**: Membantu pendampingan latihan, setup kamera, dan pemantauan kepatuhan harian.
  - **Klinisi / Fisioterapis**: Memberikan resep latihan terukur (target sudut ROM, repetisi, frekuensi), memantau tren perkembangan, dan mengekspor laporan kemajuan pasien.

---

## 📂 Struktur Monorepo

```text
RehabMotion/
├── backend/                  # FastAPI REST API, SQLAlchemy 2, Alembic
│   ├── app/
│   │   ├── routers/          # Endpoint API v1 (auth, users, patients, sessions, dll)
│   │   ├── models.py         # SQLAlchemy ORM models
│   │   ├── schemas.py        # Pydantic v2 validation contracts
│   │   └── security.py       # Argon2 hashing & JWT authorization
│   ├── tests/                # Automated pytest suite
│   ├── alembic/              # Database migration scripts
│   └── requirements.txt
├── frontend/                 # React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui
│   ├── src/
│   │   ├── features/         # Modular business features (session-player, patient, analytics, dll)
│   │   ├── pages/            # Page routing (landing, dashboards, session setup/play)
│   │   ├── components/       # Reusable UI components & design system tokens
│   │   └── types/            # TypeScript schema types & contracts
│   └── package.json
└── README.md
```

---

## 🚀 Panduan Memulai Cepat (Quick Start)

### 1. Backend Setup (FastAPI + Python 3.12+)

```bash
cd backend

# Buat dan aktifkan virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\Activate.ps1
# Linux/macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Siapkan environment variables
copy .env.example .env

# Jalankan migrasi dan seed data awal
alembic upgrade head
python -m app.seed

# Jalankan server API (default port 8000)
uvicorn app.main:app --reload
```

Dokumentasi OpenAPI / Swagger UI backend dapat diakses di: `http://localhost:8000/api/v1/docs`

### 2. Frontend Setup (React + Vite + TypeScript)

```bash
cd frontend

# Install package dependencies
npm install

# Jalankan development server (default port 5173)
npm run dev
```

Aplikasi frontend dapat diakses melalui browser di: `http://localhost:5173`

---

## 🧪 Menjalankan Testing

- **Backend Tests**:
  ```bash
  cd backend
  pytest tests/
  ```
- **Frontend Typecheck & Build**:
  ```bash
  cd frontend
  npm run build
  ```

---

## ⚠️ Batasan Klinis & Disclaimer

RehabMotion dikembangkan sebagai **alat bantu latihan dan pemantauan rehabilitasi**, bukan sebagai perangkat medis diagnosis mandiri. Penentuan sudut target dan protokol latihan wajib dikonsultasikan serta diresepkan oleh fisioterapis atau dokter rehabilitasi medis yang berwenang.
