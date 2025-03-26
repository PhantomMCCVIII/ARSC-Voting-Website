import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Candidate, Position, PartyList, SystemSettings } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VoteAnalytics } from "@/components/analytics/VoteAnalytics";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";
import { Loader2, Edit2, Save, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChromePicker } from 'react-color';
import { convertGoogleDriveLink } from "@/lib/utils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";


type CandidateData = {
  candidates: Candidate[];
  positions: Position[];
  partyLists: PartyList[];
  systemSettings: SystemSettings;
  votingStats: {
    totalVoters: number;
    votedCount: number;
  };
  users: UserTableData[];
};

type EditingCandidate = {
  id: number;
  name: string;
  imageUrl: string;
  schoolLevels: string[];
  gradeLevels: string[];
};

type EditingPartyList = {
  id: number;
  color: string;
  name: string;
  logoUrl?: string; // Added logoUrl
};

type NewCandidate = {
  name: string;
  imageUrl: string;
  positionId: number;
  partyListId: number;
  schoolLevels: string[];
  gradeLevels: string[];
};

type UserTableData = {
  id: number;
  referenceNumber: string;
  studentName: string;
  hasVoted: boolean;
  schoolLevel: string | null;
  isAdmin: boolean;
  gradeLevel?: string; // Added gradeLevel
};

type NewPosition = {
  name: string;
  maxVotes: number;
  category: "Executive" | "Legislative" | "Departmental";
};

