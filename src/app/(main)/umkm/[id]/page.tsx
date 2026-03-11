import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Phone, Instagram, Globe, MapPin, MessageCircle, Pencil } from "lucide-react";

export default async function UmkmDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();

  const [umkm, currentUser] = await Promise.all([
    prisma.umkm.findUnique({ where: { id } }),
    userId ? prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } }) : null,
  ]);

  if (!umkm) notFound();

  const isOwner = !!currentUser && currentUser.id === umkm.ownerId;

  const waLink = umkm.phone
    ? `https://wa.me/62${umkm.phone.replace(/^0/, "")}?text=Halo, saya tertarik dengan usaha ${umkm.name} yang terdaftar di BeltimHub`
    : null;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Link href="/umkm" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Kembali ke UMKM
      </Link>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="aspect-square rounded-xl bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center overflow-hidden">
          {umkm.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={umkm.imageUrl} alt={umkm.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-7xl">🏪</span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{umkm.category}</Badge>
              {umkm.isVerified && <Badge className="bg-teal-600 text-white">✓ Terverifikasi</Badge>}
            </div>
            <h1 className="text-xl font-bold">{umkm.name}</h1>
            {isOwner && (
              <Link href={`/umkm/${id}/edit`} className="inline-block mt-2">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit UMKM
                </Button>
              </Link>
            )}
            {umkm.address && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <MapPin className="h-4 w-4" />
                {umkm.address}
              </div>
            )}
          </div>

          <Separator />

          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kontak & Sosial Media</p>
              {waLink && (
                <a href={waLink} target="_blank" rel="noopener noreferrer" className="block">
                  <Button className="w-full gap-2 bg-green-600 hover:bg-green-700">
                    <MessageCircle className="h-4 w-4" />
                    Hubungi via WhatsApp
                  </Button>
                </a>
              )}
              {umkm.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {umkm.phone}
                </div>
              )}
              {umkm.instagram && (
                <a href={`https://instagram.com/${umkm.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                  <Instagram className="h-4 w-4 text-muted-foreground" />
                  @{umkm.instagram.replace("@", "")}
                </a>
              )}
              {umkm.website && (
                <a href={umkm.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  {umkm.website}
                </a>
              )}
            </CardContent>
          </Card>

          <Separator />

          <div>
            <h2 className="font-semibold mb-2">Tentang Usaha</h2>
            {umkm.description.startsWith("<") ? (
              <div
                className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: umkm.description }}
              />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{umkm.description}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
