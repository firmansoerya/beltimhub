import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EditLokerForm } from "@/app/(main)/loker/[id]/edit/EditLokerForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function DashboardEditLokerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;

  const [job, currentUser] = await Promise.all([
    prisma.jobListing.findUnique({ where: { id } }),
    prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } }),
  ]);

  if (!job) notFound();
  if (!currentUser || job.posterId !== currentUser.id) redirect("/dashboard/loker");

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-20 bg-background -mx-6 md:-mx-8 px-6 md:px-8 py-5 border-b mb-8">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/loker" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold leading-tight">Edit Lowongan</h1>
            <p className="text-sm text-muted-foreground">{job.title}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl">
        <EditLokerForm
          id={id}
          formId="edit-loker-form"
          backHref="/dashboard/loker"
          defaultValues={{
            title: job.title,
            company: job.company,
            type: job.type as "Full-time" | "Part-time" | "Freelance" | "Magang",
            location: job.location ?? "",
            salary: job.salary ?? "",
            contact: job.contact,
            description: job.description,
          }}
        />
      </div>
    </div>
  );
}