export default function AdminDashboard() {
  const { logoutMutation } = useAuth();
  const { toast } = useToast();
  const [editingCandidate, setEditingCandidate] = useState<EditingCandidate | null>(null);
  const [editingLogos, setEditingLogos] = useState(false);
  const [logoUrls, setLogoUrls] = useState({
    leftLogoUrl: "",
    rightLogoUrl: "",
    splashLogoUrl: "",
    votingLogoUrl: "" // Added voting logo URL
  });
  const [editingPartyList, setEditingPartyList] = useState<EditingPartyList | null>(null);
  const [newPosition, setNewPosition] = useState<NewPosition>({
    name: "",
    maxVotes: 1,
    category: "Executive"
  });
  const [positionToDelete, setPositionToDelete] = useState<number | null>(null);
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [newCandidate, setNewCandidate] = useState<NewCandidate>({
    name: "",
    imageUrl: "",
    positionId: 0,
    partyListId: 0,
    schoolLevels: [],
    gradeLevels: [],
  });
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [massRegisterInput, setMassRegisterInput] = useState("");

  const { data, isLoading } = useQuery<CandidateData>({
    queryKey: ["/api/candidates"],
    refetchInterval: 5000, // Poll every 5 seconds for updates
  });

  const updateCandidateMutation = useMutation({
    mutationFn: async (candidate: EditingCandidate) => {
      const convertedCandidate = {
        ...candidate,
        imageUrl: convertGoogleDriveLink(candidate.imageUrl),
      };
      await apiRequest("PATCH", `/api/candidate/${candidate.id}`, convertedCandidate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Success",
        description: "Candidate updated successfully",
      });
      setEditingCandidate(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateSystemSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<SystemSettings>) => {
      const convertedSettings = {
        ...settings,
        leftLogoUrl: convertGoogleDriveLink(settings.leftLogoUrl),
        rightLogoUrl: convertGoogleDriveLink(settings.rightLogoUrl),
        splashLogoUrl: convertGoogleDriveLink(settings.splashLogoUrl),
        votingLogoUrl: convertGoogleDriveLink(settings.votingLogoUrl) // Added voting logo URL
      };
      await apiRequest("PATCH", "/api/system-settings", convertedSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Success",
        description: "Logos updated successfully",
      });
      setEditingLogos(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePartyListMutation = useMutation({
    mutationFn: async (partyList: EditingPartyList) => {
      await apiRequest("PATCH", `/api/party-list/${partyList.id}`, partyList);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Success",
        description: "Party list updated successfully",
      });
      setEditingPartyList(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createPositionMutation = useMutation({
    mutationFn: async (position: NewPosition) => {
      const { name, maxVotes, category } = position;
      await apiRequest("POST", "/api/positions", { name, maxVotes, category });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Success",
        description: "Position created successfully",
      });
      setNewPosition({ name: "", maxVotes: 1, category: "Executive" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePositionMutation = useMutation({
    mutationFn: async (positionId: number) => {
      await apiRequest("DELETE", `/api/positions/${positionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Success",
        description: "Position deleted successfully",
      });
      setPositionToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCandidateMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      await apiRequest("DELETE", `/api/candidates/${candidateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Success",
        description: "Candidate deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createCandidateMutation = useMutation({
    mutationFn: async (candidate: NewCandidate) => {
      const convertedCandidate = {
        ...candidate,
        imageUrl: convertGoogleDriveLink(candidate.imageUrl),
      };
      await apiRequest("POST", "/api/candidates", convertedCandidate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Success",
        description: "Candidate created successfully",
      });
      setIsAddingCandidate(false);
      setNewCandidate({
        name: "",
        imageUrl: "",
        positionId: 0,
        partyListId: 0,
        schoolLevels: [],
        gradeLevels: [],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      setUserToDelete(null);
      setIsDeleteUserDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const massRegisterMutation = useMutation({
    mutationFn: async (input: string) => {
      const users = input
        .split("\n")
        .map(line => {
          const [referenceNumber, studentName] = line.split(",").map(s => s.trim());
          return { referenceNumber, studentName };
        })
        .filter(user => user.referenceNumber && user.studentName);

      await apiRequest("POST", "/api/users/mass-register", users);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Success",
        description: "Users registered successfully",
      });
      setMassRegisterInput("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async ({ file, logoType }: { file: File; logoType?: keyof typeof logoUrls }) => {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        throw new Error("Failed to upload image");
      }
      const data = await res.json();
      if (logoType) {
        setLogoUrls(prev => ({ ...prev, [logoType]: data.url }));
      }
      return data.url;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add resetVoteMutation
  const resetVoteMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("POST", `/api/users/${userId}/reset-vote`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Success",
        description: "User's vote has been reset successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetAllVotesMutation = useMutation({
    mutationFn: async () => {
      const userPromises = users
        .filter(user => user.hasVoted)
        .map(user => resetVoteMutation.mutateAsync(user.id));
      await Promise.all(userPromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Success",
        description: "All votes have been reset successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  const { candidates, positions, partyLists, systemSettings, votingStats, users } = data;

  const getCandidatesByPosition = (positionId: number) => {
    return candidates.filter((c) => c.positionId === positionId);
  };

  const getPartyName = (partyId: number) => {
    return partyLists.find((p) => p.id === partyId)?.name || "";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            {editingLogos ? (
              <div className="flex flex-col gap-4 w-[600px]">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label>Left Logo</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            uploadImageMutation.mutate({ file, logoType: "leftLogoUrl" });
                          }
                        }}
                      />
                      {logoUrls.leftLogoUrl && (
                        <img
                          src={logoUrls.leftLogoUrl}
                          alt="Left Logo Preview"
                          className="w-10 h-10 object-contain"
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <Label>Right Logo</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            uploadImageMutation.mutate({ file, logoType: "rightLogoUrl" });
                          }
                        }}
                      />
                      {logoUrls.rightLogoUrl && (
                        <img
                          src={logoUrls.rightLogoUrl}
                          alt="Right Logo Preview"
                          className="w-10 h-10 object-contain"
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Splash Screen Logo</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          uploadImageMutation.mutate({ file, logoType: "splashLogoUrl" });
                        }
                      }}
                    />
                    {logoUrls.splashLogoUrl && (
                      <img
                        src={logoUrls.splashLogoUrl}
                        alt="Splash Logo Preview"
                        className="w-10 h-10 object-contain"
                      />
                    )}
                  </div>
                </div>
                <div>
                  <Label>Voting Page Logo</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          uploadImageMutation.mutate({ file, logoType: "votingLogoUrl" });
                        }
                      }}
                    />
                    {logoUrls.votingLogoUrl && (
                      <img
                        src={logoUrls.votingLogoUrl}
                        alt="Voting Logo Preview"
                        className="w-10 h-10 object-contain"
                      />
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => updateSystemSettingsMutation.mutate(logoUrls)}
                    disabled={updateSystemSettingsMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingLogos(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <img
                  src={systemSettings.leftLogoUrl}
                  alt="Left Logo"
                  className="h-8 w-8 cursor-pointer"
                  onClick={() => {
                    setLogoUrls({
                      leftLogoUrl: systemSettings.leftLogoUrl,
                      rightLogoUrl: systemSettings.rightLogoUrl,
                      splashLogoUrl: systemSettings.splashLogoUrl,
                      votingLogoUrl: systemSettings.votingLogoUrl //Added votingLogoUrl
                    });
                    setEditingLogos(true);
                  }}
                />
                ARSC Voting System - Admin Dashboard
                <img
                  src={systemSettings.rightLogoUrl}
                  alt="Right Logo"
                  className="h-8 w-8 cursor-pointer"
                  onClick={() => {
                    setLogoUrls({
                      leftLogoUrl: systemSettings.leftLogoUrl,
                      rightLogoUrl: systemSettings.rightLogoUrl,
                      splashLogoUrl: systemSettings.splashLogoUrl,
                      votingLogoUrl: systemSettings.votingLogoUrl //Added votingLogoUrl
                    });
                    setEditingLogos(true);
                  }}
                />
              </>
            )}
          </h1>
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline">Back to Voting</Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              Logout
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Manage Positions</CardTitle>
              <CardDescription>Add new positions for candidates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    value={newPosition.name}
                    onChange={(e) => setNewPosition({ ...newPosition, name: e.target.value })}
                    placeholder="Enter position name"
                  />
                  <Select
                    value={newPosition.category}
                    onValueChange={(value) => setNewPosition({ ...newPosition, category: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Executive">Executive</SelectItem>
                      <SelectItem value="Legislative">Legislative</SelectItem>
                      <SelectItem value="Departmental">Departmental</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="maxVotes">Max Votes:</Label>
                    <Input
                      id="maxVotes"
                      type="number"
                      min="1"
                      value={newPosition.maxVotes}
                      onChange={(e) => setNewPosition({ ...newPosition, maxVotes: parseInt(e.target.value) || 1 })}
                      className="w-24"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => createPositionMutation.mutate(newPosition)}
                  disabled={createPositionMutation.isPending || !newPosition.name.trim()}
                >
                  Add Position
                </Button>
              </div>
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Current Positions:</h3>
                <div className="space-y-2">
                  {positions.map((position) => (
                    <div key={position.id} className="flex items-center justify-between border rounded p-2">
                      <div className="space-x-2">
                        <span className="font-medium">{position.name}</span>
                        <Badge>{position.category}</Badge>
                        <span className="text-sm text-muted-foreground">
                          Max votes: {position.maxVotes}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setPositionToDelete(position.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <AlertDialog open={positionToDelete !== null} onOpenChange={setOpen => setPositionToDelete(setOpen ? null : positionToDelete)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone if there are no candidates assigned to this position.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setPositionToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        if (positionToDelete) {
                          deletePositionMutation.mutate(positionToDelete);
                        }
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Manage Candidates</CardTitle>
              <CardDescription>Add or edit candidates for the election</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Button onClick={() => setIsAddingCandidate(true)} disabled={isAddingCandidate}>
                  Add New Candidate
                </Button>
              </div>
              {isAddingCandidate && (
                <div className="border rounded-lg p-4 space-y-4 mb-6">
                  <Input
                    value={newCandidate.name}
                    onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                    placeholder="Candidate Name"
                  />
                  <div className="space-y-2">
                    <Label>Candidate Image</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            uploadImageMutation.mutate(
                              { file },
                              {
                                onSuccess: (url) => setNewCandidate({ ...newCandidate, imageUrl: url }),
                              }
                            );
                          }
                        }}
                      />
                      {newCandidate.imageUrl && (
                        <img
                          src={newCandidate.imageUrl}
                          alt="Candidate Preview"
                          className="w-10 h-10 object-cover rounded"
                        />
                      )}
                    </div>
                  </div>
                  <Select
                    value={newCandidate.positionId.toString()}
                    onValueChange={(value) => setNewCandidate({ ...newCandidate, positionId: parseInt(value, 10) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map((position) => (
                        <SelectItem key={position.id} value={position.id.toString()}>
                          {position.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={newCandidate.partyListId.toString()}
                    onValueChange={(value) => setNewCandidate({ ...newCandidate, partyListId: parseInt(value, 10) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select party" />
                    </SelectTrigger>
                    <SelectContent>
                      {partyLists.map((party) => (
                        <SelectItem key={party.id} value={party.id.toString()}>
                          {party.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="space-y-2">
                    <Label>School Levels</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "elementary", label: "Elementary" },
                        { id: "junior_high", label: "Junior High School" },
                        { id: "senior_high", label: "Senior High School" }
                      ].map((level) => (
                        <label key={level.id} className="flex items-center space-x-2 border rounded p-2">
                          <input
                            type="checkbox"
                            checked={newCandidate.schoolLevels.includes(level.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewCandidate({
                                  ...newCandidate,
                                  schoolLevels: [...newCandidate.schoolLevels, level.id],
                                  gradeLevels: [], // Reset grade levels when school levels change
                                });
                              } else {
                                setNewCandidate({
                                  ...newCandidate,
                                  schoolLevels: newCandidate.schoolLevels.filter((l) => l !== level.id),
                                  gradeLevels: [], // Reset grade levels when school levels change
                                });
                              }
                            }}
                          />
                          <span>{level.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Grade Levels</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {(newCandidate.schoolLevels.includes("elementary") ? ["3", "4", "5", "6"] : [])
                        .concat(newCandidate.schoolLevels.includes("junior_high") ? ["7", "8", "9", "10"] : [])
                        .concat(newCandidate.schoolLevels.includes("senior_high") ? ["11", "12"] : [])
                        .map((grade) => (
                          <label key={grade} className="flex items-center space-x-2 border rounded p-2">
                            <input
                              type="checkbox"
                              checked={newCandidate.gradeLevels.includes(grade)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewCandidate({
                                    ...newCandidate,
                                    gradeLevels: [...newCandidate.gradeLevels, grade],
                                  });
                                } else {
                                  setNewCandidate({
                                    ...newCandidate,
                                    gradeLevels: newCandidate.gradeLevels.filter((g) => g !== grade),
                                  });
                                }
                              }}
                            />
                            <span>Grade {grade}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => createCandidateMutation.mutate(newCandidate)}
                      disabled={
                        createCandidateMutation.isPending ||
                        !newCandidate.name ||
                        !newCandidate.positionId ||
                        !newCandidate.partyListId ||
                        !newCandidate.schoolLevels.length //Check if schoolLevels is not empty
                      }
                    >
                      {createCandidateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Create Candidate
                    </Button>
                    <Button variant="outline" onClick={() => setIsAddingCandidate(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {positions.map((position) => {
                const positionCandidates = getCandidatesByPosition(position.id);
                const totalVotes = positionCandidates.reduce((sum, c) => sum + c.voteCount, 0);

                return (
                  <Card key={position.id} className="mb-6">
                    <CardHeader>
                      <CardTitle>{position.name}</CardTitle>
                      <CardDescription>
                        Total votes cast: {totalVotes}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {positionCandidates.map((candidate) => (
                        <div key={candidate.id} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="space-y-2 flex-1">
                              {editingCandidate?.id === candidate.id ? (
                                <div className="space-y-4">
                                  <Input
                                    value={editingCandidate.name}
                                    onChange={(e) =>
                                      setEditingCandidate({
                                        ...editingCandidate,
                                        name: e.target.value,
                                      })
                                    }
                                    placeholder="Candidate Name"
                                  />
                                  <div className="space-y-2">
                                    <Label>Candidate Image</Label>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            uploadImageMutation.mutate(
                                              { file },
                                              {
                                                onSuccess: (url) =>
                                                  setEditingCandidate({
                                                    ...editingCandidate,
                                                    imageUrl: url,
                                                  }),
                                              }
                                            );
                                          }
                                        }}
                                      />
                                      {editingCandidate.imageUrl && (
                                        <img
                                          src={editingCandidate.imageUrl}
                                          alt="Candidate Preview"
                                          className="w-10 h-10 object-cover rounded"
                                        />
                                      )}
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>School Levels</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                      {[
                                        { id: "elementary", label: "Elementary" },
                                        { id: "junior_high", label: "Junior High School" },
                                        { id: "senior_high", label: "Senior High School" }
                                      ].map((level) => (
                                        <label key={level.id} className="flex items-center space-x-2 border rounded p-2">
                                          <input
                                            type="checkbox"
                                            checked={editingCandidate.schoolLevels.includes(level.id)}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setEditingCandidate({
                                                  ...editingCandidate,
                                                  schoolLevels: [...editingCandidate.schoolLevels, level.id],
                                                  gradeLevels: [], // Reset grade levels when school levels change
                                                });
                                              } else {
                                                setEditingCandidate({
                                                  ...editingCandidate,
                                                  schoolLevels: editingCandidate.schoolLevels.filter((l) => l !== level.id),
                                                  gradeLevels: [], // Reset grade levels when school levels change
                                                });
                                              }
                                            }}
                                          />
                                          <span>{level.label}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Grade Levels</Label>
                                    <div className="grid grid-cols-5 gap-2">
                                      {(editingCandidate.schoolLevels.includes("elementary") ? ["3", "4", "5", "6"] : [])
                                        .concat(editingCandidate.schoolLevels.includes("junior_high") ? ["7", "8", "9", "10"] : [])
                                        .concat(editingCandidate.schoolLevels.includes("senior_high") ? ["11", "12"] : [])
                                        .map((grade) => (
                                          <label key={grade} className="flex items-center space-x-2 border rounded p-2">
                                            <input
                                              type="checkbox"
                                              checked={editingCandidate.gradeLevels.includes(grade)}
                                              onChange={(e) => {
                                                if (e.target.checked) {
                                                  setEditingCandidate({
                                                    ...editingCandidate,
                                                    gradeLevels: [...editingCandidate.gradeLevels, grade],
                                                  });
                                                } else {
                                                  setEditingCandidate({
                                                    ...editingCandidate,
                                                    gradeLevels: editingCandidate.gradeLevels.filter((g) => g !== grade),
                                                  });
                                                }
                                              }}
                                            />
                                            <span>Grade {grade}</span>
                                          </label>
                                        ))}
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => updateCandidateMutation.mutate(editingCandidate)}
                                      disabled={updateCandidateMutation.isPending}
                                    >
                                      <Save className="h-4 w-4 mr-2" />
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingCandidate(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex justify-between">
                                    <span className="font-medium">
                                      {candidate.name} ({getPartyName(candidate.partyListId)})
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setEditingCandidate(candidate)}
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => deleteCandidateMutation.mutate(candidate.id)}
                                        disabled={deleteCandidateMutation.isPending}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  <img
                                    src={candidate.imageUrl}
                                    alt={candidate.name}
                                    className="w-32 h-32 object-cover rounded-md"
                                  />
                                  <div className="text-sm text-muted-foreground">
                                    School Levels: {candidate.schoolLevels.map(level => {
                                      const labels = {
                                        elementary: "Elementary",
                                        junior_high: "Junior High School",
                                        senior_high: "Senior High School"
                                      };
                                      return labels[level as keyof typeof labels] || level.replace('_', ' ');
                                    }).join(", ")}
                                    {candidate.gradeLevels && (
                                      <span>
                                        , Grades: {candidate.gradeLevels.join(", ")}
                                      </span>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="ml-4 text-right">
                              <span>
                                {candidate.voteCount} votes (
                                {totalVotes
                                  ? Math.round((candidate.voteCount / totalVotes) * 100)
                                  : 0}
                                %)
                              </span>
                              <Progress
                                value={
                                  totalVotes
                                    ? (candidate.voteCount / totalVotes) * 100
                                    : 0
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}

            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Party List Management</CardTitle>
              <CardDescription>Edit party names and colors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {partyLists.map((party) => (
                  <div key={party.id} className="flex flex-col gap-4 p-4 border rounded">
                    {editingPartyList?.id === party.id ? (
                      <div className="space-y-4">
                        <Input
                          value={editingPartyList.name}
                          onChange={(e) =>
                            setEditingPartyList({
                              ...editingPartyList,
                              name: e.target.value,
                            })
                          }
                          placeholder="Party Name"
                        />
                        <div className="space-y-2">
                          <Label>Party Logo</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  uploadImageMutation.mutate(
                                    { file },
                                    {
                                      onSuccess: (url) =>
                                        setEditingPartyList({
                                          ...editingPartyList,
                                          logoUrl: url
                                        })
                                    }
                                  );
                                }
                              }}
                            />
                            {editingPartyList.logoUrl && (
                              <img
                                src={editingPartyList.logoUrl}
                                alt="Party Logo Preview"
                                className="w-24 h-24 object-contain rounded"
                              />
                            )}
                          </div>
                        </div>
                        <div>
                          <Label>Party Color</Label>
                          <ChromePicker
                            color={editingPartyList.color}
                            onChange={(color) =>
                              setEditingPartyList({
                                ...editingPartyList,
                                color: color.hex,
                              })
                            }
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updatePartyListMutation.mutate(editingPartyList)}
                            disabled={updatePartyListMutation.isPending}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingPartyList(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{party.name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingPartyList(party)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {party.logoUrl && (
                          <img
                            src={party.logoUrl}
                            alt={party.name}
                            className="w-48 h-48 object-contain mx-auto"
                          />
                        )}
                        <div
                          className="w-full h-8 rounded"
                          style={{ backgroundColor: party.color }}
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage student accounts and mass registration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Mass Registration</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Enter one student per line in the format: reference_number, student_name
                  </p>
                  <Textarea
                    value={massRegisterInput}
                    onChange={(e) => setMassRegisterInput(e.target.value)}
                    placeholder="Example:&#13;&#10;2024001, John Doe&#13;&#10;2024002, Jane Smith"
                    className="min-h-[200px] mb-4"
                  />
                  <Button
                    onClick={() => massRegisterMutation.mutate(massRegisterInput)}
                    disabled={massRegisterMutation.isPending || !massRegisterInput.trim()}
                  >
                    {massRegisterMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Register Students
                  </Button>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Student List</h3>
                  <div className="border rounded-lg divide-y">
                    {users?.filter(user => !user.isAdmin).map((user) => (
                      <div key={user.id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{user.studentName}</p>
                          <p className="text-sm text-muted-foreground">
                            Ref: {user.referenceNumber} | Level: {user.schoolLevel ? user.schoolLevel.replace('_', ' ') : 'Not set'}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant={user.hasVoted ? "default" : "secondary"}>
                            {user.hasVoted ? "Voted" : "Not Voted"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setUserToDelete(user.id);
                              setIsDeleteUserDialogOpen(true);
                            }}
                            disabled={user.isAdmin}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resetVoteMutation.mutate(user.id)}
                            disabled={!user.hasVoted || resetVoteMutation.isPending}
                          >
                            Reset Vote
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <AlertDialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete User?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the user account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (userToDelete) {
                      deleteUserMutation.mutate(userToDelete);
                    }
                    setIsDeleteUserDialogOpen(false);
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="mb-8">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Vote Analytics</CardTitle>
                  <CardDescription>
                    Track voting progress and results
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => resetAllVotesMutation.mutate()}
                  disabled={resetAllVotesMutation.isPending || votingStats.votedCount === 0}
                >
                  Reset All Votes
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Total Votes Cast</span>
                    <span>
                      {votingStats.votedCount} / {votingStats.totalVoters}
                    </span>
                  </div>
                  <Progress
                    value={
                      (votingStats.votedCount / votingStats.totalVoters) * 100
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {positions.map((position) => {
          const positionCandidates = getCandidatesByPosition(position.id);
          const totalVotes = positionCandidates.reduce((sum, c) => sum + c.voteCount, 0);

          return (
            <Card key={position.id}>
              <CardHeader>
                <CardTitle>{position.name}</CardTitle>
                <CardDescription>
                  Total votes cast: {totalVotes}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {positionCandidates.map((candidate) => (
                  <div key={candidate.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="space-y-2 flex-1">
                        {editingCandidate?.id === candidate.id ? (
                          <div className="space-y-4">
                            <Input
                              value={editingCandidate.name}
                              onChange={(e) =>
                                setEditingCandidate({
                                  ...editingCandidate,
                                  name: e.target.value,
                                })
                              }
                              placeholder="Candidate Name"
                            />
                            <div className="space-y-2">
                              <Label>Candidate Image</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      uploadImageMutation.mutate(
                                        { file },
                                        {
                                          onSuccess: (url) =>
                                            setEditingCandidate({
                                              ...editingCandidate,
                                              imageUrl: url,
                                            }),
                                        }
                                      );
                                    }
                                  }}
                                />
                                {editingCandidate.imageUrl && (
                                  <img
                                    src={editingCandidate.imageUrl}
                                    alt="Candidate Preview"
                                    className="w-10 h-10 object-cover rounded"
                                  />
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>School Levels</Label>
                              <div className="grid grid-cols-3 gap-2">
                                {[
                                  { id: "elementary", label: "Elementary" },
                                  { id: "junior_high", label: "Junior High School" },
                                  { id: "senior_high", label: "Senior High School" }
                                ].map((level) => (
                                  <label key={level.id} className="flex items-center space-x-2 border rounded p-2">
                                    <input
                                      type="checkbox"
                                      checked={editingCandidate.schoolLevels.includes(level.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setEditingCandidate({
                                            ...editingCandidate,
                                            schoolLevels: [...editingCandidate.schoolLevels, level.id],
                                            gradeLevels: [], // Reset grade levels when school levels change
                                          });
                                        } else {
                                          setEditingCandidate({
                                            ...editingCandidate,
                                            schoolLevels: editingCandidate.schoolLevels.filter((l) => l !== level.id),
                                            gradeLevels: [], // Reset grade levels when school levels change
                                          });
                                        }
                                      }}
                                    />
                                    <span>{level.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Grade Levels</Label>
                              <div className="grid grid-cols-5 gap-2">
                                {(editingCandidate.schoolLevels.includes("elementary") ? ["3", "4", "5", "6"] : [])
                                  .concat(editingCandidate.schoolLevels.includes("junior_high") ? ["7", "8", "9", "10"] : [])
                                  .concat(editingCandidate.schoolLevels.includes("senior_high") ? ["11", "12"] : [])
                                  .map((grade) => (
                                    <label key={grade} className="flex items-center space-x-2 border rounded p-2">
                                      <input
                                        type="checkbox"
                                        checked={editingCandidate.gradeLevels.includes(grade)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setEditingCandidate({
                                              ...editingCandidate,
                                              gradeLevels: [...editingCandidate.gradeLevels, grade],
                                            });
                                          } else {
                                            setEditingCandidate({
                                              ...editingCandidate,
                                              gradeLevels: editingCandidate.gradeLevels.filter((g) => g !== grade),
                                            });
                                          }
                                        }}
                                      />
                                      <span>Grade {grade}</span>
                                    </label>
                                  ))}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => updateCandidateMutation.mutate(editingCandidate)}
                                disabled={updateCandidateMutation.isPending}
                              >
                                <Save className="h-4 w-4 mr-2" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingCandidate(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between">
                              <span className="font-medium">
                                {candidate.name} ({getPartyName(candidate.partyListId)})
                              </span>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingCandidate(candidate)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteCandidateMutation.mutate(candidate.id)}
                                  disabled={deleteCandidateMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <img
                              src={candidate.imageUrl}
                              alt={candidate.name}
                              className="w-32 h-32 object-cover rounded-md"
                            />
                            <div className="text-sm text-muted-foreground">
                              School Levels: {candidate.schoolLevels.map(level => {
                                const labels = {
                                  elementary: "Elementary",
                                  junior_high: "Junior High School",
                                  senior_high: "Senior High School"
                                };
                                return labels[level as keyof typeof labels] || level.replace('_', ' ');
                              }).join(", ")}
                              {candidate.gradeLevels && (
                                <span>
                                  , Grades: {candidate.gradeLevels.join(", ")}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="ml-4 text-right">
                        <span>
                          {candidate.voteCount} votes (
                          {totalVotes
                            ? Math.round((candidate.voteCount / totalVotes) * 100)
                            : 0}
                          %)
                        </span>
                        <Progress
                          value={
                            totalVotes
                              ? (candidate.voteCount / totalVotes) * 100
                              : 0
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}