// components/NotificationBell.tsx

'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { apiClient } from '@/lib/api'; // We will add getNotifications to apiClient next
import Link from 'next/link';

interface Notification {
    id: string;
    type: string;
    payload: { post_id: string; };
    created_at: string;
    is_read: boolean;
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchNotifications = async () => {
                const res = await apiClient.getNotifications();
                setNotifications(res.data);
            };
            fetchNotifications();
        }
    }, [isOpen]);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <div className="p-2">
                    <h4 className="font-medium leading-none mb-2">Notifications</h4>
                    <div className="space-y-2">
                        {notifications.length === 0 && <p className="text-sm text-muted-foreground">No new notifications.</p>}
                        {notifications.map(notif => (
                            <Link key={notif.id} href={`/posts/${notif.payload.post_id}`} className="block p-2 rounded-md hover:bg-accent">
                                <p className="text-sm font-medium">
                                    {notif.type === 'proposal_accepted' 
                                        ? "Your session proposal was accepted!" 
                                        : "You have a new session proposal."}
                                </p>
                                <p className="text-xs text-muted-foreground">{new Date(notif.created_at).toLocaleString()}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}