"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EnhancedCreatePostModal } from "./enhanced-create-post-modal"

export function FloatingActionButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 bg-gradient-to-r from-primary to-secondary z-50"
        onClick={() => setIsModalOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <EnhancedCreatePostModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  )
}
