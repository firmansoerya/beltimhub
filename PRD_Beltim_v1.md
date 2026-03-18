# Product Requirements Document — BeltimHub (beltim.id)
**Version:** 2.0
**Last Updated:** 2026-03-18
**Status:** Living Document

---

## 1. Overview

**BeltimHub** (domain: `beltim.id`) adalah platform digital terintegrasi untuk warga Kabupaten Belitung Timur. Platform ini menjadi titik temu antara informasi, ekonomi lokal, dan aktivitas komunitas.

### Masalah yang Diselesaikan
| Masalah | Solusi |
|---|---|
| Pendaftaran event masih via Google Form manual | Event Management + E-Ticket otomatis |
| Informasi berita daerah tersebar & tidak teragregasi | News aggregator otomatis via RSS crawler |
| Tidak ada marketplace khusus warga lokal | Forum Jual Beli (FJB) terintegrasi |
| UMKM sulit dikenal secara digital | Direktori UMKM terverifikasi |
| Lowongan kerja lokal susah dicari | Job Board (Loker) lokal |

### Model Bisnis
Platform berjalan semi-otomatis (self-service) dengan pendapatan dari:
- **Fee tiket**: persentase dari setiap tiket event terjual
- **Iklan premium**: slot banner di berita dan FJB (sundul iklan)
- **Fee resale tiket** (roadmap): potongan dari transaksi resale antarpeserta

---

## 2. Tech Stack (Aktual)

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 16 + TypeScript (App Router) |
| Styling | Tailwind CSS v4 + Shadcn/UI |
| Auth | Clerk v7 (Google OAuth) |
| Database | PostgreSQL via Supabase + Prisma v7 |
| Payment | Xendit (QRIS, Virtual Account) |
| Notifikasi WA | wa-gateway self-hosted (Baileys, port 3001) |
| Deploy | Vercel |
| Storage | Supabase Storage |

---

## 3. User Roles & Hierarki

```
ADMIN > MODERATOR > ORGANIZER > SELLER > MEMBER
```

| Role | Kemampuan Utama |
|---|---|
| **ADMIN** | Akses penuh: kelola semua data, approve organizer, lihat revenue |
| **MODERATOR** | Moderasi iklan FJB, berita, laporan user |
| **ORGANIZER** | Buat event, kelola tiket, scan QR check-in, lihat laporan peserta |
| **SELLER** | Posting iklan FJB, kelola UMKM |
| **MEMBER** | Beli tiket, iklan FJB, transfer tiket |

---

## 4. Fitur yang Sudah Diimplementasikan ✅

### 4.1 Autentikasi
- [x] Login via Google OAuth (Clerk v7)
- [x] Sinkronisasi user ke database lokal via webhook Clerk
- [x] Proteksi route berbasis role

### 4.2 Event & Ticketing
- [x] Pembuatan event oleh Organizer (judul, deskripsi, tanggal, kuota, harga, banner)
- [x] Kategori tiket per event (misal: Umum, VIP, Pelajar)
- [x] Pembayaran via Xendit (QRIS & VA)
- [x] Generate E-Ticket otomatis setelah pembayaran sukses
- [x] QR code unik per tiket
- [x] Dashboard peserta untuk Organizer
- [x] Scan QR check-in by Organizer
- [x] Notifikasi konfirmasi pembayaran (WhatsApp via wa-gateway)
- [x] Halaman detail tiket untuk peserta

### 4.3 Transfer Tiket (Gratis)
- [x] Pemilik tiket bisa mentransfer ke pengguna lain via email
- [x] Email tujuan harus terdaftar di BeltimHub
- [x] Penerima mendapat notifikasi dan harus konfirmasi (Terima / Tolak)
- [x] Pengirim bisa cancel transfer selama masih PENDING
- [x] Setelah diterima, tiket berpindah ke akun penerima
- [x] `IncomingTransferBanner` — notifikasi transfer masuk di halaman tiket
- [x] Model DB: `TicketTransfer` (status: PENDING → ACCEPTED / DECLINED / CANCELLED)

### 4.4 Forum Jual Beli (FJB)
- [x] Posting iklan barang (foto, harga, kategori, deskripsi)
- [x] Fitur "Sundul Iklan" berbayar
- [x] Halaman daftar dan detail iklan

