export interface WisataSpot {
  id: string;
  name: string;
  category: "Pantai" | "Danau" | "Alam" | "Budaya" | "Kuliner";
  description: string;
  location: string;
  emoji: string;
  highlight?: string;
}

export const wisataData: WisataSpot[] = [
  {
    id: "pantai-burung-mandi",
    name: "Pantai Burung Mandi",
    category: "Pantai",
    description: "Pantai berpasir putih dengan bebatuan granit khas Belitung. Suasana tenang cocok untuk bersantai dan menikmati matahari terbenam.",
    location: "Kec. Damar, Belitung Timur",
    emoji: "🏖️",
    highlight: "Sunrise terbaik",
  },
  {
    id: "danau-biru-kaolin",
    name: "Danau Biru Kaolin",
    category: "Danau",
    description: "Danau cantik berwarna biru toska hasil penambangan kaolin. Warnanya yang unik menjadikannya spot foto yang ikonik di Belitung Timur.",
    location: "Manggar, Belitung Timur",
    emoji: "💎",
    highlight: "Spot foto ikonik",
  },
  {
    id: "pantai-tanjung-kelumpang",
    name: "Pantai Tanjung Kelumpang",
    category: "Pantai",
    description: "Pantai dengan hamparan pasir putih halus dan air jernih kehijauan. Bebatuan granit besar menghiasi sepanjang garis pantai.",
    location: "Simpang Pesak, Belitung Timur",
    emoji: "🌊",
  },
  {
    id: "bukit-peramun",
    name: "Bukit Peramun",
    category: "Alam",
    description: "Kawasan hutan tropis yang menjadi habitat tarsius dan berbagai satwa liar. Tersedia trekking trail dengan pemandu lokal.",
    location: "Kec. Air Gegas, Belitung Timur",
    emoji: "🌿",
    highlight: "Habitat Tarsius",
  },
  {
    id: "taman-kota-manggar",
    name: "Taman Kota Manggar",
    category: "Budaya",
    description: "Pusat kota Manggar dengan suasana kafe kopi yang kental. Manggar dikenal sebagai Kota 1001 Warung Kopi.",
    location: "Manggar, Belitung Timur",
    emoji: "☕",
    highlight: "Kota 1001 Warung Kopi",
  },
  {
    id: "pantai-tanjung-batu",
    name: "Pantai Tanjung Batu",
    category: "Pantai",
    description: "Pantai tenang dengan pemandangan pulau-pulau kecil di sekitarnya. Tersedia perahu untuk island hopping.",
    location: "Tanjung Batu, Belitung Timur",
    emoji: "⛵",
  },
  {
    id: "air-terjun-mengkubang",
    name: "Air Terjun Mengkubang",
    category: "Alam",
    description: "Air terjun tersembunyi di tengah hutan lebat. Aliran air jernih dan sejuk, cocok untuk trekking dan berenang.",
    location: "Kec. Manggar, Belitung Timur",
    emoji: "💧",
  },
  {
    id: "kampung-nelayan-buku-limau",
    name: "Kampung Nelayan Buku Limau",
    category: "Budaya",
    description: "Kampung nelayan tradisional dengan rumah-rumah di atas air. Wisata autentik kehidupan pesisir Belitung Timur.",
    location: "Kelapa Kampit, Belitung Timur",
    emoji: "🐟",
    highlight: "Wisata Autentik",
  },
];
