# LAPORAN AUDIT MENYELURUH REHABMOTION (FRONTEND + BACKEND)
**Tanggal Audit:** 14 Oktober 2026  
**Status Audit:** READ-ONLY (Tanpa modifikasi kode)  
**Tujuan:** Persiapan sebelum rilis publik ke GitHub

---

## 1. SECRET & KEAMANAN (Prioritas Tertinggi)

### 1.1 Hasil Scanning Secret di Working Tree
Dilakukan pencarian teks menyeluruh menggunakan pola regex dan kata kunci kritis (`postgresql://`, `postgres://`, `supabase.co`, `sk-`, `SECRET`, `PASSWORD`, `api_key`, `Bearer `) pada seluruh codebase (frontend, backend, docker-compose, config).

- **`postgresql://` & `postgres://`**:
  - **Status:** **BERSIH** dari string koneksi real/produksi.
  - Temuan di `backend/.env` dan `backend/.env.example` menggunakan placeholder template:
    - `backend/.env.example`: `DATABASE_URL=postgresql+psycopg://rehabmotion:rehabmotion_dev_password@db:5432/rehabmotion`
    - `backend/.env`: `DATABASE_URL=postgresql+psycopg://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
- **`supabase.co`**:
  - **Status:** **BERSIH**. Tidak ditemukan URL proyek Supabase riil atau API key Supabase.
- **`sk-` (OpenAI / Third-party API Keys)**:
  - **Status:** **BERSIH**. Hanya ada 1 kecocokan semantik di internal `package-lock.json` (`queue-microtask-1.2.3`).
- **`SECRET` & `PASSWORD`**:
  - `backend/.env`: Mengandung `JWT_SECRET_KEY=rehabmotion-super-secret-jwt-key-2026-secure`.
  - `backend/docker-compose.yml`: Mengandung default development password: `POSTGRES_PASSWORD: rehabmotion_dev_password`.
- **`Bearer `**:
  - Semua kemunculan adalah kode header HTTP standar (`Authorization: Bearer <token>`) di client frontend dan dokumentasi/testing. Tidak ada token JWT riil yang tertinggal.
- **Frontend `VITE_*` Variables**:
  - `frontend/.env` dan `frontend/.env.example` hanya berisi placeholder lokal: `VITE_API_BASE_URL=http://localhost:8000/api/v1`. Tidak ada secret atau credential riil.

### 1.2 Status Git Commit History & .env Tracking
- **Status Git Repo Root (`c:\data\coding\RehabMotion`)**:
  - **[CRITICAL] Root folder BUKAN git repository**. File `.git/` ternyata berada di dalam subfolder `frontend/` (`c:\data\coding\RehabMotion\frontend\.git`).
  - Akibatnya: Folder `backend/` dan root folder `src/` belum terlacak oleh git repository terpusat.
- **Audit Git History di `frontend/.git`**:
  - History hanya memiliki 1 commit: `40a17af feat: initial commit`.
  - Dilakukan verifikasi dengan `git log --all --full-history -- "**/.*env*" ".*env*"`: **TIDAK PERNAH ADA** file `.env` yang ter-commit ke dalam riwayat git sebelumnya.
  - File `frontend/.env` dan `backend/.env` saat ini berstatus **untracked** di disk lokal.

### 1.3 Verifikasi `.gitignore`
- **[CRITICAL] Belum ada `.gitignore` di root folder workspace**:
  - Di root `c:\data\coding\RehabMotion` tidak terdapat `.gitignore`. Jika pengguna langsung menjalankan `git init` dan `git add .` di root, seluruh file sensitif (`backend/.env`, `backend/.venv/`, `frontend/node_modules/`, database file, build output) akan berpotensi ter-commit ke publik!
- **Kondisi `.gitignore` yang ada saat ini:**
  - `backend/.gitignore`: Sudah mencakup `.env`, `.venv/`, `__pycache__/`, `*.db`, `*.sqlite3`, `.DS_Store`.
  - `frontend/.gitignore`: Sudah mencakup `node_modules`, `dist`, `logs`, `.DS_Store`. **Tetapi `frontend/.gitignore` BELUM mencakup `.env` atau `.env*.local`**.

---

## 2. KUALITAS KODE

### 2.1 Backend (Python / FastAPI / SQLAlchemy)

