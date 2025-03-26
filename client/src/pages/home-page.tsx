import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PartyList, SystemSettings } from "@shared/schema";
import { Link } from "wouter";
import { Vote, Loader2 } from "lucide-react";
import { PartyListModal } from "@/components/party-list-modal";
import { SchoolLevelDialog } from "@/components/school-level-dialog";

type CandidateData = {
  partyLists: PartyList[];
  systemSettings: SystemSettings;
};

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [selectedPartyList, setSelectedPartyList] = useState<PartyList | null>(null);
  const [showSchoolLevelDialog, setShowSchoolLevelDialog] = useState(false);

  const { data, isLoading } = useQuery<CandidateData>({
    queryKey: ["/api/candidates"],
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  const { partyLists, systemSettings } = data;

  const handleStartVoting = () => {
    if (!user?.schoolLevel || !user?.gradeLevel) {
      setShowSchoolLevelDialog(true);
    } else {
      window.location.href = "/vote";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="relative">
          <div className="flex justify-center items-center mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <img
                src={systemSettings.leftLogoUrl}
                alt="Left Logo"
                className="h-8 w-8"
              />
              ARSC Voting System
              <img
                src={systemSettings.rightLogoUrl}
                alt="Right Logo"
                className="h-8 w-8"
              />
            </h1>
          </div>

          <div className="absolute right-0 top-0 flex items-center gap-4">
            {user?.isAdmin && (
              <Link href="/admin">
                <Button variant="outline">Admin Dashboard</Button>
              </Link>
            )}
            <Button
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              Logout
            </Button>
          </div>
        </div>

        <div className="mb-12">
            <h2 className="text-2xl font-bold border-b pb-2 mb-6 text-center">MEET YOUR PARTYLIST</h2>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6 xl:gap-8 w-full max-w-6xl mx-auto" style={{ marginLeft: '35px' }}>
                {partyLists.map((party) => (
                  <motion.button
                    key={party.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-gradient-to-b from-white to-gray-50 p-6 rounded-lg shadow-sm border cursor-pointer w-[280px] text-left hover:shadow-md transition-all"
                    onClick={() => setSelectedPartyList(party)}
                  >
                    <div className="flex flex-col items-center text-center">
                      <img
                        src={party.logoUrl || ''}
                        alt={`${party.name} Logo`}
                        className="h-24 w-24 rounded-full mb-4"
                        style={{ backgroundColor: party.color }}
                      />
                      <h3 className="text-lg font-semibold">{party.name}</h3>
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                        Click to view platform and candidates
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
            <div className="flex justify-center items-center mt-12 w-full">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartVoting}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all font-semibold text-lg flex items-center gap-2"
              >
                <Vote className="h-5 w-5" />
                Ready to Vote
              </motion.button>
            </div>
          </div>

        <PartyListModal
          partyList={selectedPartyList}
          candidates={[]}
          open={!!selectedPartyList}
          onClose={() => setSelectedPartyList(null)}
        />

        {user && (
          <SchoolLevelDialog
            userId={user.id}
            open={showSchoolLevelDialog}
            onComplete={() => setShowSchoolLevelDialog(false)}
          />
        )}
      </div>
    </div>
  );
}