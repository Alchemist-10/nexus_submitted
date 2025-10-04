"use client"

import type React from "react"
import { useState } from "react"
import { X, Plus, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { apiClient } from "@/lib/api"
import { getSupabaseBrowserClient } from '@/lib/supabase-client'

const supabase = getSupabaseBrowserClient()

interface EnhancedCreatePostModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const availableTags = [
  "AI/ML", "Python", "JavaScript", "React", "Node.js", "Database", "Web Development",
  "Mobile", "DevOps", "Security", "UI/UX", "Data Science", "Machine Learning",
  "Blockchain", "Cloud", "Music",
]

const postTypes = ["Project", "Academic", "Misc", "Guidance", "Announcement", "Question"]

export function EnhancedCreatePostModal({ open, onOpenChange }: EnhancedCreatePostModalProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [postType, setPostType] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>("")
  const [error, setError] = useState<string | null>(null)


  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(filePath, file, { cacheControl: '3600', upsert: false })

    if (uploadError) throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`)

    const { data } = supabase.storage.from('post-images').getPublicUrl(filePath)
    return data.publicUrl
  }

  const handleSubmit = async () => {
    setError(null)
    setUploadProgress("")

    if (!(title.trim() && content.trim() && postType)) {
      setError("Please fill in all required fields")
      return
    }

    setSubmitting(true)

    try {
      const imageUrls: string[] = []
      if (uploadedImages.length > 0) {
        setUploadProgress(`Uploading ${uploadedImages.length} image(s)...`)
        for (let i = 0; i < uploadedImages.length; i++) {
          setUploadProgress(`Uploading image ${i + 1} of ${uploadedImages.length}...`)
          const url = await uploadImage(uploadedImages[i])
          imageUrls.push(url)
        }
      }

      setUploadProgress("Creating post...")
      const created = await apiClient.createPost({
        title: title.trim(),
        content: content.trim(),
        postType,
        tags: selectedTags,
        images: imageUrls,
      })

      // Post will be automatically added via realtime subscription
      // No need to manually update state

      setTitle(""); setContent(""); setPostType(""); setSelectedTags([]);
      setTagInput(""); setUploadedImages([]); setImagePreviews([]);
      setUploadProgress(""); onOpenChange(false);
    } catch (e: any) {
      console.error("Post creation error:", e)
      setError(e?.message ?? "Failed to create post")
    } finally {
      setSubmitting(false)
    }
  }

  const addTag = (tag: string) => {
    if (!selectedTags.includes(tag)) setSelectedTags([...selectedTags, tag])
    setTagInput("")
    setTagPopoverOpen(false)
  }

  const removeTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter((tag) => tag !== tagToRemove))
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const newPreviews = files.map(file => URL.createObjectURL(file))
    setUploadedImages((prev) => [...prev, ...files])
    setImagePreviews((prev) => [...prev, ...newPreviews])
  }

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index])
    setUploadedImages((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const filteredTags = availableTags.filter(
    (tag) => tag.toLowerCase().includes(tagInput.toLowerCase()) && !selectedTags.includes(tag),
  )

  const isFormValid = title.trim() && content.trim() && postType

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Create a New Node
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4 flex-grow">
          {/* Post Type, Title, Content */}
          <div className="space-y-2">
            <Label htmlFor="postType" className="text-sm font-semibold">Select Post Type *</Label>
            <Select value={postType} onValueChange={setPostType}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Choose the type of post..." /></SelectTrigger>
              <SelectContent>{postTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-semibold">Post Title *</Label>
            <Input id="title" placeholder="Enter your post title..." value={title} onChange={(e) => setTitle(e.target.value)} className="w-full text-lg" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content" className="text-sm font-semibold">Content *</Label>
            <Textarea id="content" placeholder="Share your thoughts, ideas, or questions..." value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[150px] resize-none text-base" />
          </div>

          {/* Image Upload */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Add Images</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" id="image-upload" disabled={submitting} />
              <label htmlFor="image-upload" className="cursor-pointer">
                <div className="flex flex-col items-center space-y-2">
                  <div className="p-3 rounded-full bg-primary/10"><ImageIcon className="h-6 w-6 text-primary" /></div>
                  <div>
                    <p className="text-sm font-medium">Click to upload images</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </div>
              </label>
            </div>
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {uploadedImages.map((file, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg bg-muted overflow-hidden">
                      <img src={imagePreviews[index]} alt={file.name} className="w-full h-full object-cover" />
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => removeImage(index)} disabled={submitting} className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3" />
                    </Button>
                    <p className="text-xs text-center mt-1 truncate">{file.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tag Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Add Tags</Label>
            <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={tagPopoverOpen} disabled={submitting} className="w-full justify-start text-left font-normal bg-transparent hover:bg-muted/50">
                  <Plus className="mr-2 h-4 w-4" /> Add Tags...
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search tags..." value={tagInput} onValueChange={setTagInput} />
                  <CommandList><CommandEmpty>No tags found.</CommandEmpty><CommandGroup>
                    {filteredTags.map((tag) => <CommandItem key={tag} value={tag} onSelect={() => addTag(tag)}>{tag}</CommandItem>)}
                  </CommandGroup></CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="px-3 py-1 bg-primary/10 text-primary border-primary/20">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="ml-2 hover:text-destructive" disabled={submitting}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3 pt-6 border-t">
          {uploadProgress && <div className="text-sm text-muted-foreground text-center">{uploadProgress}</div>}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!isFormValid || submitting} className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-semibold px-6">
              {submitting ? "Creating..." : "Create Node"}
            </Button>
          </div>
          {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</div>}
        </div>
      </DialogContent>
    </Dialog>
  )
}