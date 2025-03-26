import { User, InsertUser, Candidate, PartyList, Position, SystemSettings, SchoolLevel, GradeLevel } from "@shared/schema";
import session from "express-session";
import { db } from './db';
import { eq, sql } from 'drizzle-orm';
import connectPg from "connect-pg-simple";
import * as schema from '@shared/schema';
import { pool } from './db';

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByReferenceNumber(referenceNumber: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUserVotes(userId: number, votes: number[]): Promise<void>;
  getUserVotes(userId: number): Promise<number[]>;
  updateUserSchoolLevel(userId: number, schoolLevel: SchoolLevel): Promise<void>;
  getCandidates(): Promise<Candidate[]>;
  getCandidatesBySchoolLevel(schoolLevel: SchoolLevel): Promise<Candidate[]>;
  getPartyLists(): Promise<PartyList[]>;
  getPositions(): Promise<Position[]>;
  updateCandidateVotes(candidateId: number, increment: boolean): Promise<void>;
  updateCandidate(id: number, updates: Partial<Candidate>): Promise<void>;
  updatePartyListLogo(id: number, logoUrl: string): Promise<void>;
  getSystemSettings(): Promise<SystemSettings>;
  updateSystemSettings(updates: Partial<SystemSettings>): Promise<void>;
  updatePartyList(id: number, updates: Partial<PartyList>): Promise<void>;
  sessionStore: session.Store;
  createPosition(position: { name: string; maxVotes?: number; category?: string }): Promise<Position>;
  deletePosition(id: number): Promise<void>;
  deleteCandidate(id: number): Promise<void>;
  createCandidate(candidate: Omit<Candidate, "id" | "voteCount">): Promise<Candidate>;
  deleteUser(userId: number): Promise<void>;
  massRegisterUsers(users: InsertUser[]): Promise<User[]>;
  updateUserGradeLevel(userId: number, gradeLevel: GradeLevel): Promise<void>;
  getCandidatesByGradeLevel(gradeLevel: GradeLevel): Promise<Candidate[]>;
  getPartyList(id: number): Promise<PartyList>;
  markUserAsVoted(userId: number): Promise<void>;
  resetUserVote(userId: number): Promise<void>; // Add the new method
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool: pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const users = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return users[0];
  }

  async getUserByReferenceNumber(referenceNumber: string): Promise<User | undefined> {
    const users = await db.select().from(schema.users).where(eq(schema.users.referenceNumber, referenceNumber));
    return users[0];
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(schema.users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(schema.users).values({
      ...insertUser,
      isAdmin: insertUser.referenceNumber === "ARSC2025" && insertUser.studentName === "admin",
      votes: [],
      schoolLevel: null
    }).returning();
    return user;
  }

  async updateUserVotes(userId: number, votes: number[]): Promise<void> {
    const voteStrings = votes.map(v => v.toString());
    await db.update(schema.users)
      .set({ votes: voteStrings })
      .where(eq(schema.users.id, userId));
  }

  async getUserVotes(userId: number): Promise<number[]> {
    const user = await this.getUser(userId);
    return user?.votes.map(v => parseInt(v)) || [];
  }

  async updateUserSchoolLevel(userId: number, schoolLevel: SchoolLevel): Promise<void> {
    await db.update(schema.users)
      .set({ schoolLevel })
      .where(eq(schema.users.id, userId));
  }

  async getCandidates(): Promise<Candidate[]> {
    return await db.select().from(schema.candidates);
  }

  async getCandidatesBySchoolLevel(schoolLevel: SchoolLevel): Promise<Candidate[]> {
    return await db.select()
      .from(schema.candidates)
      .where(sql`${schoolLevel} = ANY(school_levels)`);
  }

  async getPartyLists(): Promise<PartyList[]> {
    return await db.select().from(schema.partyLists);
  }

  async getPositions(): Promise<Position[]> {
    return await db.select().from(schema.positions);
  }

  async updateCandidateVotes(candidateId: number, increment: boolean): Promise<void> {
    await db.execute(sql`
      UPDATE candidates 
      SET vote_count = vote_count ${increment ? sql`+ 1` : sql`- 1`}
      WHERE id = ${candidateId}
    `);
  }

  async updateCandidate(id: number, updates: Partial<Candidate>): Promise<void> {
    await db.update(schema.candidates)
      .set(updates)
      .where(eq(schema.candidates.id, id));
  }

  async updatePartyListLogo(id: number, logoUrl: string): Promise<void> {
    await db.update(schema.partyLists)
      .set({ logoUrl })
      .where(eq(schema.partyLists.id, id));
  }

  async getSystemSettings(): Promise<SystemSettings> {
    const settings = await db.select().from(schema.systemSettings);
    return settings[0];
  }

  async updateSystemSettings(updates: Partial<SystemSettings>): Promise<void> {
    await db.update(schema.systemSettings)
      .set(updates)
      .where(eq(schema.systemSettings.id, 1));
  }

  async updatePartyList(id: number, updates: Partial<PartyList>): Promise<void> {
    await db.update(schema.partyLists)
      .set(updates)
      .where(eq(schema.partyLists.id, id));
  }

  async createPosition(position: { name: string; maxVotes?: number; category?: string }): Promise<Position> {
    const positions = await db.select().from(schema.positions);
    const maxDisplayOrder = Math.max(...positions.map(p => p.displayOrder), 0);
    const [newPosition] = await db.insert(schema.positions)
      .values({
        name: position.name,
        displayOrder: maxDisplayOrder + 1,
        maxVotes: position.maxVotes || 1,
        category: position.category || "Executive"
      })
      .returning();
    return newPosition;
  }

  async deletePosition(id: number): Promise<void> {
    const candidates = await db.select()
      .from(schema.candidates)
      .where(eq(schema.candidates.positionId, id));

    if (candidates.length > 0) {
      throw new Error("Cannot delete position with assigned candidates");
    }

    await db.delete(schema.positions)
      .where(eq(schema.positions.id, id));
  }

  async deleteCandidate(id: number): Promise<void> {
    await db.delete(schema.candidates)
      .where(eq(schema.candidates.id, id));
  }

  async createCandidate(candidate: Omit<Candidate, "id" | "voteCount">): Promise<Candidate> {
    const [newCandidate] = await db.insert(schema.candidates)
      .values({
        ...candidate,
        voteCount: 0
      })
      .returning();
    return newCandidate;
  }

  async deleteUser(userId: number): Promise<void> {
    const user = await this.getUser(userId);
    if (user?.isAdmin) {
      throw new Error("Cannot delete admin user");
    }
    await db.delete(schema.users)
      .where(eq(schema.users.id, userId));
  }

  async massRegisterUsers(users: InsertUser[]): Promise<User[]> {
    const createdUsers: User[] = [];
    for (const userData of users) {
      const existingUser = await this.getUserByReferenceNumber(userData.referenceNumber);
      if (existingUser) {
        throw new Error(`User with reference number ${userData.referenceNumber} already exists`);
      }
      const user = await this.createUser(userData);
      createdUsers.push(user);
    }
    return createdUsers;
  }

  async updateUserGradeLevel(userId: number, gradeLevel: GradeLevel): Promise<void> {
    await db.update(schema.users)
      .set({ gradeLevel })
      .where(eq(schema.users.id, userId));
  }

  async getCandidatesByGradeLevel(gradeLevel: GradeLevel): Promise<Candidate[]> {
    return await db.select()
      .from(schema.candidates)
      .where(sql`${gradeLevel} = ANY(grade_levels)`);
  }
  async getPartyList(id: number): Promise<PartyList> {
    const partyLists = await db.select().from(schema.partyLists).where(eq(schema.partyLists.id, id));
    if (!partyLists[0]) {
      throw new Error('Party list not found');
    }
    return partyLists[0];
  }
  async markUserAsVoted(userId: number): Promise<void> {
    await db.update(schema.users)
      .set({ hasVoted: true })
      .where(eq(schema.users.id, userId));
  }

  async resetUserVote(userId: number): Promise<void> {
    await db.update(schema.users)
      .set({ 
        hasVoted: false,
        votes: [] 
      })
      .where(eq(schema.users.id, userId));

    const user = await this.getUser(userId);
    if (user?.votes) {
      for (const candidateId of user.votes) {
        await this.updateCandidateVotes(parseInt(candidateId), false);
      }
    }
  }
}

export const storage = new DatabaseStorage();