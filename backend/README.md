# RehabMotion Backend (MVP)

Backend REST API untuk PRD **RehabMotion — Panduan Fisioterapi Pasca-Stroke Berbasis AI Skeleton & Real-Time Audio Feedback**. Dibangun dengan FastAPI, SQLAlchemy 2, PostgreSQL, Alembic, JWT, dan ReportLab.

> **Batas arsitektur/privacy:** deteksi pose MediaPipe, kalkulasi sudut, state machine repetisi, serta audio feedback berjalan di browser. Backend ini tidak menyediakan endpoint unggah video/frame dan tidak menyimpan data kamera. API menerima metrik terstruktur seperti sudut ROM, fase gerakan, repetisi, dan durasi. Aplikasi ini adalah alat bantu latihan dan bukan alat diagnosis.

## Fitur yang diimplementasikan

- Autentikasi register/login berbasis JWT dan hash password Argon2; perubahan password membatalkan token lama.
- Role `patient`, `caregiver`, `clinician`, dan `admin`; registrasi publik hanya dapat membuat pasien/caregiver, sedangkan akun klinisi dan admin perlu dibuat melalui proses administrator tepercaya.
- Profil pasien dan pemberian/pencabutan akses ke caregiver atau klinisi.
- Library 3 latihan MVP: Elbow Flexion, Shoulder Abduction, dan Seated Knee Extension.
- Resep latihan oleh klinisi: sisi tubuh, target ROM, margin toleransi, durasi tahan, target repetisi, periode, dan catatan.
- Sesi latihan: mulai sesi, kirim batch pengukuran ROM, akhiri sesi, dan simpan ringkasan.
- Analitik ringkasan dan tren ROM berdasarkan hari atau latihan.
- Ekspor riwayat latihan ke PDF.
- Pembatasan akses data pasien, validasi input, Docker Compose, migrasi Alembic, serta pengujian API dasar.

## Menjalankan dengan Docker (direkomendasikan)

1. Salin `.env.example` menjadi `.env`.
2. Ganti `JWT_SECRET_KEY` menjadi secret acak yang panjang sebelum penggunaan selain lokal.
3. Jalankan:

   ```bash
   docker compose up --build -d
   ```

Docker akan menjalankan PostgreSQL, migrasi tabel, seed library latihan, dan server API. Periksa:

- Health: `http://localhost:8000/healthz`
- Database readiness: `http://localhost:8000/readyz`
- Swagger UI: `http://localhost:8000/api/v1/docs`
- OpenAPI JSON: `http://localhost:8000/api/v1/openapi.json`

Untuk berhenti: `docker compose down`. Data database tersimpan di volume `rehabmotion_postgres`; gunakan `docker compose down -v` hanya jika memang ingin menghapus volume/data lokal.

## Menjalankan tanpa Docker

Persyaratan: Python 3.12+ dan PostgreSQL (atau SQLite untuk eksperimen lokal).

```bash
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Linux/macOS:
# source .venv/bin/activate
pip install -r requirements.txt
```

Atur `.env`, kemudian jalankan migrasi, seed, dan API:

```bash
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

Jika tidak menetapkan `DATABASE_URL`, aplikasi menggunakan SQLite lokal `rehabmotion.db`. Untuk PostgreSQL gunakan URL `postgresql+psycopg://USER:PASSWORD@HOST:5432/DB_NAME`.

## Membuat akun admin

Role admin tidak tersedia saat registrasi umum. Atur environment variables dan jalankan perintah ini setelah database siap:

```bash
# Linux/macOS example
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="password-admin-yang-panjang"
export ADMIN_FULL_NAME="RehabMotion Admin"
python -m app.create_admin
```

PowerShell:

```powershell
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PASSWORD="password-admin-yang-panjang"
$env:ADMIN_FULL_NAME="RehabMotion Admin"
python -m app.create_admin
```

Jika API dijalankan melalui Docker Compose, admin pertama dapat dibuat dari container API:

```bash
docker compose exec -e ADMIN_EMAIL="admin@example.com" -e ADMIN_PASSWORD="password-admin-yang-panjang" -e ADMIN_FULL_NAME="RehabMotion Admin" api python -m app.create_admin
```

## Autentikasi

Register/login mengembalikan `access_token`. Sertakan token tersebut pada request privat:

```http
Authorization: Bearer <access_token>
```

