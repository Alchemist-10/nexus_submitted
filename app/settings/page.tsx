"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    name: "John Doe",
    username: "john-doe",
    email: "john@example.com",
    bio: "Software developer passionate about web technologies and machine learning.",
    interests: ["JavaScript", "React", "AI/ML", "Python"],
  })

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: false,
    weeklyDigest: true,
    mentionAlerts: true,
  })

  const [newInterest, setNewInterest] = useState("")

  const handleAddInterest = () => {
    if (newInterest.trim() && !profile.interests.includes(newInterest.trim())) {
      setProfile({
        ...profile,
        interests: [...profile.interests, newInterest.trim()],
      })
      setNewInterest("")
    }
  }

  const handleRemoveInterest = (interest: string) => {
    setProfile({
      ...profile,
      interests: profile.interests.filter((i) => i !== interest),
    })
  }

  const handleSaveProfile = () => {
    console.log("[v0] Saving profile:", profile)
  }

  const handleSaveNotifications = () => {
    console.log("[v0] Saving notifications:", notifications)
  }

  return (
    // MODIFICATION: Changed bg-background to bg-transparent
    <div className="min-h-screen bg-transparent">
      <Navigation />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8 text-center">
          {/* MODIFICATION: Added gradient to title for consistency */}
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Account Settings
          </h1>
          <p className="text-muted-foreground">Manage your account preferences and profile information</p>
        </div>

        <div className="space-y-8">
          {/* Profile Settings */}
          <Card className="nexus-card bg-card/80 backdrop-blur-md border-border/50">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your profile details and interests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-lg">
                    {profile.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm">Change Avatar</Button>
                  <p className="text-sm text-muted-foreground mt-1">JPG, PNG or GIF. Max size 2MB.</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })}/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })}/>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })}/>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" placeholder="Tell us about yourself..." value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} className="min-h-[100px]"/>
              </div>

              <div className="space-y-3">
                <Label>Interests</Label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {profile.interests.map((interest) => (
                    <Badge key={interest} variant="secondary" className="px-3 py-1">
                      {interest}
                      <button onClick={() => handleRemoveInterest(interest)} className="ml-2 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Add new interest..." value={newInterest} onChange={(e) => setNewInterest(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddInterest()}/>
                  <Button onClick={handleAddInterest} variant="outline">Add</Button>
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-border/50">
                <Button onClick={handleSaveProfile}>Save Profile Changes</Button>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="nexus-card bg-card/80 backdrop-blur-md border-border/50">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* MODIFICATION: Improved responsive layout for each setting row */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates about your posts and mentions.</p>
                </div>
                <Switch checked={notifications.emailNotifications} onCheckedChange={(checked) => setNotifications({ ...notifications, emailNotifications: checked })}/>
              </div>
              <Separator />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Weekly Digest</Label>
                  <p className="text-sm text-muted-foreground">A summary of top posts and activity.</p>
                </div>
                <Switch checked={notifications.weeklyDigest} onCheckedChange={(checked) => setNotifications({ ...notifications, weeklyDigest: checked })}/>
              </div>
              <Separator />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Mention Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified when someone mentions you.</p>
                </div>
                <Switch checked={notifications.mentionAlerts} onCheckedChange={(checked) => setNotifications({ ...notifications, mentionAlerts: checked })}/>
              </div>

              <div className="flex justify-end pt-4 border-t border-border/50">
                <Button onClick={handleSaveNotifications}>Save Notification Settings</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}