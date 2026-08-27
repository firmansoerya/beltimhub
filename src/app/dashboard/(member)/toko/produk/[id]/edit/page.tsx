import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EditProductForm } from "./EditProductForm";

export default async function EditProdukPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) redirect("/sign-in");

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      umkm: { select: { ownerId: true, name: true } },
    },
  });

  if (!product || product.umkm.ownerId !== user.id) {
    redirect("/dashboard/toko");
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-bold mb-6">Edit Produk</h1>
      <EditProductForm
        product={{
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          stock: product.stock,
          images: product.images,
          category: product.category,
          weight: product.weight,
          status: product.status,
        }}
        umkmName={product.umkm.name}
      />
    </div>
  );
}
