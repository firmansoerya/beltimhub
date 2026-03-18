"use client";

import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransferTicketModal, type TransferableTicket } from "@/components/TransferTicketModal";

interface Props {
  tickets: TransferableTicket[];
  eventTitle: string;
}

export function TransferButton({ tickets, eventTitle }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => setOpen(true)}>
        <ArrowRightLeft className="h-3.5 w-3.5" />
        Transfer
      </Button>
      <TransferTicketModal
        tickets={tickets}
        eventTitle={eventTitle}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
