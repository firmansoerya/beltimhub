// Daftar bank di Indonesia yang terdaftar di OJK
// Sumber: Bank Indonesia / OJK
export const BANK_LIST = [
  // Bank Umum (BUMN)
  "Bank Rakyat Indonesia (BRI)",
  "Bank Mandiri",
  "Bank Negara Indonesia (BNI)",
  "Bank Tabungan Negara (BTN)",

  // Bank Umum Swasta Nasional
  "Bank Central Asia (BCA)",
  "Bank CIMB Niaga",
  "Bank Danamon",
  "Bank Panin",
  "Bank OCBC NISP",
  "Bank Permata",
  "Bank Mega",
  "Bank Bukopin",
  "Bank Sinarmas",
  "Bank Maybank Indonesia",
  "Bank UOB Indonesia",
  "Bank HSBC Indonesia",
  "Bank DBS Indonesia",
  "Bank Commonwealth",
  "Bank Citibank",
  "Bank Standard Chartered",
  "Bank MNC Internasional",
  "Bank KEB Hana Indonesia",
  "Bank Woori Saudara",
  "Bank Ina Perdana",
  "Bank Jago",
  "Bank Neo Commerce",
  "Bank Digital BCA (Blu)",
  "Allo Bank",
  "Sea Bank Indonesia",
  "Bank Amar Indonesia",
  "Superbank (LINE Bank)",

  // Bank Syariah
  "Bank Syariah Indonesia (BSI)",
  "Bank Muamalat",
  "Bank Mega Syariah",
  "Bank BCA Syariah",
  "Bank Aladin Syariah",
  "Bank BTPN Syariah",
  "Bank CIMB Niaga Syariah",

  // Bank Pembangunan Daerah (BPD)
  "Bank DKI",
  "Bank BJB (Jabar Banten)",
  "Bank Jateng",
  "Bank Jatim",
  "Bank DIY",
  "Bank Sumut",
  "Bank Nagari (Sumbar)",
  "Bank Riau Kepri",
  "Bank Sumsel Babel",
  "Bank Lampung",
  "Bank Bengkulu",
  "Bank Jambi",
  "Bank Aceh",
  "Bank Kalbar",
  "Bank Kalsel",
  "Bank Kalteng",
  "Bank Kaltim Kaltara",
  "Bank Sulselbar",
  "Bank Sultra",
  "Bank Sulteng",
  "Bank Sulut Go",
  "Bank NTB Syariah",
  "Bank NTT",
  "Bank Maluku Malut",
  "Bank Papua",
  "Bank Bali",
  "Bank Banten",

  // Bank BTPN dan anak usaha
  "Bank BTPN",
  "Jenius (Bank BTPN)",

  // E-wallet / Fintech (yang punya rekening bank)
  "GoPay (Bank Jago)",
  "OVO (Bank Nobu)",
  "DANA",
  "ShopeePay",
] as const;

export type BankName = (typeof BANK_LIST)[number];
