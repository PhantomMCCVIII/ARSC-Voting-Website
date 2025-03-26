import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { PartyList, Candidate } from "@shared/schema";
import { X, Edit2, Save, Upload } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type PartyListModalProps = {
  partyList: PartyList | null;
  candidates: Candidate[];
  open: boolean;
  onClose: () => void;
};

export function PartyListModal({ partyList, candidates, open, onClose }: PartyListModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedPartyList, setEditedPartyList] = useState<Partial<PartyList>>({});

  const updatePartyListMutation = useMutation({
    mutationFn: async (updates: Partial<PartyList>) => {
      if (!partyList) return;
      await apiRequest("PATCH", `/api/party-list/${partyList.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Party list updated successfully",
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

  const handleSave = () => {
    if (Object.keys(editedPartyList).length > 0) {
      updatePartyListMutation.mutate(editedPartyList);
    }
  };

  const handleLogoUpload = async (file: File | null) => {
    if (!file || !partyList) return;

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const response = await fetch(`/api/party-list/${partyList.id}/logo`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload logo');

      const data = await response.json();
      setEditedPartyList({ 
        ...editedPartyList, 
        logoUrl: data.logoUrl 
      });
      updatePartyListMutation.mutate({ 
        ...editedPartyList, 
        logoUrl: data.logoUrl 
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload logo",
        variant: "destructive",
      });
    }
  };

  const handlePlatformImageUpload = async (file: File | null) => {
    if (!file || !partyList) return;

    const formData = new FormData();
    formData.append('platformImage', file);

    try {
      const response = await fetch(`/api/party-list/${partyList.id}/platform-image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload platform image');

      const data = await response.json();
      setEditedPartyList({ 
        ...editedPartyList, 
        platformImageUrl: data.platformImageUrl 
      });
      updatePartyListMutation.mutate({ 
        ...editedPartyList, 
        platformImageUrl: data.platformImageUrl 
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload platform image",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !partyList) return;

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('images', file);
    });

    try {
      const response = await fetch(`/api/party-list/${partyList.id}/images`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload images');

      const data = await response.json();
      setEditedPartyList({ 
        ...editedPartyList, 
        partyListImages: [...(partyList.partyListImages || []), ...data.imageUrls] 
      });
      updatePartyListMutation.mutate({ 
        ...editedPartyList, 
        partyListImages: [...(partyList.partyListImages || []), ...data.imageUrls] 
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload images",
        variant: "destructive",
      });
    }
  };

  const handleDeleteImage = async (index: number) => {
    if (!partyList) return;

    try {
      const updatedImages = [...(partyList.partyListImages || [])];
      updatedImages.splice(index, 1);

      await updatePartyListMutation.mutateAsync({ 
        partyListImages: updatedImages 
      });

      setEditedPartyList({ 
        ...editedPartyList, 
        partyListImages: updatedImages 
      });

      toast({
        title: "Success",
        description: "Image deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      });
    }
  };

  if (!partyList) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={partyList.logoUrl || ''}
                  alt={`${partyList.name} Logo`}
                  className="h-16 w-16 rounded-full"
                  style={{ backgroundColor: partyList.color }}
                />
                {user?.isAdmin && isEditing && (
                  <Input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => handleLogoUpload(e.target.files?.[0] || null)}
                  />
                )}
              </div>
              {isEditing ? (
                <Input
                  value={editedPartyList.name || partyList.name}
                  onChange={(e) => setEditedPartyList({ ...editedPartyList, name: e.target.value })}
                  className="text-2xl font-bold"
                />
              ) : (
                <DialogTitle className="text-2xl">{partyList.name}</DialogTitle>
              )}
            </div>
            <div className="flex items-center gap-2">
              {user?.isAdmin && (
                isEditing ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSave}
                    disabled={updatePartyListMutation.isPending}
                  >
                    <Save className="h-6 w-6" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="h-6 w-6" />
                  </Button>
                )
              )}
              <button
                onClick={onClose}
                className="rounded-full p-2 hover:bg-gray-100 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          <section>
            <h3 className="text-lg font-semibold mb-3">Party Platform</h3>
            <div className="relative">
              {partyList.platformImageUrl ? (
                <div className="relative">
                  <img
                    src={partyList.platformImageUrl}
                    alt="Party Platform"
                    className="w-full rounded-lg shadow-sm"
                  />
                  {user?.isAdmin && isEditing && (
                    <div className="absolute top-2 right-2 flex gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="bg-white"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            handlePlatformImageUpload(file || null);
                          };
                          input.click();
                        }}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => {
                          updatePartyListMutation.mutate({ 
                            ...editedPartyList,
                            platformImageUrl: null 
                          });
                          setEditedPartyList({
                            ...editedPartyList,
                            platformImageUrl: null
                          });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-500 relative">
                  No platform image available
                  {user?.isAdmin && isEditing && (
                    <div className="absolute top-2 right-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="bg-white"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            handlePlatformImageUpload(file || null);
                          };
                          input.click();
                        }}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Party Members</h3>
              {user?.isAdmin && isEditing && (
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="max-w-xs"
                />
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(partyList.partyListImages || []).map((imageUrl, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative aspect-video"
                >
                  <img
                    src={imageUrl}
                    alt={`${partyList.name} Group ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  {user?.isAdmin && isEditing && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => handleDeleteImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}