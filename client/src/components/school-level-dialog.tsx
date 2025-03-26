import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SchoolLevel } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { School } from "lucide-react";
import { useState } from "react";
import { GradeLevelDialog } from "./grade-level-dialog";
import { Label } from "@/components/ui/label";

type SchoolLevelDialogProps = {
  userId: number;
  open: boolean;
  onComplete: () => void;
};

export function SchoolLevelDialog({ userId, open, onComplete }: SchoolLevelDialogProps) {
  const { toast } = useToast();
  const [showGradeLevel, setShowGradeLevel] = useState(false);
  const [selectedSchoolLevel, setSelectedSchoolLevel] = useState<SchoolLevel | null>(null);

  const updateSchoolLevelMutation = useMutation({
    mutationFn: async (schoolLevel: SchoolLevel) => {
      await apiRequest("PATCH", `/api/users/${userId}/school-level`, { schoolLevel });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "School level selected",
        description: "Now select your grade level",
      });
      setShowGradeLevel(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSelect = (level: SchoolLevel) => {
    setSelectedSchoolLevel(level);
    updateSchoolLevelMutation.mutate(level);
  };

  const handleGradeLevelComplete = () => {
    setShowGradeLevel(false);
    setSelectedSchoolLevel(null);
    onComplete();
  };

  const schoolLevels: { id: SchoolLevel; label: string }[] = [
    { id: "elementary", label: "Elementary School" },
    { id: "junior_high", label: "Junior High School" },
    { id: "senior_high", label: "Senior High School" },
  ];

  return (
    <>
      <Dialog open={open && !showGradeLevel} onOpenChange={onComplete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              Select Your School Level
            </DialogTitle>
            <DialogDescription>
              Please select your school level to see the relevant candidates for your grade.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>School Level</Label>
            <div className="grid grid-cols-1 gap-2">
              {schoolLevels.map((level) => (
                <label key={level.id} className="flex items-center space-x-2 border rounded p-4">
                  <input
                    type="radio"
                    name="schoolLevel"
                    checked={selectedSchoolLevel === level.id}
                    onChange={() => handleSelect(level.id)}
                    disabled={updateSchoolLevelMutation.isPending}
                  />
                  <span className="text-lg">{level.label}</span>
                </label>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedSchoolLevel && (
        <GradeLevelDialog
          userId={userId}
          schoolLevel={selectedSchoolLevel}
          open={showGradeLevel}
          onComplete={handleGradeLevelComplete}
        />
      )}
    </>
  );
}