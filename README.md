# BeltimHub

Platform komunitas digital untuk warga Belitung Timur. Menggabungkan berita lokal, forum jual beli, direktori UMKM, lowongan kerja, dan event dalam satu aplikasi.

---

## Fitur

### Untuk Pengguna Umum
| Fitur | Deskripsi |
|---|---|
| **Berita** | Agregasi berita terkini seputar Beltim dari Google News & Tribun Bangka, dengan paginasi |
| **FJB (Forum Jual Beli)** | Pasang & cari iklan jual beli barang lokal, lengkap dengan filter kategori |
| **UMKM** | Direktori usaha lokal Belitung Timur, bisa ditemukan via pencarian & kategori |
| **Loker** | Lowongan kerja lokal (Full-time, Part-time, Freelance, Magang) |
| **Event & Tiket** | Temukan event lokal, beli tiket, dan dapatkan tiket digital dengan QR code |

### Untuk Pengguna Terdaftar
| Fitur | Deskripsi |
|---|---|
| **Dashboard** | Halaman pribadi dengan profil, overview konten yang diposting |
| **Kelola Konten** | Edit/hapus iklan FJB, UMKM, dan lowongan yang pernah diposting |
| **Tiket Digital** | Lihat, unduh (PNG), dan tunjukkan tiket dengan QR code |
| **Verifikasi Akun** | Ajukan verifikasi identitas (KTP + selfie) untuk mendapat badge centang biru |

### Untuk Organizer Event
| Fitur | Deskripsi |
|---|---|
| **Buat Event** | Form lengkap dengan rich text editor, custom fields, dan paket tiket |
| **Dashboard Organizer** | Kelola event, lihat daftar peserta, kirim ulang tiket |
| **Scan Check-in** | Scanner QR code langsung dari browser untuk validasi tiket di lokasi |

### Panel Admin (`/admin`)
| Fitur | Deskripsi |
|---|---|
| **Overview** | Statistik pengguna: total, terverifikasi, permohonan pending |
| **Verifikasi User** | Review foto KTP + selfie, setujui atau tolak permohonan |
| **Manajemen User** | Lihat semua pengguna, cari by nama/email |
| **Manajemen Admin** | Kelola admin & moderator, undang moderator baru via WhatsApp |

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| **Framework** | Next.js 16 (App Router) + TypeScript |
| **Styling** | Tailwind CSS v4 + shadcn/ui (base-ui) |
| **Auth** | Clerk v7 |
| **Database** | PostgreSQL (Supabase) via Prisma v7 + `@prisma/adapter-pg` |
| **Storage** | Supabase Storage (foto verifikasi identitas) |
| **Payment** | Xendit (invoice + webhook) |
| **WhatsApp** | Fonnte API |
| **Rich Text** | Tiptap v3 |
| **Validasi** | Zod v4 + React Hook Form |

---

## Struktur Direktori

```
src/
├── app/
│   ├── (auth)/              # Halaman sign-in / sign-up (Clerk)
│   ├── (home)/              # Landing page
│   ├── (main)/              # Halaman publik dengan Navbar + Footer
│   │   ├── berita/          # Agregasi berita
│   │   ├── fjb/             # Forum Jual Beli
│   │   ├── umkm/            # Direktori UMKM
│   │   ├── loker/           # Lowongan Kerja
│   │   ├── event/           # Event & Ticketing
│   │   └── tiket/           # Halaman tiket pengguna
│   ├── admin/               # Panel admin (ADMIN & MODERATOR only)
│   │   ├── verifikasi/      # Review permohonan verifikasi
│   │   ├── users/           # Daftar semua pengguna
│   │   └── admins/          # Kelola admin & kirim undangan
│   ├── dashboard/           # Dashboard pengguna biasa
│   │   ├── organizer/       # Dashboard organizer event
│   │   ├── saya/            # Konten yang diposting
│   │   └── verifikasi/      # Form ajukan verifikasi
│   ├── invite/[token]/      # Handler link undangan moderator
│   └── api/                 # API Routes
│       ├── admin/           # Admin endpoints (protected)
│       ├── webhook/         # Clerk & Xendit webhooks
│       └── ...
├── components/
│   ├── layout/              # Navbar, Footer, PageHeader
│   ├── ui/                  # shadcn/ui components
│   ├── RichTextEditor.tsx   # Tiptap editor
│   ├── CustomFieldBuilder.tsx
│   ├── VerifiedBadge.tsx
│   └── EventForm.tsx
└── lib/
    ├── prisma.ts            # Prisma client dengan driver adapter
    ├── xendit.ts            # Xendit payment
    ├── whatsapp.ts          # Fonnte WhatsApp API
    ├── supabase-storage.ts  # Supabase Storage (signed URLs)
    ├── ticket-service.ts    # Logic pembuatan tiket
    ├── news-crawler.ts      # RSS crawler berita
    └── get-or-create-user.ts
```

