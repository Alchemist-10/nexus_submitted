"use client";

import React, { useState } from "react";
import { X, Plus, ImageIcon, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Link2 } from "lucide-react";
import { DayPicker, DateRange } from "react-day-picker";
import 'react-day-picker/dist/style.css';
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { apiClient } from "@/lib/api";
import { getSupabaseBrowserClient } from '@/lib/supabase-client';

const supabase = getSupabaseBrowserClient();

const cn = (...inputs: (string | boolean | undefined | null)[]): string => {
    return inputs.filter(Boolean).join(' ');
};

interface EnhancedCreatePostModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const availableTags = [ "AI/ML", "Python", "JavaScript", "React", "Node.js", "Database", "Web Development", "Mobile", "DevOps", "Security", "UI/UX", "Data Science" ];
const postTypes = ["Project", "Academic", "Misc", "Guidance", "Announcement", "Question"];
const postTypesWithAvailability = ["Project", "Guidance", "Academic"];

export function EnhancedCreatePostModal({ open, onOpenChange }: EnhancedCreatePostModalProps) {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [postType, setPostType] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
    const [uploadedImages, setUploadedImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string>("");
    const [error, setError] = useState<string | null>(null);

    const [availabilityDate, setAvailabilityDate] = useState<DateRange | undefined>();
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("17:00");
    const [googleMeetLink, setGoogleMeetLink] = useState("");

    const resetForm = () => {
        setTitle("");
        setContent("");
        setPostType("");
        setSelectedTags([]);
        setUploadedImages([]);
        setImagePreviews([]);
        setError(null);
        setAvailabilityDate(undefined);
        setStartTime("09:00");
        setEndTime("17:00");
        setGoogleMeetLink("");
    };

    const uploadImage = async (file: File): Promise<string> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error } = await supabase.storage.from('post-images').upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage.from('post-images').getPublicUrl(fileName);
        return data.publicUrl;
    };

    const handleSubmit = async () => {
        setError(null);
        if (!(title.trim() && content.trim() && postType)) {
            setError("Title, content, and post type are required.");
            return;
        }

        setSubmitting(true);
        try {
            const imageUrls = await Promise.all(uploadedImages.map(file => uploadImage(file)));

            const postPayload = {
                title: title.trim(),
                content: content.trim(),
                postType,
                tags: selectedTags,
                images: imageUrls,
                google_meet_link: googleMeetLink.trim(),
                ...(postTypesWithAvailability.includes(postType) && availabilityDate?.from && {
                    availability_start_date: availabilityDate.from.toISOString().slice(0, 10),
                    availability_end_date: (availabilityDate.to ?? availabilityDate.from).toISOString().slice(0, 10),
                    preferred_start_time: startTime,
                    preferred_end_time: endTime,
                })
            };

            await apiClient.createPost(postPayload);
            resetForm();
            onOpenChange(false);
        } catch (e: any) {
            setError(e.message ?? "Failed to create post");
        } finally {
            setSubmitting(false);
        }
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        setUploadedImages(prev => [...prev, ...files]);
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setImagePreviews(prev => [...prev, ...newPreviews]);
    };

    const removeImage = (index: number) => {
        URL.revokeObjectURL(imagePreviews[index]);
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };
    
    const addTag = (tag: string) => {
        if (!selectedTags.includes(tag)) setSelectedTags([...selectedTags, tag]);
        setTagInput("");
        setTagPopoverOpen(false);
    };

    const removeTag = (tagToRemove: string) => {
        setSelectedTags(selectedTags.filter((tag) => tag !== tagToRemove));
    };
    
    const filteredTags = availableTags.filter(
        (tag) => tag.toLowerCase().includes(tagInput.toLowerCase()) && !selectedTags.includes(tag)
    );

    const isFormValid = title.trim() && content.trim() && postType;

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
                        <Label htmlFor="postType">Select Post Type *</Label>
                        <Select value={postType} onValueChange={setPostType}>
                            <SelectTrigger><SelectValue placeholder="Choose post type..." /></SelectTrigger>
                            <SelectContent>{postTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="title">Post Title *</Label>
                        <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter your post title..." />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="content">Content *</Label>
                        <Textarea id="content" value={content} onChange={e => setContent(e.target.value)} placeholder="Share your thoughts, ideas, or questions..." />
                    </div>

                    {/* Availability Section */}
                    {postTypesWithAvailability.includes(postType) && (
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1">
                                <AccordionTrigger>Set Availability & Meet Link (Optional)</AccordionTrigger>
                                <AccordionContent className="pt-4 space-y-4">
                                    <div>
                                        <Label>Date Range</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full justify-start font-normal">
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {availabilityDate?.from ? (availabilityDate.to ? `${format(availabilityDate.from, "LLL dd, y")} - ${format(availabilityDate.to, "LLL dd, y")}` : format(availabilityDate.from, "LLL dd, y")) : <span>Pick a date range</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <DayPicker mode="range" selected={availabilityDate} onSelect={setAvailabilityDate} numberOfMonths={2} />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-full space-y-1"><Label>Start Time</Label><Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
                                        <div className="w-full space-y-1"><Label>End Time</Label><Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="meet-link">Google Meet Link</Label>
                                        <div className="flex items-center">
                                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-background/50 text-muted-foreground">
                                                <Link2 className="h-4 w-4" />
                                            </span>
                                            <Input id="meet-link" type="url" placeholder="https://meet.google.com/..." value={googleMeetLink} onChange={(e) => setGoogleMeetLink(e.target.value)} className="rounded-l-none" />
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}

                    {/* ✅ RESTORED: Image Upload Section */}
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
                                {imagePreviews.map((src, index) => (
                                    <div key={index} className="relative group">
                                        <div className="aspect-square rounded-lg bg-muted overflow-hidden">
                                            <img src={src} alt={`preview ${index}`} className="w-full h-full object-cover" />
                                        </div>
                                        <Button variant="destructive" size="sm" onClick={() => removeImage(index)} disabled={submitting} className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ✅ RESTORED: Tag Selector Section */}
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
                            <div className="flex flex-wrap gap-2 mt-2">
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

                <div className="flex flex-col space-y-3 pt-6 border-t">
                    <div className="flex justify-end space-x-3">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={!isFormValid || submitting}>
                            {submitting ? "Creating..." : "Create Node"}
                        </Button>
                    </div>
                    {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</div>}
                </div>
            </DialogContent>
        </Dialog>
    );
}