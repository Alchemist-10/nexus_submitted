// src/app/(whatever-path)/join/[id]/page.tsx
'use client';

import React, { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import 'react-day-picker/dist/style.css';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// --- Type Definitions ---
interface Post {
    id: string;
    title: string;
    author: { full_name: string; };
    availability_start_date?: string;
    availability_end_date?: string;
}

const availableLocations = ["MilmaLab", "TT Lab", "Huts", "304", "204", "404", "Library", "Amphitheatre"];

export default function JoinSessionPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const postId = Array.isArray(params.id) ? params.id[0] : params.id;

    const [post, setPost] = useState<Post | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [mode, setMode] = useState("online");
    const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("17:00");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchPost = async () => {
            if (!postId) return;
            try {
                setIsLoading(true);
                const res = await apiClient.getPost(postId);
                setPost(res.data);
            } catch (e) {
                toast({ title: "Error", description: "Could not load post details.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchPost();
    }, [postId]);
    
    const authorTimeRange = React.useMemo(() => {
        if (post?.availability_start_date) {
            const fromParts = post.availability_start_date.split('-').map(Number);
            const fromDate = new Date(fromParts[0], fromParts[1] - 1, fromParts[2]);
            const endDateStr = post.availability_end_date || post.availability_start_date;
            const toParts = endDateStr.split('-').map(Number);
            const toDate = new Date(toParts[0], toParts[1] - 1, toParts[2]);
            return { from: fromDate, to: toDate };
        }
        const today = new Date();
        const toDate = new Date();
        toDate.setDate(today.getDate() + 14);
        return { from: today, to: toDate };
    }, [post]);

    const handleSubmit = async () => {
        if (!selectedDate || !postId) {
            toast({ title: "Incomplete Form", description: "Please select a date.", variant: "destructive" });
            return;
        }
        if (startTime >= endTime) {
            toast({ title: "Invalid Time", description: "Start time must be before end time.", variant: "destructive" });
            return;
        }
        if (mode === 'offline' && selectedLocations.length === 0) {
            toast({ title: "Incomplete Form", description: "Please select at least one location for an offline session.", variant: "destructive" });
            return;
        }

        setSubmitting(true);
        try {
            await apiClient.createSessionProposal(postId, {
                mode,
                selectedDate: selectedDate.toISOString().slice(0, 10),
                startTime,
                endTime,
                chosenLocations: selectedLocations,
            });
            toast({ title: "Success!", description: "Your availability has been submitted." });
            router.push(`/posts/${postId}`);
        } catch (err: any) {
            toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };
    
    if (isLoading) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <style>{`:root { --background: 200 25% 10%; --foreground: 210 40% 98%; }`}</style>
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                            Join Session
                        </h1>
                        <p className="text-muted-foreground mt-2">Select your availability to join the session.</p>
                    </div>

                    {/* ✅ RESTORED: UI for Mode Selection */}
                    <Card>
                        <CardHeader><CardTitle>1. Select Your Preferred Mode</CardTitle></CardHeader>
                        <CardContent>
                            <RadioGroup value={mode} onValueChange={setMode} className="mb-4 space-y-2">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="online" id="online" />
                                    <Label htmlFor="online">Online (Google Meet)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="offline" id="offline" />
                                    <Label htmlFor="offline">Offline (On Campus)</Label>
                                </div>
                            </RadioGroup>
                            {mode === 'offline' && (
                                <div className="mt-6 border-t border-border pt-6">
                                    <Label className="font-semibold text-base">Choose Preferred Locations</Label>
                                    <p className="text-sm text-muted-foreground mb-4">You can select one or more places.</p>
                                    <ToggleGroup type="multiple" value={selectedLocations} onValueChange={setSelectedLocations} className="flex-wrap justify-start gap-2">
                                        {availableLocations.map(loc => (
                                            <ToggleGroupItem key={loc} value={loc} className="h-10 px-4">{loc}</ToggleGroupItem>
                                        ))}
                                    </ToggleGroup>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>2. Select Your Available Date & Time</CardTitle>
                            <CardDescription>
                                The author is available from {authorTimeRange.from.toLocaleDateString()} to {authorTimeRange.to.toLocaleDateString()}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col lg:flex-row gap-8 items-start">
                            <div className="w-full lg:w-auto">
                                <h4 className="font-semibold mb-2 text-center text-card-foreground">Select a Day</h4>
                                <DayPicker
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    className="rounded-md border bg-card p-3"
                                    disabled={{ before: authorTimeRange.from, after: authorTimeRange.to }}
                                    defaultMonth={authorTimeRange.from}
                                />
                            </div>
                            {/* ✅ RESTORED: UI for Time Selection */}
                            <div className="flex-1 w-full border-t lg:border-t-0 lg:border-l border-border pt-6 lg:pt-0 lg:pl-8">
                                <h4 className="font-semibold mb-4 text-center">Select Time Range</h4>
                                <div className="flex justify-around gap-4">
                                    <div className="flex flex-col items-center gap-2">
                                        <Label htmlFor="start-time">Start time:</Label>
                                        <input id="start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-transparent border border-input rounded-md p-2 text-center" />
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <Label htmlFor="end-time">End time:</Label>
                                        <input id="end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="bg-transparent border border-input rounded-md p-2 text-center" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <div className="flex justify-end">
                        <Button size="lg" onClick={handleSubmit} disabled={submitting}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Availability
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}