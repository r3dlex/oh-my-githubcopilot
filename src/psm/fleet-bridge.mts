/**
 * PSM — Fleet Bridge
 * Connects PSM sessions to the fleet execution mode.
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface FleetMember {
  sessionId: string;
  worktreePath: string;
  pid?: number;
  status: "idle" | "busy" | "error";
}

const FLEET_REGISTRY = () => join(homedir(), ".omp", "state", "fleet.json");

function readFleet(): FleetMember[] {
  try {
    if (!existsSync(FLEET_REGISTRY())) return [];
    return JSON.parse(readFileSync(FLEET_REGISTRY(), "utf-8"));
  } catch {
    return [];
  }
}

function writeFleet(members: FleetMember[]): void {
  const dir = join(homedir(), ".omp", "state");
  writeFileSync(join(dir, "fleet.json"), JSON.stringify(members, null, 2), "utf-8");
}

/**
 * Register a session with the fleet.
 */
export function registerFleetMember(sessionId: string, worktreePath: string): FleetMember {
  const members = readFleet();
  const existing = members.find((m) => m.sessionId === sessionId);
  if (existing) return existing;

  const member: FleetMember = { sessionId, worktreePath, status: "idle" };
  members.push(member);
  writeFleet(members);
  return member;
}

/**
 * Unregister a session from the fleet.
 */
export function unregisterFleetMember(sessionId: string): void {
  const members = readFleet().filter((m) => m.sessionId !== sessionId);
  writeFleet(members);
}

/**
 * Update a fleet member's status.
 */
export function updateFleetMemberStatus(sessionId: string, status: FleetMember["status"]): void {
  const members = readFleet();
  const member = members.find((m) => m.sessionId === sessionId);
  if (member) {
    member.status = status;
    writeFleet(members);
  }
}

/**
 * Get all fleet members.
 */
export function listFleetMembers(): FleetMember[] {
  return readFleet();
}

/**
 * Get fleet statistics.
 */
export function getFleetStats(): { total: number; idle: number; busy: number; error: number } {
  const members = readFleet();
  return {
    total: members.length,
    idle: members.filter((m) => m.status === "idle").length,
    busy: members.filter((m) => m.status === "busy").length,
    error: members.filter((m) => m.status === "error").length,
  };
}