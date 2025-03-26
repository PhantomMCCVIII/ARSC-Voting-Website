import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Candidate, PartyList, Position } from "@shared/schema";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

type VoteAnalyticsProps = {
  candidates: Candidate[];
  positions: Position[];
  partyLists: PartyList[];
  totalVoters: number;
  votedCount: number;
};

export function VoteAnalytics({
  candidates,
  positions,
  partyLists,
  totalVoters,
  votedCount,
}: VoteAnalyticsProps) {
  // Get candidates for a specific position
  const getCandidatesByPosition = (positionId: number) => {
    return candidates.filter((c) => c.positionId === positionId);
  };

  // Get party name
  const getPartyName = (partyId: number) => {
    return partyLists.find((p) => p.id === partyId)?.name || "";
  };

  // Calculate party-wise total votes
  const partyVotes = partyLists.map((party) => ({
    name: party.name,
    votes: candidates
      .filter((c) => c.partyListId === party.id)
      .reduce((sum, c) => sum + c.voteCount, 0),
  }));

  // Voter turnout percentage
  const turnoutPercentage = ((votedCount / totalVoters) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Voter Turnout Card */}
      <Card>
        <CardHeader>
          <CardTitle>Voter Turnout</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">
              {turnoutPercentage}%
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {votedCount} out of {totalVoters} have voted
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Party-wise Vote Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Party-wise Vote Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={partyVotes}
                  dataKey="votes"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  label
                >
                  {partyVotes.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Position-wise Vote Distribution */}
      {positions.map((position) => {
        const positionCandidates = getCandidatesByPosition(position.id);
        const data = positionCandidates.map((candidate) => ({
          name: candidate.name,
          votes: candidate.voteCount,
          party: getPartyName(candidate.partyListId),
        }));

        return (
          <Card key={position.id}>
            <CardHeader>
              <CardTitle>{position.name} - Vote Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="votes" fill="#8884d8" name="Votes" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}