### 4.5 Direktori UMKM
- [x] Pendaftaran UMKM oleh Seller
- [x] Halaman profil UMKM
- [x] Admin verifikasi UMKM

### 4.6 Job Board (Loker)
- [x] Posting lowongan kerja
- [x] Halaman daftar loker

### 4.7 News Aggregator
- [x] RSS crawler otomatis (interval 6 jam)
- [x] Atribusi ke sumber asli
- [x] Endpoint `/api/crawler` untuk trigger manual

### 4.8 Share & Sosial
- [x] Tombol share ke WhatsApp, Twitter/X, Facebook, dan copy link
- [x] ShareButton komponen reusable

### 4.9 Admin Dashboard
- [x] Manajemen user, event, iklan
- [x] Approve/reject organizer
- [x] Monitoring transaksi

---

## 5. Roadmap & Rencana Fitur

### 5.1 Resale Tiket (Prioritas Tinggi)
Transfer tiket gratis sudah berjalan. Tahap berikutnya adalah **resale berbayar** antar peserta.

**Konsep:**
- Pemilik tiket listing tiket untuk dijual dengan harga sendiri
- Organizer bisa set **batas harga maksimal** (anti-scalping), misal maks 150% harga asli
- Pembayaran dari pembeli ditahan platform (**escrow**), dicairkan ke seller setelah transfer terkonfirmasi
- Platform ambil **fee resale** (5–10%)
- QR code lama diinvalidasi, QR code baru digenerate untuk pembeli
- Halaman marketplace per event: daftar tiket yang sedang dijual

**Pertanyaan yang Perlu Dijawab Sebelum Dev:**
- Apakah organizer bisa disable fitur resale per event?
- Batas waktu resale (misal tidak bisa resale H-1 event)?
- Apakah seller bisa cancel listing setelah ada pembeli yang berminat?
- Flow pembayaran: langsung ke rekening seller atau via escrow BeltimHub dulu?

**File yang Perlu Dibuat/Dimodifikasi:**
- `prisma/schema.prisma` → tambah model `TicketListing`
- `src/app/api/tickets/listing/` → CRUD listing resale
- `src/app/api/tickets/listing/[id]/buy/` → flow beli resale + Xendit
- `src/components/ResaleTicketModal.tsx`
- `src/app/dashboard/(member)/tiket/marketplace/` → halaman marketplace

### 5.2 Login WhatsApp OTP
Saat ini hanya mendukung Google OAuth. Rencana menambah login via **WhatsApp OTP** mengingat kebiasaan warga lokal yang lebih familiar dengan WA.

- Kirim OTP via wa-gateway self-hosted
- Verifikasi OTP di server-side
- Integrasi dengan Clerk custom flow atau alternatif auth sendiri

### 5.3 Dashboard Organizer — Laporan Keuangan
- Rekap total pendapatan per event (setelah fee platform)
- Riwayat pencairan dana
- Ekspor data peserta ke CSV/Excel

### 5.4 Verifikasi Identitas Organizer (KYC)
- Upload dokumen legal (KTP, Akta, dll)
- Admin review dan approve
- Model DB `OrganizerLegalDoc` sudah ada, perlu UI lengkap

### 5.5 Sistem Rating & Review
- Peserta bisa beri rating event setelah event selesai
- Rating tampil di halaman event
- Berguna untuk kredibilitas organizer

### 5.6 Push Notification / Realtime
- Socket.IO sudah dipersiapkan
- Notifikasi realtime untuk: transfer masuk, pembayaran sukses, check-in peserta
- Progressive Web App (PWA) agar notifikasi bisa masuk ke HP warga

### 5.7 Iklan Display (Banner)
- Slot banner di halaman berita, FJB, dan homepage
- Sistem manajemen slot: per-hari, per-minggu
- Admin kelola pengiklan

---

## 6. Database Schema (Aktual)

### Tabel Utama

