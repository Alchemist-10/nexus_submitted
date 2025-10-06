"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const availableLocations = ["MilmaLab", "TT Lab", "Huts", "304", "204", "404", "Library", "Amphitheatre"];
const authorTimeRange = {
    from: new Date(),
    to: new Date(new Date().setDate(new Date().getDate() + 14)) // Allow selections for the next 14 days
};

export default function JoinSessionPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const postId = params.id as string;

    const [mode, setMode] = useState("online");
    const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
    const [selectedDates, setSelectedDates] = useState<Date[] | undefined>([]);
    const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // ✅ MERGED: Replaced placeholder with full backend logic
    const handleSubmit = async () => {
        // --- Validation ---
        if (!selectedDates || selectedDates.length === 0 || selectedTimes.length === 0) {
            toast({
                title: "Incomplete Form",
                description: "Please select at least one date and one time slot.",
                variant: "destructive",
            });
            return;
        }
        if (mode === 'offline' && selectedLocations.length === 0) {
            toast({
                title: "Incomplete Form",
                description: "Please select at least one location for an offline session.",
                variant: "destructive",
            });
            return;
        }

        setSubmitting(true);

        // --- Payload Construction ---
        const payload = {
            mode,
            selectedDates: selectedDates.map(d => {
                // Convert Date to ISO date string 'YYYY-MM-DD' expected by the database
                return d.toISOString().slice(0, 10);
            }),
            selectedTimeSlots: selectedTimes,
            // Send the first selected location, or null if online/none selected
            chosenLocation: mode === 'offline' ? (selectedLocations[0] ?? null) : null
        };

        try {
            // --- API Call ---
            await apiClient.createSessionProposal(postId, payload);

            toast({
                title: "Success!",
                description: "Your availability has been submitted to the post author.",
            });

            // Redirect user back to the post page on success
            router.push(`/post/${postId}`);

        } catch (e: any) {
            console.error(e);
            toast({
                title: "Submission Failed",
                description: e.message || "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-transparent">
            <Navigation />
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            Join Session
                        </h1>
                        <p className="text-muted-foreground mt-2">Select your availability and preferred mode to join the session.</p>
                    </div>

                    <Card className="nexus-card bg-card/80 backdrop-blur-md border-border/50">
                        <CardHeader><CardTitle>1. Select Your Preferred Mode</CardTitle></CardHeader>
                        <CardContent>
                            <RadioGroup value={mode} onValueChange={setMode} className="mb-4">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="online" id="online" /><Label htmlFor="online">Online (Google Meet)</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="offline" id="offline" /><Label htmlFor="offline">Offline (On Campus)</Label></div>
                            </RadioGroup>

                            {mode === 'offline' && (
                                <div className="mt-6 border-t border-border/50 pt-6 animate-in fade-in-50">
                                    <Label className="font-semibold text-base">Choose Preferred Locations</Label>
                                    <p className="text-sm text-muted-foreground mb-4">You can select multiple places you're willing to meet.</p>
                                    <ToggleGroup type="multiple" variant="outline" className="flex-wrap justify-start gap-2" value={selectedLocations} onValueChange={(value) => setSelectedLocations(value)}>
                                        {availableLocations.map(loc => (
                                            <ToggleGroupItem key={loc} value={loc} className="h-10 px-4">{loc}</ToggleGroupItem>
                                        ))}
                                    </ToggleGroup>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="nexus-card bg-card/80 backdrop-blur-md border-border/50">
                        <CardHeader>
                            <CardTitle>2. Select Your Available Intervals</CardTitle>
                            <CardDescription>
                                The session will be scheduled within the next two weeks.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col lg:flex-row gap-8 items-start">
                            <div className="w-full lg:w-auto">
                                <h4 className="font-semibold mb-2 text-center">Select Days</h4>
                                <Calendar
                                    mode="multiple"
                                    min={1}
                                    selected={selectedDates}
                                    onSelect={setSelectedDates}
                                    className="rounded-md border mx-auto"
                                    fromDate={authorTimeRange.from}
                                    toDate={authorTimeRange.to}
                                    disabled={{ before: authorTimeRange.from, after: authorTimeRange.to }}
                                />
                            </div>
                            <div className="flex-1 w-full">
                                <h4 className="font-semibold mb-2 text-center">Select Time Slots</h4>
                                <ToggleGroup type="multiple" variant="outline" orientation="vertical" className="w-full gap-2" value={selectedTimes} onValueChange={(value) => setSelectedTimes(value)}>
                                    <ToggleGroupItem value="morning" className="w-full h-12 text-base">Morning (9am - 12pm)</ToggleGroupItem>
                                    <ToggleGroupItem value="afternoon" className="w-full h-12 text-base">Afternoon (1pm - 5pm)</ToggleGroupItem>
                                    <ToggleGroupItem value="evening" className="w-full h-12 text-base">Evening (6pm - 9pm)</ToggleGroupItem>
                                </ToggleGroup>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button size="lg" className="nexus-glow text-lg py-6 px-8" onClick={handleSubmit} disabled={submitting}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Availability
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
