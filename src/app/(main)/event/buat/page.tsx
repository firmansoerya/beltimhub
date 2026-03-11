import { EventForm } from "@/components/EventForm";

export default function BuatEventPage() {
  return <EventForm mode="create" backHref="/dashboard/organizer" />;
}
