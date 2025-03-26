import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Vote, Check, PartyPopper } from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Position, Candidate, PartyList } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SuccessAnimation = ({ candidateId }: { candidateId: number }) => (
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    exit={{ scale: 0 }}
    className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 rounded-lg"
  >
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      className="bg-green-500 text-white rounded-full p-8 flex items-center justify-center"
    >
      <PartyPopper className="h-16 w-16" />
    </motion.div>
  </motion.div>
);

export default function VotingPage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [candidateToVote, setCandidateToVote] = useState<Candidate | null>(null);
  const [showFinalConfirmation, setShowFinalConfirmation] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const { data, isLoading } = useQuery<{
    positions: Position[];
    candidates: Candidate[];
    partyLists: PartyList[];
    systemSettings: any; // Added to handle systemSettings
  }>({
    queryKey: ["/api/candidates"],
  });

  const voteMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      await apiRequest("POST", `/api/vote/${candidateId}`);
    },
    onSuccess: () => {
      toast({
        title: "Vote recorded",
        description: "Your vote has been recorded successfully!",
      });
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 1500);
      setCandidateToVote(null);
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      checkIfVotingComplete();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setCandidateToVote(null);
    },
  });

  const markVotedMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/users/mark-voted");
    },
    onSuccess: () => {
      // Invalidate all relevant queries before logout
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      // Then logout
      logoutMutation.mutate();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const checkIfVotingComplete = () => {
    if (!data || !user?.votes) return;

    const votedPositions = new Map<number, number>();
    data.candidates
      .filter(c => user.votes.includes(c.id.toString()))
      .forEach(c => {
        votedPositions.set(c.positionId, (votedPositions.get(c.positionId) || 0) + 1);
      });

    const allPositionsComplete = data.positions.every(position => {
      const votesForPosition = votedPositions.get(position.id) || 0;
      return votesForPosition >= position.maxVotes;
    });

    if (allPositionsComplete) {
      setShowFinalConfirmation(true);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  const { positions, candidates, partyLists, systemSettings } = data;

  const getCandidatesByPosition = (positionId: number) =>
    candidates.filter((c) => c.positionId === positionId);

  const getUserVotesForPosition = (positionId: number) => {
    if (!user?.votes) return [];
    return candidates.filter(c =>
      c.positionId === positionId &&
      user.votes.includes(c.id.toString())
    );
  };

  const getRemainingVotes = (position: Position) => {
    const currentVotes = getUserVotesForPosition(position.id).length;
    return position.maxVotes - currentVotes;
  };

  const getPartyName = (partyId: number) =>
    partyLists.find((p) => p.id === partyId)?.name || "";

  const sortedCategories = ["Executive", "Legislative", "Departmental"];
  const getCategoryTitle = (category: string) => {
    switch (category) {
      case "Executive":
        return "Executive Positions";
      case "Legislative":
        return "Legislative Positions";
      case "Departmental":
        return "Departmental Positions";
      default:
        return category;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4">
        <div className="flex justify-between items-center p-6 bg-white shadow-sm">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            {systemSettings?.votingLogoUrl ? (
              <img
                src={systemSettings.votingLogoUrl}
                alt="Voting Logo"
                className="h-8 w-8"
              />
            ) : (
              <Vote className="h-8 w-8 text-primary" />
            )}
            Cast Your Vote
          </h1>
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline">Back to Party Lists</Button>
            </Link>
            <Button
              variant="destructive"
              onClick={() => markVotedMutation.mutate()}
              disabled={markVotedMutation.isPending || logoutMutation.isPending}
            >
              {(markVotedMutation.isPending || logoutMutation.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Done Voting
            </Button>
          </div>
        </div>

        <div className="space-y-8 py-6">
          {sortedCategories.map(category => (
            <div key={category} className="space-y-6">
              <div className="px-6">
                <h2 className="text-2xl font-bold border-b pb-2">{getCategoryTitle(category)}</h2>
              </div>
              {positions
                .filter(p => p.category === category)
                .map(position => {
                  const userVotes = getUserVotesForPosition(position.id);
                  const remainingVotes = getRemainingVotes(position);

                  return (
                    <div key={position.id} className="space-y-4">
                      <div className="flex justify-between items-center px-6">
                        <h3 className="text-xl font-semibold">{position.name}</h3>
                        <span className="text-sm text-gray-500">
                          Select up to {position.maxVotes} candidate{position.maxVotes > 1 ? 's' : ''}
                          {remainingVotes > 0 && ` (${remainingVotes} remaining)`}
                        </span>
                      </div>
                      <div className="flex justify-center">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 w-full max-w-6xl px-4 sm:px-6 md:px-8 lg:px-12 ml-48 sm:ml-64 md:ml-80 lg:ml-96">
                          {getCandidatesByPosition(position.id).map(candidate => {
                            const isSelected = userVotes.some(v => v.id === candidate.id);

                            return (
                              <Card key={candidate.id} className="relative overflow-hidden">
                                <CardContent className="pt-6">
                                  <div className="aspect-w-16 aspect-h-9 mb-4">
                                    <img
                                      src={candidate.imageUrl}
                                      alt={candidate.name}
                                      className="w-full h-48 object-cover rounded-md"
                                    />
                                  </div>
                                  <h4 className="text-lg font-medium mb-2 text-center">{candidate.name}</h4>
                                  <p className="text-sm text-gray-500 mb-4 text-center">
                                    {getPartyName(candidate.partyListId)}
                                  </p>
                                  <Button
                                    className={`w-full ${isSelected ? 'bg-green-500 hover:bg-green-500' : ''}`}
                                    onClick={() => !isSelected && remainingVotes > 0 && setCandidateToVote(candidate)}
                                    disabled={voteMutation.isPending || isSelected || remainingVotes === 0}
                                  >
                                    {isSelected ? (
                                      <span className="flex items-center gap-2 justify-center w-full">
                                        <Check className="h-4 w-4" />
                                        Voted
                                      </span>
                                    ) : remainingVotes === 0 ? (
                                      'No votes remaining'
                                    ) : (
                                      'Vote'
                                    )}
                                  </Button>
                                  <AnimatePresence>
                                    {showSuccessAnimation && candidateToVote?.id === candidate.id && (
                                      <SuccessAnimation candidateId={candidate.id} />
                                    )}
                                  </AnimatePresence>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>

        <AlertDialog
          open={candidateToVote !== null}
          onOpenChange={(open) => !open && setCandidateToVote(null)}
        >
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Your Vote</AlertDialogTitle>
              <AlertDialogDescription className="space-y-6">
                {candidateToVote && (
                  <>
                    <div className="text-center">
                      <p className="text-lg font-semibold mb-4">You are about to vote for:</p>
                      <div className="bg-white border rounded-lg p-6">
                        <img
                          src={candidateToVote.imageUrl}
                          alt={candidateToVote.name}
                          className="w-32 h-32 object-cover rounded-full mx-auto mb-4"
                        />
                        <p className="text-xl font-semibold">{candidateToVote.name}</p>
                        <p className="text-sm text-gray-500">{getPartyName(candidateToVote.partyListId)}</p>
                      </div>
                    </div>
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                      <p className="text-sm text-yellow-700">
                        This action cannot be undone. Please review your selection carefully.
                      </p>
                    </div>
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (candidateToVote) {
                    voteMutation.mutate(candidateToVote.id);
                  }
                }}
                disabled={voteMutation.isPending}
              >
                {voteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Confirm Vote
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={showFinalConfirmation}
          onOpenChange={setShowFinalConfirmation}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Voting Complete!</AlertDialogTitle>
              <AlertDialogDescription>
                Thank you for participating in the election! Your votes have been recorded successfully.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => logoutMutation.mutate()}>
                {logoutMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Done
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}