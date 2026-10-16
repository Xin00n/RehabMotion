# RehabMotion

> **Panduan Fisioterapi Pasca-Stroke Berbasis AI Skeleton & Real-Time Audio Feedback**

RehabMotion adalah platform telerehabilitasi berbasis web yang dirancang khusus untuk memandu pasien pasca-stroke dalam menjalani latihan fisioterapi mandiri di rumah dengan aman, terukur, dan terarah.

---

## 🌐 Live Demo & Akun Uji Coba (Untuk Juri & Panitia)

Aplikasi RehabMotion telah aktif dan dapat dicoba secara langsung tanpa instalasi lokal:
🔗 **URL Demo:** **[https://rehabmotion.fly.dev/](https://rehabmotion.fly.dev/)**

Gunakan akun demo berikut untuk menguji seluruh fitur platform:

| Peran | Email | Password | Akses & Fitur Utama |
|---|---|---|---|
| 👨‍⚕️ **Dokter / Klinisi** | `dokter@rehabmotion.id` | `password123` | **Dashboard Dokter**: Manajemen pasien, resep latihan ROM (target sudut & repetisi), grafik tren kepatuhan & kemajuan ROM, serta ekspor laporan klinis PDF. |
| 🧑‍🦽 **Pasien Pasca-Stroke** | `pasien@rehabmotion.id` | `password123` | **Dashboard Pasien & Pemain Latihan**: Pelacakan sudut sendi 33 Landmark AI (MediaPipe), panduan suara Real-Time Audio Coach, tombol & shortcut **Mode Mute** (`M`), deteksi kompensasi postur, dan ringkasan repetisi. |

### 🧭 Panduan Cepat Uji Coba untuk Juri:
1. **Uji Coba Alur Pasien (Latihan Interaktif AI)**:
   - Login menggunakan akun **`pasien@rehabmotion.id`** / `password123`.
   - Di dashboard pasien, klik **"Mulai Latihan"** pada resep aktif.
   - Pada halaman persiapan kamera, posisikan tubuh Anda di depan webcam. Anda juga dapat memilih **"Suara Aktif"** atau **"Mode Mute"**.
   - Klik **"Siap, Mulai Latihan"** untuk masuk ke layar latihan:
     - Lakukan gerakan menekuk siku atau abduksi bahu di depan kamera.
     - Perhatikan skeleton overlay, badge sudut real-time, suara chime Web Audio API saat mencapai target, dan tombol **"Tes Suara"** serta **"Mode Mute"**.
2. **Uji Coba Alur Dokter (Monitoring & Resep)**:
   - Logout lalu login kembali menggunakan akun **`dokter@rehabmotion.id`** / `password123`.
   - Buka profil pasien **Budi Santoso** untuk melihat histori sesi yang baru saja diselesaikan, grafik pemulihan ROM, dan klik **"Cetak Laporan PDF"**.

---

## 🏛️ Arsitektur & Prinsip Desain

- **Edge-First Computer Vision**: Pelacakan kerangka tubuh (*pose tracking*) menggunakan MediaPipe BlazePose dan kalkulasi sudut *Range of Motion* (ROM) dieksekusi **100% di browser pengguna**. Tidak ada rekaman kamera atau frame video mentah yang diunggah ke server demi privasi pasien (*privacy-by-design*).
- **Dual-Layer Audio Coaching**: Menggabungkan Web Audio API sintetis (chime/bel dengan 0ms latensi) dan Web Speech API suara verbal, dilengkapi dukungan **Mode Mute** satu tombol / shortcut keyboard `M`.
- **Micro-Structured Metrics**: Backend hanya menerima data metrik terstruktur (sudut ROM, fase gerakan, capaian repetisi, durasi latihan, dan catatan klinis).
- **Role-Based Collaboration**: Menghubungkan 2 peran pengguna utama:
  - **Pasien**: Menjalankan sesi latihan dengan panduan HUD & audio coach, memantau kemajuan ROM mandiri.
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

# Buat dan aktifkan virtual environment (Pastikan virtual environment aktif agar tool CLI seperti alembic & uvicorn dikenali)
python -m venv .venv
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Linux/macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Siapkan environment variables
copy .env.example .env   # Windows (atau `cp .env.example .env` di Linux/macOS)
```

> **PENTING — Konfigurasi `DATABASE_URL` di `.env`:**  
> Secara default `.env.example` mengarah ke container Docker Postgres (`postgresql+psycopg://.../@db:5432/rehabmotion`). Pilih salah satu opsi sebelum migrasi:
> - **Opsi A (Dengan Docker Postgres):**  
>   Jalankan container database terlebih dahulu:
>   ```bash
>   docker compose up -d db
>   ```
> - **Opsi B (Tanpa Docker / SQLite Dev Cepat):**  
>   Buka file `.env` lalu ubah baris `DATABASE_URL` menjadi:
>   ```env
>   DATABASE_URL=sqlite:///./rehabmotion.db
>   ```

```bash
# Jalankan migrasi tabel dan seed library latihan (pastikan venv aktif)
alembic upgrade head
python -m app.seed
```

#### Membuat Akun Admin Pertama
Role `admin` tidak dapat dibuat melalui registrasi publik. Skrip `app.create_admin` membaca konfigurasi melalui **Environment Variables** (`ADMIN_EMAIL`, `ADMIN_PASSWORD` minimal 10 karakter, dan opsional `ADMIN_FULL_NAME`):

- **Windows (PowerShell):**
  ```powershell
  $env:ADMIN_EMAIL="admin@rehabmotion.com"
  $env:ADMIN_PASSWORD="password-admin-aman-123"
  $env:ADMIN_FULL_NAME="RehabMotion Admin"
  python -m app.create_admin
  ```
- **Linux / macOS (Bash):**
  ```bash
  ADMIN_EMAIL="admin@rehabmotion.com" ADMIN_PASSWORD="password-admin-aman-123" ADMIN_FULL_NAME="RehabMotion Admin" python -m app.create_admin
  ```

```bash
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
