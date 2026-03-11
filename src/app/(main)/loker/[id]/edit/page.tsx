import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EditLokerForm } from "./EditLokerForm";

export default async function EditLokerPage({
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
  if (!currentUser || job.posterId !== currentUser.id) redirect(`/loker/${id}`);

  return (
    <EditLokerForm
      id={id}
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
  );
}
