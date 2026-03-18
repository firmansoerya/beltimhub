import { getSiteSettings } from "@/lib/site-settings";

export default async function RefundPage() {
  const settings = await getSiteSettings();
  return <StaticPage title="Kebijakan Pengembalian" content={settings.pageRefund} />;
}

function StaticPage({ title, content }: { title: string; content: string }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">{title}</h1>
      {content ? (
        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
      ) : (
        <p className="text-muted-foreground">Konten belum tersedia.</p>
      )}
    </div>
  );
}
