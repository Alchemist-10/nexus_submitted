// app/posts/[id]/proposals/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

// A type for the proposal data you will fetch
interface Proposal {
    id: string;
    status: 'pending' | 'accepted' | 'rejected';
    proposer: { 
        full_name: string; 
        avatar_url: string; 
    };
    selected_dates: string[];
    selected_time_slots: string[];
}

export default function ProposalManagementPage() {
    const params = useParams();
    const postId = params.id as string;
    const { toast } = useToast();
    
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProposals = async () => {
        if (!postId) return;
        try {
            const res = await apiClient.getProposals(postId);
            setProposals(res.data);
        } catch (error: any) {
            toast({ title: "Error", description: `Failed to fetch proposals: ${error.message}`, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProposals();
    }, [postId]);

    const handleAccept = async (proposalId: string) => {
        await apiClient.acceptProposal(proposalId);
        toast({ title: "Success", description: "Proposal accepted and session created!" });
        fetchProposals(); // Refresh the list
    };

    const handleReject = async (proposalId: string) => {
        await apiClient.rejectProposal(proposalId);
        toast({ title: "Rejected", description: "Proposal has been rejected." });
        fetchProposals(); // Refresh the list
    };
    
    const handleFinalizeAll = async () => {
        await apiClient.finalizeProposals(postId);
        toast({ title: "Success", description: "Optimal schedule has been finalized!" });
        fetchProposals(); // Refresh list to show accepted/rejected statuses
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Manage Session Proposals</h1>
                <Button onClick={handleFinalizeAll}>Finalize Best Schedule</Button>
            </div>
            
            <div className="space-y-4">
                {proposals.length > 0 ? proposals.map(proposal => (
                    <Card key={proposal.id}>
                        <CardHeader className="flex flex-row justify-between items-start">
                            <div className="flex items-center gap-4">
                                <Image src={proposal.proposer.avatar_url || '/default-avatar.png'} alt="avatar" width={40} height={40} className="rounded-full" />
                                <div>
                                    <CardTitle>{proposal.proposer.full_name}</CardTitle>
                                    <CardDescription>
                                        Requested: {new Date(proposal.selected_dates[0]).toLocaleDateString()} at {proposal.selected_time_slots[0]}
                                    </CardDescription>
                                </div>
                            </div>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                proposal.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                proposal.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                                'bg-red-500/20 text-red-400'
                            }`}>
                                {proposal.status}
                            </span>
                        </CardHeader>
                        {proposal.status === 'pending' && (
                            <CardContent className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => handleReject(proposal.id)}>Reject</Button>
                                <Button onClick={() => handleAccept(proposal.id)}>Accept</Button>
                            </CardContent>
                        )}
                    </Card>
                )) : <p>No proposals have been submitted for this post yet.</p>}
            </div>
        </div>
    );
}