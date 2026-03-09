# PRD — Beltim.id: Integrated Local Ecosystem (v2.0)

## 1. Overview
**Beltim.id** adalah platform digital terintegrasi untuk Kabupaten Belitung Timur yang berfungsi sebagai Hub Informasi, Marketplace Lokal (FJB), dan Sistem Manajemen Event Profesional.

Masalah utama yang diselesaikan:
- Digitalisasi pendaftaran event lokal (menggantikan Google Form manual).
- Kurangnya platform jual-beli yang terpercaya khusus warga lokal.
- Kebutuhan akan agregator berita daerah yang otomatis.
- Penyediaan solusi operasional "terima beres" bagi penyelenggara event (Check-in system & WA Notification).

## 2. Requirements
- **Aksesibilitas:** Web-responsive (Mobile-first).
- **Autentikasi:** Hybrid Login (Google OAuth & WhatsApp OTP via Clerk/Supabase Auth).
- **Otorisasi (RBAC):** Admin, Organizer (Event), Seller (FJB), dan Member.
- **Automasi:** News Crawler menggunakan RSS Parser dengan filtering keyword "Belitung/Beltim".
- **Integrasi:** Payment Gateway (Midtrans) & WhatsApp API (Fonnte/Whacenter).

## 3. Core Features & Service Packages

1. **News Aggregator (Auto-pilot)**
   - Crawling otomatis berita dari portal regional.
   - Atribusi sumber asli & SEO-friendly.

2. **Self-Service FJB (Marketplace)**
   - Posting mandiri oleh user terverifikasi.
   - **Monetisasi:** Fitur "Sundul Iklan" (Iklan Premium) via pembayaran otomatis.

3. **Event & Ticketing (Subdomain: event.beltim.id)**
   - **Starter:** Pendaftaran gratis, e-ticket via email, scan QR via kamera HP.
   - **Pro:** Notifikasi tiket via WhatsApp, boosting ads di portal berita.
   - **Elite (Operational Partner):** Sewa hardware scanner bluetooth untuk check-in cepat & Digital Queue untuk pembagian atribut (Jersey/BIB).

## 4. User Flow
1. **Organizer:** Login -> Create Event -> Pilih Paket (Pro/Elite) -> Publish.
2. **User:** Browse Event -> Register & Pay (Midtrans) -> Terima WA (QR Code).
3. **On-Site:** User datang -> Panitia scan QR (Hardware/HP) -> Status "Checked-In" terupdate real-time.

## 5. Architecture (Sequence Diagram)

```mermaid
sequenceDiagram
    participant User
    participant System
    participant PG as Payment Gateway
    participant WA as WhatsApp API

    User->>System: Register & Bayar
    System->>PG: Generate Snap Token
    User->>PG: Bayar via QRIS
    PG-->>System: Webhook (Paid)
    System->>WA: Kirim E-Ticket (QR Code)
    User->>System: Scan QR di Lokasi
    System-->>User: Validasi & Check-in Berhasil