Contoh membuat akun pasien:

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "pasien@example.com",
  "full_name": "Pasien Demo",
  "password": "Password-yang-panjang-123!",
  "role": "patient"
}
```

Role registrasi publik yang diperbolehkan: `patient` dan `caregiver`. Akun klinisi dibuat oleh admin melalui `POST /api/v1/admin/users` setelah proses verifikasi institusi di luar aplikasi. Caregiver/klinisi baru hanya dapat melihat pasien setelah pasien memberikan akses ke alamat email akun tersebut. Untuk penggunaan awal, buat admin pertama melalui perintah CLI di bawah.

## Endpoint utama

Semua endpoint bisnis memakai prefix `/api/v1`.

| Method | Path | Tujuan |
|---|---|---|
| POST | `/auth/register` | Registrasi pasien/caregiver |
| POST | `/auth/login` | Login dan terbitkan JWT |
| GET | `/auth/me` | Profil akun yang sedang login |
| PATCH | `/users/me` | Ubah nama akun sendiri |
| POST | `/users/me/password` | Ubah password dan batalkan token lama |
| GET | `/admin/users` | Admin melihat daftar akun |
| POST | `/admin/users` | Admin membuat akun caregiver/klinisi |
| PATCH | `/admin/users/{user_id}/active` | Admin mengaktifkan/menonaktifkan akun |
| GET | `/exercises` | Daftar latihan MVP |
| GET/PATCH | `/patients/me/profile` | Baca/perbarui profil dan sisi tubuh pasien |
| GET | `/patients` | Daftar pasien yang dapat diakses akun aktif |
| POST | `/patients/{patient_id}/access` | Pasien memberi akses ke caregiver/clinician melalui email |
| GET/DELETE | `/patients/{patient_id}/access...` | Lihat atau cabut akses pasien |
| POST | `/patients/{patient_id}/prescriptions` | Klinisi membuat resep latihan |
| GET | `/patients/{patient_id}/prescriptions` | Daftar resep pasien |
| PATCH | `/prescriptions/{prescription_id}` | Klinisi pembuat memperbarui resep |
| POST | `/sessions` | Memulai sesi latihan |
| POST | `/sessions/{session_id}/rom-measurements` | Mengirim batch metrik sudut ROM (1–500 item/request) |
| GET | `/sessions/{session_id}/rom-measurements` | Membaca seri metrik ROM suatu sesi |
| POST | `/sessions/{session_id}/finish` | Menyimpan ringkasan dan menutup sesi |
| GET | `/patients/{patient_id}/sessions` | Riwayat sesi pasien |
| GET | `/patients/{patient_id}/analytics/summary?days=30` | Ringkasan sesi, repetisi, durasi, kepatuhan, dan ROM |
| GET | `/patients/{patient_id}/analytics/rom-trend` | Tren ROM harian, opsional filter tanggal/latihan |
| GET | `/patients/{patient_id}/reports/sessions.pdf` | Unduh laporan PDF, opsional filter tanggal |

Detail skema request/response, contoh interaktif, dan daftar kode status tersedia di Swagger UI.

## Alur integrasi frontend React

1. Register/login lalu simpan access token dengan mekanisme yang sesuai dengan threat model frontend.
2. Ambil library melalui `GET /api/v1/exercises`.
3. Jalankan kamera, MediaPipe, kalkulasi sudut, validasi postur, penghitung repetisi, dan audio sepenuhnya di browser.
4. Saat pengguna menekan mulai, kirim `POST /api/v1/sessions` dengan `exercise_id`, `affected_side`, dan `prescription_id` jika ada. Untuk akun caregiver, sertakan juga `patient_id`; pasien dapat menghilangkan `patient_id` untuk menggunakan ID sendiri. Untuk akun caregiver, sertakan juga `patient_id`; pasien dapat menghilangkan `patient_id` untuk menggunakan ID sendiri.
5. Kirim pengukuran ROM terpilih sebagai batch ke `POST /api/v1/sessions/{id}/rom-measurements`. Jangan kirim image/frame; hindari mengunggah setiap frame 25–30 FPS tanpa sampling karena akan menghasilkan data berlebihan.
6. Saat selesai atau pengguna menekan tombol darurat, panggil `POST /api/v1/sessions/{id}/finish` dengan `status` `completed` atau `stopped`, jumlah repetisi, ringkasan ROM, dan `stop_reason` yang sesuai.
7. Tampilkan analitik dengan endpoint `/analytics/...` dan unduh PDF dari endpoint laporan.

Contoh payload mulai sesi:

```json
{
  "exercise_id": 1,
  "prescription_id": null,
  "affected_side": "left",
  "notes": null
}
```

Contoh batch ROM:

```json
{
  "measurements": [
    {
      "angle_deg": 92.5,
      "affected_side": "left",
      "phase": "peak_check",
      "target_reached": true
    },
    {
      "angle_deg": 75.2,
      "affected_side": "left",
      "phase": "return",
      "target_reached": false
    }
  ]
}
```

Contoh mengakhiri sesi:

```json
{
  "status": "completed",
  "total_repetitions": 8,
  "successful_repetitions": 7,
  "average_peak_rom_deg": 88.5,
  "maximum_peak_rom_deg": 94.0,
  "stop_reason": null,
  "notes": null
}
```

## Model akses data

- Pasien dapat melihat dan mengelola data miliknya sendiri.
- Caregiver/clinician hanya dapat mengakses data pasien yang telah memberikan akses melalui endpoint akses. Caregiver dapat membantu mencatat sesi; klinisi memiliki akses baca untuk sesi.
- Hanya role clinician/admin dapat membuat resep; klinisi hanya dapat mengubah resep yang dibuatnya.
- Objek `landmarks` pada library berisi indeks MediaPipe terpisah untuk `left` dan `right`, misalnya `{"left": [11, 13, 15], "right": [12, 14, 16]}` untuk fleksi siku.
- Pemberian akses kepada pihak lain membutuhkan akun terdaftar dengan role yang sesuai.
- Admin dapat mengakses data pasien untuk kebutuhan pengelolaan sistem.

## Menjalankan pengujian

```bash
pytest
```

Tes menggunakan SQLite sementara dan tidak mengubah database development. Tes meliputi seed library, pembuatan sesi, batch ROM, penyelesaian sesi, analitik, dan kontrol akses dasar.

## Catatan production yang masih perlu disiapkan

Ini merupakan backend MVP yang dapat dijalankan, bukan sertifikasi kepatuhan medis/HIPAA/GDPR. Sebelum produksi, siapkan HTTPS, secret management, backup dan retensi data, audit trail, rate limiting, monitoring, kebijakan persetujuan pasien, review keamanan, pengujian beban, serta validasi klinis untuk target dan interpretasi ROM. Backend memvalidasi nilai dan akses, tetapi tidak bisa memvalidasi apakah pengukuran sudut dari browser benar secara klinis.