#### A. Hasil Linter (`ruff check app/`)
Ditemukan **6 error import & variabel tidak terpakai (F401/F841)**:
1. `app/routers/admin.py:1`: `typing.Literal` diimport tapi tidak digunakan.
2. `app/routers/admin.py:7`: `app.dependencies.get_current_user` diimport tapi tidak digunakan.
3. `app/routers/admin.py:8`: `app.models.PatientProfile` diimport tapi tidak digunakan.
4. `app/routers/analytics.py:2`: `fastapi.HTTPException` diimport tapi tidak digunakan.
5. `app/routers/reports.py:4`: `fastapi.HTTPException` diimport tapi tidak digunakan.
6. `app/routers/reports.py:4`: `fastapi.Query` diimport tapi tidak digunakan.

*Catatan Linter Tambahan:* Ditemukan peringatan gaya kode FastAPI standar seperti `Depends()` pada argumen default (`B008`) dan import blocks belum ter-sortir (`I001`).

#### B. Hasil Type Checker (`mypy app/`)
Ditemukan **12 type error aktif**:
1. `app/routers/sessions.py:111`: Incompatible types in assignment (ekspresi `ROMMeasurement`, variabel `ROMMeasurementCreate`).
2. `app/routers/reports.py:47`: `Item "None" of "User | None" has no attribute "full_name"` dan `Item "None" of "User | None" has no attribute "email"`.
3. `app/routers/patients.py:22`: `Item "None" of "PatientProfile | None" has no attribute "default_affected_side"`.
4. `app/routers/auth.py:30` & `app/routers/auth.py:41`: Argumen `user` pada instansiasi `TokenResponse` menerima tipe SQLAlchemy model `User` sedangkan Pydantic schema mengharapkan `UserOut`.
5. `app/routers/reports.py`: Library stubs belum terinstall untuk reportlab (`types-reportlab`).

#### C. Dead Code & Unused Schema Functions
- `app/schemas.py:243`: Class `ReportResponse` didefinisikan tetapi tidak digunakan di endpoint mana pun (endpoint laporan PDF menggunakan `StreamingResponse` langsung).
- Semua route endpoints lainnya terdaftar dan aktif di `app/main.py`.

---

### 2.2 Frontend (React / TypeScript / ESLint / Vite)

#### A. Struktur Kode & Komponen UI (shadcn)
- **Komponen shadcn UI yang terpasang:**
  - `src/components/ui/button.tsx` -> Digunakan aktif di seluruh halaman (`session-setup`, `progress`, `patients/[id]`, `dashboard/clinician`, dll).
  - `src/components/ui/input.tsx` -> Digunakan aktif di form registrasi, login, profil, dan resep pasien.
  - `src/components/ui/label.tsx` -> Digunakan aktif mendampingi input form.
- **Status:** **TIDAK ADA** komponen UI shadcn yang menjadi dead code atau terpasang sia-sia.

---

### 2.3 Cross-Check KONTRAK API (Backend Schema vs Frontend Schema/Client)
Ditemukan **ketidaksinkronan signifikan** antara backend FastAPI dan client frontend:

1. **[CRITICAL] Tipe Primary Key ID: Integer (Backend) vs String (Frontend)**
   - **Backend (`app/models.py`, `app/schemas.py`)**: `User.id`, `PatientProfile.user_id`, `Prescription.id`, `RehabSession.id`, `ROMMeasurement.id` menggunakan tipe **`Integer` (number)**.
   - **Frontend (`src/types/auth.ts`, `src/types/patient.ts`)**: Mendeklarasikan `id: string`, `patient_id: string`, `prescription_id: string`.
   - **Dampak:** Saat frontend mengirimkan ID berupa string UUID/mock atau mem-passing route param string tanpa konversi int ke backend, backend FastAPI akan merespons `422 Unprocessable Entity`.

2. **[CRITICAL] Endpoint Manajemen Akses Caregiver / Clinician**:
   - **Backend**: 
     - `POST /api/v1/patients/{patient_id}/access` dengan body: `{"email": "...", "access_role": "caregiver"|"clinician"}`.
     - `GET /api/v1/patients/{patient_id}/access`.
     - `DELETE /api/v1/patients/{patient_id}/access/{access_id}`.
   - **Frontend (`src/features/patient/api/patient-api.ts`)**:
     - Memanggil `GET /access?patient_id=...` (salah path, backend tidak memiliki root `/access`).
     - Memanggil `POST /access` (salah path dan salah payload: mengirim `caregiver_email` bukan `email`).
     - Memanggil `DELETE /access/{id}` (salah path, harusnya `/patients/{patient_id}/access/{access_id}`).

