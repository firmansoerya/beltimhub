import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Globe, MapPin, Building2, Heart, Shield, Zap } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

const emergencyNumbers = [
  { name: "Polres Belitung Timur", number: "0719-91110", icon: Shield },
  { name: "RSUD Dr. Marsidi Judono", number: "0719-91059", icon: Heart },
  { name: "Damkar Belitung Timur", number: "0719-91113", icon: Zap },
  { name: "Ambulans Gawat Darurat", number: "118", icon: Heart },
  { name: "PLN 123", number: "123", icon: Zap },
];

const skpdList = [
  { name: "Pemkab Belitung Timur", address: "Jl. Raya Manggar, Manggar", phone: "0719-91001", website: "https://beltimkab.go.id" },
  { name: "Dinas Kesehatan", address: "Manggar, Belitung Timur", phone: "0719-91060", website: null },
  { name: "Dinas Pendidikan", address: "Manggar, Belitung Timur", phone: "0719-91020", website: null },
  { name: "Dinas Pariwisata", address: "Manggar, Belitung Timur", phone: "0719-91030", website: null },
  { name: "BPBD Belitung Timur", address: "Manggar, Belitung Timur", phone: "0719-91115", website: null },
];

const onlineServices = [
  { name: "Portal Pemkab Beltim", url: "https://beltimkab.go.id", description: "Website resmi Pemerintah Kabupaten Belitung Timur" },
  { name: "LAPOR!", url: "https://lapor.go.id", description: "Layanan aspirasi dan pengaduan online rakyat" },
  { name: "SIPP Beltim", url: "#", description: "Sistem informasi perencanaan pembangunan" },
];

import { isFeatureEnabled } from "@/lib/site-settings";
import { FeatureDisabledNotice } from "@/components/FeatureDisabledNotice";

export default async function InfoPage() {
  const isEnabled = await isFeatureEnabled("info");
  if (!isEnabled) {
    return <FeatureDisabledNotice featureName="Info Belitung Timur" />;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <PageHeader page="info" />

      <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="space-y-8">
        {/* Nomor Darurat */}
        <section>
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Nomor Penting & Darurat
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {emergencyNumbers.map((item) => (
              <a key={item.name} href={`tel:${item.number}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm group-hover:text-primary transition-colors">{item.name}</p>
                      <p className="text-primary font-bold">{item.number}</p>
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </section>

        {/* SKPD */}
        <section>
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            SKPD & Instansi
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {skpdList.map((skpd) => (
              <Card key={skpd.name}>
                <CardContent className="p-4">
                  <p className="font-medium text-sm mb-1">{skpd.name}</p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" />
                      {skpd.address}
                    </div>
                    <a href={`tel:${skpd.phone}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                      <Phone className="h-3 w-3" />
                      {skpd.phone}
                    </a>
                    {skpd.website && (
                      <a href={skpd.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-primary transition-colors">
                        <Globe className="h-3 w-3" />
                        {skpd.website}
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Layanan Online */}
        <section>
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Layanan Online
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {onlineServices.map((svc) => (
              <a key={svc.name} href={svc.url} target="_blank" rel="noopener noreferrer">
                <Card className="hover:shadow-md transition-shadow cursor-pointer group h-full">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm group-hover:text-primary transition-colors">{svc.name}</p>
                      <Badge variant="outline" className="text-xs">Online</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{svc.description}</p>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </section>
      </div>
      </div>
    </div>
  );
}
