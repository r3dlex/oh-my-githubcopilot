import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { AgentInfo, StateReader, TaskInfo, WorkflowState } from "./reader";

const OMC_STATE_DIR = join(".omc", "state");
const STATE_FILE_SUFFIX = "-state.json";
const IGNORED_STATE_FILES = new Set([
  "notify-hook-state.json",
  "tmux-hook-state.json",
  "notify-fallback-state.json",
  "notify-fallback-authority-owner.json",
  "native-stop-state.json",
  "subagent-tracking.json",
]);

interface RawWorkflowState {
  mode?: string;
  active?: boolean;
  current_phase?: string;
  phase_name?: string;
  updated_at?: string;
}

interface RawTrackedAgent {
  id?: string;
  type?: string;
  status?: string;
  teamName?: string;
  startedAt?: string;
  updatedAt?: string;
  completedAt?: string;
  summary?: string;
}

interface RawSubagentTracking {
  schemaVersion?: number;
  updatedAt?: string;
  agents?: Record<string, RawTrackedAgent>;
}

export class OmpStateAdapter implements StateReader {
  private readonly stateDir: string;

  constructor(workspaceRoot: string) {
    this.stateDir = join(workspaceRoot, OMC_STATE_DIR);
  }

  getWorkflows(): WorkflowState[] {
    if (!existsSync(this.stateDir)) {
      return [];
    }

    return readdirSync(this.stateDir)
      .filter((entry) => entry.endsWith(STATE_FILE_SUFFIX) && !IGNORED_STATE_FILES.has(entry))
      .map((entry) => join(this.stateDir, entry))
      .flatMap((filePath) => {
        try {
          const raw = JSON.parse(readFileSync(filePath, "utf8")) as RawWorkflowState;
          const mode = raw.mode;
          if (!mode) {
            return [];
          }
          const id = mode;
          return [{
            id,
            mode,
            active: raw.active ?? false,
            phase: raw.current_phase ?? raw.phase_name,
            updatedAt: raw.updated_at,
          } satisfies WorkflowState];
        } catch {
          return [];
        }
      });
  }

  getAgents(): AgentInfo[] {
    const trackingPath = join(this.stateDir, "subagent-tracking.json");
    if (!existsSync(trackingPath)) {
      return [];
    }

    try {
      const raw = JSON.parse(readFileSync(trackingPath, "utf8")) as RawSubagentTracking;
      if (!raw.agents) {
        return [];
      }

      return Object.entries(raw.agents).map(([key, agent]) => {
        const rawStatus = agent.status ?? "";
        let status: AgentInfo["status"];
        if (rawStatus === "running" || rawStatus === "completed" || rawStatus === "failed") {
          status = rawStatus;
        } else {
          status = "unknown";
        }

        return {
          id: agent.id ?? key,
          type: agent.type ?? "unknown",
          status,
          teamName: agent.teamName,
          startedAt: agent.startedAt,
          updatedAt: agent.updatedAt,
          summary: agent.summary,
        } satisfies AgentInfo;
      });
    } catch {
      return [];
    }
  }

  getTasks(): TaskInfo[] {
    return [];
  }
}
