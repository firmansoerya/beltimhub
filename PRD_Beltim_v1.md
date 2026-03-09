1. Overview
Beltim Digital Hub (domain: beltim.id) adalah platform digital terintegrasi yang dirancang untuk Kabupaten Belitung Timur. Proyek ini bertujuan untuk mendigitalkan ekosistem lokal melalui tiga pilar utama: informasi (Berita), ekonomi (FJB), dan aktivitas komunitas (Event).

Masalah utama yang diselesaikan adalah tersebarnya informasi event lokal yang masih manual (Google Form), kurangnya platform jual-beli khusus warga lokal yang terorganisir, serta kebutuhan akan agregator berita daerah yang otomatis. Platform ini dirancang agar dapat berjalan secara mandiri (self-service) sehingga pemilik domain bisa mendapatkan passive income melalui biaya layanan dan iklan premium.

2. Requirements
Berikut adalah persyaratan tingkat tinggi untuk pengembangan sistem:

    - Aksesibilitas: Aplikasi berbasis Web (Mobile-first) agar mudah diakses warga saat di lapangan.

    - Pengguna: Sistem mendukung banyak pengguna (Multi-user) dengan peran: Admin, Penyelenggara Event, Penjual, dan Member.

    - Autentikasi: Mendukung login hybrid menggunakan Google OAuth dan WhatsApp OTP (mengingat kebiasaan lokal).

    - Automasi: Penarikan berita dari sumber luar harus otomatis menggunakan sistem crawler/parser.

    - Pembayaran: Terintegrasi dengan Payment Gateway nasional (Midtrans/Xendit) untuk mendukung QRIS dan VA.

3. Core Features
Fitur-fitur kunci yang akan dikembangkan:

    1. News Aggregator (Beltim Today)

        - Penarikan berita otomatis berbasis kata kunci "Belitung Timur" dari berbagai RSS/Portal Berita.

        - Atribusi otomatis ke sumber asli.

    2. Marketplace Lokal (FJB)

        - User dapat memposting barang bekas atau baru secara mandiri.

        - Fitur "Sundul Iklan" berbayar untuk menaikkan posisi iklan di urutan teratas.

    3. Event Management System (Subdomain: event.beltim.id)

        - Form pendaftaran event sport/festival yang menggantikan Google Form.

        - Penerbitan E-Ticket otomatis dengan QR Code unik setelah pembayaran sukses.

        - Dashboard khusus bagi penyelenggara untuk melihat data peserta dan scan tiket.

    4. Monetisasi Engine

        - Sistem fee otomatis per tiket terjual.

        - Manajemen slot iklan banner di portal berita dan FJB.

4. User Flow
Alur kerja bagi pengguna di platform:

    1. Login: Pengguna masuk menggunakan WhatsApp atau Google.

    2. Skenario Penjual (FJB): Penjual klik "Pasang Iklan" -> Isi form produk -> Klik "Sundul" (Opsional) -> Bayar via QRIS -> Iklan tayang.

    3. Skenario Penyelenggara (Event): Penyelenggara daftar sebagai "Organizer" -> Buat Event -> Tentukan Harga & Kuota -> Publikasi.

    Skenario Peserta (Event): Peserta pilih event -> Isi data (Ukuran Jersey, dsb) -> Bayar -> Terima E-Ticket di WhatsApp/Email.

    Monitoring: Admin memantau trafik berita dan total pendapatan dari dashboard pusat.

5. Architecture
Berikut adalah gambaran alur data pendaftaran event menggunakan teknologi Next.js dan Payment Gateway:
sequenceDiagram
    participant User as Peserta Event
    participant FE as Frontend (Next.js)
    participant PG as Payment Gateway (Midtrans)
    participant DB as Database (PostgreSQL)

    User->>FE: Isi Form Pendaftaran & Klik Bayar
    FE->>PG: Buat Transaksi (Snap Token)
    PG-->>FE: Tampilkan QRIS/VA
    User->>PG: Melakukan Pembayaran
    PG-->>FE: Kirim Webhook (Status Success)
    FE->>DB: Update Status Bayar & Generate Ticket
    DB-->>FE: Data Tersimpan
    FE-->>User: Tampilkan E-Ticket & Kirim Notifikasi

6. Database Schema
Berikut adalah struktur database utama yang mendukung ekosistem Beltim.id:

erDiagram
    users {
        int id PK
        string full_name
        string email
        string phone_number
        string role
        datetime created_at
    }

    news {
        int id PK
        string title
        string content_snippet
        string source_url
        datetime published_at
    }

    listings_fjb {
        int id PK
        int seller_id FK
        string title
        int price
        string category
        boolean is_premium
        datetime created_at
    }

    events {
        int id PK
        int organizer_id FK
        string title
        datetime event_date
        int price
        int quota
    }

    tickets {
        int id PK
        int event_id FK
        int user_id FK
        string qr_code
        string payment_status
        datetime created_at
    }

    users ||--o{ listings_fjb : "posts"
    users ||--o{ events : "organizes"
    events ||--o{ tickets : "generates"
    users ||--o{ tickets : "buys"

Tabel	Deskripsi
users	Menyimpan data profil, nomor WA, dan peran (Admin/Seller/Organizer)
news	Data berita hasil crawl otomatis dari sumber eksternal
listings_fjb	Iklan jual beli dari warga lokal, termasuk status premium/sundul
events	Master data event (pesta rakyat, lomba lari, festival)
tickets	Data transaksi tiket, status pembayaran, dan kode unik QR

7. Design & Technical Constraints
    1. High-Level Technology:

        - Frontend: Next.js 14 (App Router).

        - Styling: Tailwind CSS & shadcn/ui.

        - Auth: Clerk / Supabase Auth (WhatsApp & Google Support).

        - Database: PostgreSQL (Supabase) dengan Prisma ORM.

        - Payment: Midtrans API.

    2. Typography Rules:

        - Sesuai standar UI modern:

        - Sans: Geist Mono, ui-monospace, monospace

        - Serif: serif

        - Mono: JetBrains Mono, monospace