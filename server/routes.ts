import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { SchoolLevel, GradeLevel } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";

// Configure multer for handling file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const multerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: multerStorage });

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Serve uploaded files statically
  app.use("/uploads", express.static(uploadDir));

  // Handle logo upload for party list
  app.post("/api/party-list/:id/logo", upload.single("logo"), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user!;
    if (!user.isAdmin) {
      return res.status(403).json({ message: "Only admins can upload logos" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const partyListId = parseInt(req.params.id);
    const logoUrl = `/uploads/${req.file.filename}`;

    try {
      await storage.updatePartyList(partyListId, { logoUrl });
      res.json({ logoUrl });
    } catch (error) {
      console.error('Error uploading logo:', error);
      res.status(500).json({ message: "Failed to update party list logo" });
    }
  });

  // Handle multiple image uploads for party list
  app.post("/api/party-list/:id/images", upload.array("images"), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user!;
    if (!user.isAdmin) {
      return res.status(403).json({ message: "Only admins can upload images" });
    }

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const partyListId = parseInt(req.params.id);
    const imageUrls = (req.files as Express.Multer.File[]).map(file => `/uploads/${file.filename}`);

    try {
      const partyList = await storage.getPartyList(partyListId);
      const updatedImages = [...(partyList.partyListImages || []), ...imageUrls];
      await storage.updatePartyList(partyListId, { partyListImages: updatedImages });
      res.json({ imageUrls });
    } catch (error) {
      console.error('Error uploading images:', error);
      res.status(500).json({ message: "Failed to update party list images" });
    }
  });

  // Handle platform image upload for party list
  app.post("/api/party-list/:id/platform-image", upload.single("platformImage"), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user!;
    if (!user.isAdmin) {
      return res.status(403).json({ message: "Only admins can upload platform images" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const partyListId = parseInt(req.params.id);
    const platformImageUrl = `/uploads/${req.file.filename}`;

    try {
      await storage.updatePartyList(partyListId, { platformImageUrl });
      res.json({ platformImageUrl });
    } catch (error) {
      console.error('Error uploading platform image:', error);
      res.status(500).json({ message: "Failed to update party list platform image" });
    }
  });

  app.post("/api/upload", upload.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });

  app.get("/api/candidates", async (req, res) => {
    const schoolLevel = req.user?.schoolLevel as SchoolLevel | undefined;
    const gradeLevel = req.user?.gradeLevel as GradeLevel | undefined;

    try {
      const [candidates, positions, partyLists, systemSettings, users] = await Promise.all([
        gradeLevel
          ? storage.getCandidatesByGradeLevel(gradeLevel)
          : schoolLevel
            ? storage.getCandidatesBySchoolLevel(schoolLevel)
            : storage.getCandidates(),
        storage.getPositions(),
        storage.getPartyLists(),
        storage.getSystemSettings(),
        storage.getUsers(),
      ]);

      const totalVoters = users.filter(user => !user.isAdmin).length;
      const votedCount = users.filter(user => user.hasVoted).length;

      // Debug logging
      console.log('Users with voting status:', users.map(user => ({
        id: user.id,
        name: user.studentName,
        hasVoted: user.hasVoted
      })));

      res.json({
        candidates,
        positions,
        partyLists,
        systemSettings,
        users: users.map(user => ({
          id: user.id,
          referenceNumber: user.referenceNumber,
          studentName: user.studentName,
          votes: user.votes,
          schoolLevel: user.schoolLevel,
          gradeLevel: user.gradeLevel,
          isAdmin: user.isAdmin,
          hasVoted: user.hasVoted
        })),
        votingStats: {
          totalVoters,
          votedCount,
        }
      });
    } catch (error) {
      console.error('Error in /api/candidates:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post("/api/vote/:candidateId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user!;

    if (user.isAdmin) {
      return res.status(403).json({ message: "Admins cannot vote" });
    }

    const candidateId = parseInt(req.params.candidateId);
    const [candidate, positions] = await Promise.all([
      storage.getCandidates().then(candidates => candidates.find(c => c.id === candidateId)),
      storage.getPositions()
    ]);

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    // Get position's max votes
    const position = positions.find(p => p.id === candidate.positionId);
    if (!position) {
      return res.status(404).json({ message: "Position not found" });
    }

    // Get user's current votes
    const currentVotes = await storage.getUserVotes(user.id);

    // Check if user has already voted for this candidate
    const hasVotedForCandidate = currentVotes.includes(candidateId);
    if (hasVotedForCandidate) {
      return res.status(400).json({ message: "You have already voted for this candidate" });
    }

    // Count how many votes the user has made for this position
    const votesForPosition = (await storage.getCandidates())
      .filter(c => c.positionId === candidate.positionId && currentVotes.includes(c.id))
      .length;

    if (votesForPosition >= position.maxVotes) {
      return res.status(400).json({
        message: `You can only vote for ${position.maxVotes} candidate${position.maxVotes > 1 ? 's' : ''} for this position`
      });
    }

    // Add the new vote
    await storage.updateCandidateVotes(candidateId, true);
    await storage.updateUserVotes(user.id, [...currentVotes, candidateId]);

    res.json({ message: "Vote recorded successfully" });
  });

  app.patch("/api/candidate/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user!;
    if (!user.isAdmin) {
      return res.status(403).json({ message: "Only admins can edit candidates" });
    }

    const candidateId = parseInt(req.params.id);
    await storage.updateCandidate(candidateId, req.body);
    res.json({ message: "Candidate updated successfully" });
  });

  app.patch("/api/system-settings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user!;
    if (!user.isAdmin) {
      return res.status(403).json({ message: "Only admins can edit system settings" });
    }

    await storage.updateSystemSettings(req.body);
    res.json({ message: "System settings updated successfully" });
  });

  app.patch("/api/party-list/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user!;
    if (!user.isAdmin) {
      return res.status(403).json({ message: "Only admins can edit party lists" });
    }

    const partyListId = parseInt(req.params.id);
    await storage.updatePartyList(partyListId, req.body);
    res.json({ message: "Party list updated successfully" });
  });

  // Update the position creation route
  app.post("/api/positions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user!;
    if (!user.isAdmin) {
      return res.status(403).json({ message: "Only admins can add positions" });
    }

    const { name, maxVotes, category } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: "Position name is required" });
    }

    try {
      const position = await storage.createPosition({
        name: name.trim(),
        maxVotes: maxVotes || 1,
        category: category || "Executive"
      });
      res.status(201).json(position);
    } catch (error) {
      console.error('Error creating position:', error);
      res.status(500).json({ message: "Failed to create position" });
    }
  });

  app.delete("/api/positions/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user!;
    if (!user.isAdmin) {
      return res.status(403).json({ message: "Only admins can delete positions" });
    }

    const positionId = parseInt(req.params.id);
    try {
      await storage.deletePosition(positionId);
      res.json({ message: "Position deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/users/:id/school-level", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = parseInt(req.params.id);
    const { schoolLevel } = req.body;

    if (!schoolLevel || !["elementary", "junior_high", "senior_high", "all"].includes(schoolLevel)) {
      return res.status(400).json({ message: "Invalid school level" });
    }

    await storage.updateUserSchoolLevel(userId, schoolLevel as SchoolLevel);
    res.json({ message: "School level updated successfully" });
  });

  app.delete("/api/candidates/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user!;
    if (!user.isAdmin) {
      return res.status(403).json({ message: "Only admins can delete candidates" });
    }

    const candidateId = parseInt(req.params.id);
    await storage.deleteCandidate(candidateId);
    res.json({ message: "Candidate deleted successfully" });
  });

  app.post("/api/candidates", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user!;
    if (!user.isAdmin) {
      return res.status(403).json({ message: "Only admins can add candidates" });
    }

    try {
      // Validate required fields
      const { name, imageUrl, positionId, partyListId, schoolLevels, gradeLevels } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Valid candidate name is required" });
      }

      const candidate = await storage.createCandidate({
        name: name.trim(),
        imageUrl,
        positionId,
        partyListId,
        schoolLevels,
        gradeLevels,
        voteCount: 0
      });

      res.status(201).json(candidate);
    } catch (error) {
      console.error('Error creating candidate:', error);
      res.status(500).json({ message: "Failed to create candidate" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user!;
    if (!user.isAdmin) {
      return res.status(403).json({ message: "Only admins can delete users" });
    }

    const userId = parseInt(req.params.id);
    try {
      await storage.deleteUser(userId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/users/mass-register", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user!;
    if (!user.isAdmin) {
      return res.status(403).json({ message: "Only admins can mass register users" });
    }

    try {
      const users = await storage.massRegisterUsers(req.body);
      res.status(201).json(users);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/users/:id/grade-level", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = parseInt(req.params.id);
    const { gradeLevel } = req.body;

    if (!gradeLevel || !["3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].includes(gradeLevel)) {
      return res.status(400).json({ message: "Invalid grade level" });
    }

    await storage.updateUserGradeLevel(userId, gradeLevel as GradeLevel);
    res.json({ message: "Grade level updated successfully" });
  });

  app.post("/api/users/mark-voted", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user!;

    try {
      await storage.markUserAsVoted(user.id);
      res.json({ message: "User marked as voted successfully" });
    } catch (error) {
      console.error('Error marking user as voted:', error);
      res.status(500).json({ message: "Failed to mark user as voted" });
    }
  });

  // Add the new reset vote route
  app.post("/api/users/:id/reset-vote", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user!;
    if (!user.isAdmin) {
      return res.status(403).json({ message: "Only admins can reset votes" });
    }

    const userId = parseInt(req.params.id);
    try {
      await storage.resetUserVote(userId);
      res.json({ message: "User's vote has been reset successfully" });
    } catch (error) {
      console.error('Error resetting user vote:', error);
      res.status(500).json({ message: "Failed to reset user's vote" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}