import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GradeLevel } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { School } from "lucide-react";

type GradeLevelDialogProps = {
  userId: number;
  schoolLevel: string;
  open: boolean;
  onComplete: () => void;
};

const gradeRanges = {
  elementary: ["3", "4", "5", "6"],
  junior_high: ["7", "8", "9", "10"],
  senior_high: ["11", "12"],
} as const;

export function GradeLevelDialog({ userId, schoolLevel, open, onComplete }: GradeLevelDialogProps) {
  const { toast } = useToast();

  const updateGradeLevelMutation = useMutation({
    mutationFn: async (gradeLevel: GradeLevel) => {
      await apiRequest("PATCH", `/api/users/${userId}/grade-level`, { gradeLevel });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Grade level selected",
        description: "You can now start voting!",
      });
      onComplete();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSelect = (grade: GradeLevel) => {
    updateGradeLevelMutation.mutate(grade);
  };

  const grades = gradeRanges[schoolLevel as keyof typeof gradeRanges] || [];
  const rows = Math.ceil(grades.length / 2);

  return (
    <Dialog open={open} onOpenChange={onComplete}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Select Your Grade Level
          </DialogTitle>
          <DialogDescription>
            Please select your grade level to see the relevant candidates for your grade.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          {grades.map((grade) => (
            <Button
              key={grade}
              variant="outline"
              className="h-16 text-lg"
              onClick={() => handleSelect(grade as GradeLevel)}
              disabled={updateGradeLevelMutation.isPending}
            >
              Grade {grade}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}