| Tabel | Deskripsi |
|---|---|
| `users` | Profil user, role, nomor WA |
| `events` | Master event (judul, tanggal, kuota, harga) |
| `ticket_categories` | Kategori tiket per event |
| `tickets` | Transaksi tiket, QR code, status pembayaran |
| `ticket_transfers` | Riwayat transfer tiket antar user |
| `listings_fjb` | Iklan jual beli |
| `umkm` | Direktori UMKM |
| `loker` | Lowongan kerja |
| `news` | Berita hasil crawl RSS |
| `organizer_legal_docs` | Dokumen KYC organizer |
| `organizer_bank_accounts` | Rekening pencairan organizer |

### Model TicketTransfer (Baru)
```prisma
model TicketTransfer {
  id          String         @id @default(cuid())
  ticketId    String
  fromUserId  String
  toEmail     String
  toUserId    String?
  status      TransferStatus @default(PENDING)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  acceptedAt  DateTime?
  ticket      Ticket         @relation(...)
  fromUser    User           @relation("TransfersSent", ...)
  toUser      User?          @relation("TransfersReceived", ...)
}

enum TransferStatus {
  PENDING
  ACCEPTED
  DECLINED
  CANCELLED
}
```

### Model TicketListing (Rencana)
```prisma
model TicketListing {
  id          String        @id @default(cuid())
  ticketId    String        @unique
  sellerId    String
  price       Int
  status      ListingStatus @default(ACTIVE)
  createdAt   DateTime      @default(now())
  expiredAt   DateTime?
  buyerId     String?
  paidAt      DateTime?
  platformFee Int?
  ticket      Ticket        @relation(...)
  seller      User          @relation("ListingsSold", ...)
  buyer       User?         @relation("ListingsBought", ...)
}

enum ListingStatus {
  ACTIVE
  SOLD
  CANCELLED
  EXPIRED
}
```

---

## 7. User Flow

### Peserta Event
```
Login → Browse Event → Pilih Kategori Tiket → Isi Data → Bayar (Xendit) →
Terima E-Ticket → [Opsional] Transfer / Resale Tiket
```

### Organizer
```
Daftar sebagai Organizer → Verifikasi Admin → Buat Event → Set Harga & Kuota →
Publikasi → Monitor Peserta → Scan QR di Hari H → Cair Dana
```

### Resale Tiket (Rencana)
```
Pemilik Tiket → Buat Listing (set harga) → Tampil di Marketplace Event →
Pembeli Bayar (Xendit Escrow) → Transfer Otomatis → QR Baru Digenerate →
Dana Cair ke Seller (dikurangi platform fee)
```

---

## 8. API Endpoints (Aktual)

| Method | Endpoint | Deskripsi |
|---|---|---|
| GET/POST | `/api/events` | CRUD event |
| GET/POST | `/api/tickets` | Ambil / buat tiket |
| GET | `/api/tickets/[id]` | Detail tiket |
| POST | `/api/tickets/verify-code` | Verifikasi kode tiket |
| POST | `/api/tickets/send-confirmation` | Kirim ulang konfirmasi |
| POST | `/api/tickets/transfer` | Buat transfer tiket |
| PATCH/DELETE | `/api/tickets/transfer/[transferId]` | Accept/decline/cancel transfer |
| POST | `/api/payments` | Buat transaksi Xendit |
| POST | `/api/webhook` | Terima callback Xendit |
| GET/POST | `/api/listings` | CRUD iklan FJB |
| GET/POST | `/api/umkm` | CRUD UMKM |
| GET/POST | `/api/loker` | CRUD lowongan kerja |
| GET/POST | `/api/news` | Berita |
| POST | `/api/crawler` | Trigger RSS crawler |
| POST | `/api/verification-request` | Request verifikasi organizer |

---

## 9. Constraints & Non-Functional Requirements

- **Mobile-first**: UI dioptimalkan untuk layar HP karena mayoritas pengguna akses via HP
- **Offline-tolerant**: Halaman utama harus cepat load di jaringan 3G/LTE Belitung Timur
- **Self-hosted WA**: Notifikasi WhatsApp tidak bergantung pihak ketiga berbayar (pakai wa-gateway sendiri)
- **Multi-tenant ready**: Satu platform, banyak organizer
- **Data privacy**: Nomor WA dan data pribadi tidak dijual/dishare ke pihak ketiga