3. **[CRITICAL] Kontrak Mulai Sesi (`POST /sessions`)**:
   - **Backend (`SessionCreate`)**: Membutuhkan `exercise_id: int` (Wajib!), `affected_side: "left"|"right"|"both"`, dan opsional `prescription_id: int`.
   - **Frontend (`src/features/session/api/session-api.ts`)**: Hanya mengirimkan `prescription_id` dan `affected_side` tanpa menyertakan `exercise_id`. Jika resep tidak memiliki ID atau exercise ID tidak disertakan, backend akan melempar error validasi `422`.

4. **[CRITICAL] Kontrak Metrik ROM (`POST /sessions/{id}/rom-measurements`)**:
   - **Backend (`ROMMeasurementCreate`)**: Field: `angle_deg: float`, `affected_side: "left"|"right"|"both"`, `phase: str`, `target_reached: bool`.
   - **Frontend (`src/features/session/api/session-api.ts`)**: Mengirim: `timestamp_ms`, `repetition_index`, `current_angle`, `target_angle`, `is_target_reached`, `is_compensated`. Nama field dan struktur tidak cocok.

5. **[CRITICAL] Kontrak Selesai Sesi (`POST /sessions/{id}/finish`)**:
   - **Backend (`SessionFinish`)**: Field: `status: "completed"|"stopped"`, `total_repetitions: int`, `successful_repetitions: int`, `average_peak_rom_deg: float`, `maximum_peak_rom_deg: float`, opsional `stop_reason: str`, `notes: str`.
   - **Frontend (`src/features/session/api/session-api.ts`)**: Hanya mengirim `repetitions_completed`, `duration_seconds`, `notes`. Field `status`, `total_repetitions`, dan `successful_repetitions` tidak dikirim.

---

## 3. ERROR RUNTIME NYATA

### 3.1 Backend Runtime
- **Command Startup:** `uvicorn app.main:app --port 8000 --host 127.0.0.1`
  - **Hasil:** Server berhasil running tanpa sintaks error.
- **Endpoint Test:**
  - `GET /healthz` -> **200 OK** (`{"status": "ok", "service": "rehabmotion-api"}`).
  - `GET /api/v1/openapi.json` -> **200 OK** (Swagger & openapi schema ter-generate sempurna).
  - `GET /readyz` -> **500 Internal Server Error**:
    - **Pesan error asli:**
      ```text
      psycopg.OperationalError: failed to resolve host 'aws-0-[REGION].pooler.supabase.com': [Errno 11001] getaddrinfo failed
      ```
    - **Penyebab:** Konfigurasi di `backend/.env` saat ini masih menggunakan connection string placeholder `[PROJECT_REF]` dan `[REGION]`. Database Supabase belum dihubungkan.
- **Unit Test Backend (`pytest tests/`):**
  - **Hasil:** `6 passed in 1.54s` (Suite test in-memory SQLite berjalan 100% lulus).

### 3.2 Frontend Build & Runtime
- **Command Build:** `npm run build` (dijalankan di `frontend/`)
  - **Hasil:** **GAGAL / EXIT CODE 1**
  - **Pesan error asli:**
    ```text
    error TS18003: No inputs were found in config file 'C:/data/coding/RehabMotion/frontend/tsconfig.app.json'. Specified 'include' paths were '["src"]' and 'exclude' paths were '[]'.
    ```
  - **Penyebab:** 
    - File konfigurasi frontend (`package.json`, `tsconfig.json`, `vite.config.ts`, `node_modules`) berada di dalam folder `frontend/`, sedangkan seluruh source code aplikasi (`App.tsx`, `router.tsx`, `pages/`, `features/`, `components/`) berada di folder root `src/` (`c:\data\coding\RehabMotion\src`).
    - Akibatnya, `tsconfig.app.json` mencari file di `frontend/src` yang kosong/tidak ada.
- **Log Error di Vite Dev Server:**
  - **Pesan error asli:**
    ```text
    (!) Failed to run dependency scan. Skipping dependency pre-bundling. Error: The following dependencies are imported but could not be resolved:
      @/app/App (imported by C:/data/coding/RehabMotion/src/main.tsx)
      react (imported by C:/data/coding/RehabMotion/src/main.tsx)
      react-dom/client (imported by C:/data/coding/RehabMotion/src/main.tsx)
    ```
  - **Penyebab:** Inkonsistensi path antara root repository dan subfolder `frontend`.

---

## 4. KESIAPAN REPO UNTUK DI-SHARE VIA GITHUB