---

## Setup & Instalasi

### 1. Clone & Install

```bash
git clone https://github.com/USERNAME/beltimhub.git
cd beltimhub
npm install
```

### 2. Environment Variables

Salin `.env.example` menjadi `.env` lalu isi semua nilai:

```bash
cp .env.example .env
```

| Variable | Keterangan |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string dari Supabase |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key Supabase (untuk upload storage) |
| `XENDIT_SECRET_KEY` | Xendit secret key |
| `FONNTE_API_KEY` | API key Fonnte (WhatsApp) |
| `NEXT_PUBLIC_APP_URL` | URL aplikasi (misal: `https://beltim.id`) |
| `PLATFORM_FEE_PERCENT` | Persentase biaya platform untuk tiket (default: `5`) |

### 3. Setup Database

```bash
npx prisma db push    # sync schema ke database
npx prisma generate   # generate Prisma client
```

### 4. Setup Supabase Storage

1. Buka Supabase → **Storage** → **New bucket**
2. Nama bucket: `verification-docs`
3. **Jangan** centang "Public bucket" (private untuk keamanan data KTP)

### 5. Setup Clerk Webhooks

Di Clerk Dashboard → **Webhooks** → tambah endpoint:
- URL: `https://yourdomain.com/api/webhook/clerk`
- Events: `user.created`, `user.updated`

### 6. Setup Xendit Webhooks

Di Xendit Dashboard → **Settings** → **Callbacks**:
- Invoice paid URL: `https://yourdomain.com/api/webhook/xendit`

### 7. Jalankan Dev Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

---

## Menjadi Admin

Setelah mendaftar, set role akun Anda menjadi `ADMIN` langsung di database:

**Lewat Supabase Dashboard:**
1. Table Editor → tabel `users`
2. Cari baris dengan email Anda
3. Edit kolom `role` → `ADMIN`
4. Save

**Lewat Prisma Studio:**
```bash
npx prisma studio
# Buka http://localhost:5555 → tabel users → edit role
```

Setelah itu, akses panel admin di `/admin`.

---

## Role & Hak Akses

| Role | Akses |
|---|---|
| `ADMIN` | Panel admin penuh — verifikasi user, kelola semua pengguna, tambah/hapus moderator |
| `MODERATOR` | Panel admin terbatas — review verifikasi, lihat daftar user (tidak bisa kelola admin) |
| `ORGANIZER` | Buat & kelola event, scan tiket |
| `SELLER` | Pasang iklan FJB |
| `MEMBER` | Pengguna umum |

> Role ADMIN & MODERATOR diarahkan ke `/admin` saat login. Role lainnya ke `/dashboard`.

---

## Scripts

```bash
npm run dev          # dev server (Turbopack)
npm run build        # production build
npm run typecheck    # cek TypeScript tanpa build
npm run db:push      # sync schema Prisma ke DB
npm run db:generate  # regenerate Prisma client
npm run db:studio    # buka Prisma Studio (GUI database)
```

---

## Deployment

Aplikasi ini siap di-deploy ke **Vercel**. Pastikan semua environment variables sudah diisi di Vercel dashboard.

```bash
vercel deploy
```

Konfigurasi tambahan ada di [`vercel.json`](./vercel.json).

---

## Lisensi

Private — hak cipta milik pengembang.
