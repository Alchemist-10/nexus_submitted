"use client";

import { useState } from "react";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";

// Mock data based on your PDF. In a real app, you would fetch this based on the post ID from params.id.
const availableLocations = ["MilmaLab", "TT Lab", "Huts", "304", "204", "404", "Library", "Amphitheatre"];
const authorTimeRange = {
    from: new Date(), // For this demo, we'll start from today
    to: new Date(new Date().setDate(new Date().getDate() + 7)) // And end 7 days from now
};

export default function JoinSessionPage({ params }: { params: { id: string } }) {
    const [mode, setMode] = useState("online");
    const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
    const [selectedDates, setSelectedDates] = useState<Date[] | undefined>([]);
    const [selectedTimes, setSelectedTimes] = useState<string[]>([]);

    const handleSubmit = () => {
        // Here you would submit the user's availability to your backend.
        // You would also handle the Google Calendar integration on the backend
        // after finding the optimal time slot.
        console.log({
            postId: params.id,
            mode,
            locations: mode === 'offline' ? selectedLocations : [],
            dates: selectedDates,
            times: selectedTimes
        });
        alert("Your availability has been submitted!");
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

                    {/* Mode Selection Card */}
                    <Card className="nexus-card bg-card/80 backdrop-blur-md border-border/50">
                        <CardHeader>
                            <CardTitle>1. Select Your Preferred Mode</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <RadioGroup defaultValue="online" value={mode} onValueChange={setMode} className="mb-4">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="online" id="online" /><Label htmlFor="online">Online (Google Meet)</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="offline" id="offline" /><Label htmlFor="offline">Offline (On Campus)</Label></div>
                            </RadioGroup>

                            {mode === 'offline' && (
                                <div className="mt-6 border-t border-border/50 pt-6">
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

                    {/* Interval Selection Card */}
                    <Card className="nexus-card bg-card/80 backdrop-blur-md border-border/50">
                        <CardHeader>
                            <CardTitle>2. Select Your Available Intervals</CardTitle>
                            <CardDescription>
                                The session will be scheduled between {authorTimeRange.from.toLocaleDateString()} and {authorTimeRange.to.toLocaleDateString()}.
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
                        <Button size="lg" className="nexus-glow text-lg py-6 px-8" onClick={handleSubmit}>
                            Submit Availability
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