### 4.1 Struktur Folder Root
- **Kondisi Saat Ini:** **TERCAMPUR & ANOMALI**
  ```text
  c:\data\coding\RehabMotion/
  ├── backend/           # Direktori backend lengkap (FastAPI)
  ├── frontend/          # Konfigurasi build Vite, package.json, node_modules, .git
  ├── src/               # Kode sumber frontend (pages, features, components) di ROOT
  ├── .agents/           # Konfigurasi skills/rules
  └── .vite/             # Cache Vite
  ```
  - `src/` berada di root, terpisah dari `package.json` yang ada di dalam `frontend/`.
  - Repo git (`.git`) berada di `frontend/.git`, sehingga `backend/` dan `src/` tidak berada dalam kontrol versi Git.
- **Rekomendasi Struktur Bersih Monorepo Top-Level:**
  Pindahkan `src/` ke dalam `frontend/src/` (atau satukan config frontend ke root), serta inisialisasi satu Git repo di root project yang menaungi `frontend/` dan `backend/`.

### 4.2 Kelengkapan README.md
- **Di Root Repo:** **BELUM ADA README.md**.
- **Di `backend/README.md`**: Sangat lengkap (arsitektur, endpoint, tata cara env, docker, panduan test).
- **Di `frontend/README.md`**: Masih berupa boilerplate default Vite ("React + TypeScript + Vite + shadcn/ui").
- **Kebutuhan Root README.md**: Perlu dibuat dokumentasi utama yang menjelaskan gambaran proyek RehabMotion, arsitektur monorepo (frontend + backend), prasyarat instalasi, dan cara menjalankan keduanya.

### 4.3 Integritas Migrasi Database Alembic
- **Pemeriksaan `alembic heads`**:
  - Ditemukan tepat **1 head revision**: `baac6967b179 (head)` (`baac6967b179_initial_schema.py`).
  - **Status:** **KONSISTEN**. Tidak ada multiple heads, percabangan liar, atau konflik migrasi.
  - Perintah `alembic upgrade` sengaja tidak dieksekusi ke database target sesuai instruksi (menunggu host Supabase yang valid).

---

## 5. REKAPITULASI TEMUAN & KATEGORISASI

| ID | Kategori | Temuan | Tingkat Keparahan |
|---|---|---|---|
| SEC-01 | Keamanan | Belum ada root `.gitignore`; potensi file `.env` dan virtualenv ter-upload saat `git init` di root | **[CRITICAL]** |
| SEC-02 | Keamanan | `frontend/.gitignore` belum menyertakan pola `.env*` | **[CRITICAL]** |
| STR-01 | Struktur | Git repository terletak di `frontend/.git`, bukan di root project (backend & root src tidak terlacak) | **[CRITICAL]** |
| BLD-01 | Build & Run | `npm run build` gagal karena `tsconfig.app.json` mengarah ke `frontend/src` padahal source code ada di root `src/` | **[CRITICAL]** |
| API-01 | Kontrak API | Tipe data ID tidak seragam: Backend menggunakan `int`, Frontend menggunakan `string` (potensi error 422) | **[CRITICAL]** |
| API-02 | Kontrak API | Endpoint access list/grant/revoke di frontend (`/access`) tidak sesuai dengan rute backend (`/patients/{id}/access`) | **[CRITICAL]** |
| API-03 | Kontrak API | Payload `POST /sessions`, `POST /sessions/{id}/rom-measurements`, dan `finish` berbeda antara frontend dan backend | **[CRITICAL]** |
| ENV-01 | Runtime | Endpoint database (`/readyz`) error 500 karena koneksi Supabase di `backend/.env` masih placeholder | **[SHOULD-FIX]** |
| DOC-01 | Kesiapan Repo | Belum ada `README.md` di root repo yang merangkum keseluruhan proyek | **[SHOULD-FIX]** |
| QUA-01 | Kualitas Kode | 6 unused imports di backend router (`admin.py`, `analytics.py`, `reports.py`) | **[SHOULD-FIX]** |
| QUA-02 | Kualitas Kode | 12 type errors pada `mypy app/` backend (`sessions.py`, `reports.py`, `auth.py`, `patients.py`) | **[SHOULD-FIX]** |
| DOC-02 | Kesiapan Repo | `frontend/README.md` masih menggunakan template default Vite | **[NICE-TO-HAVE]** |
| QUA-03 | Kualitas Kode | Unused schema `ReportResponse` di `app/schemas.py` | **[NICE-TO-HAVE]** |

---
*Catatan: Sesuai instruksi audit, belum ada file kode yang diubah pada langkah ini. Laporan ini siap direview sebelum melangkah ke proses perbaikan.*
