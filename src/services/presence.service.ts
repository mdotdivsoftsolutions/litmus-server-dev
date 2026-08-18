export interface AgentPresenceRecord {
  agentId: string;
  name: string;
  role: string;
  status: 'ONLINE' | 'BUSY' | 'OFFLINE';
  socketIds: Set<string>;
  lastHeartbeat: number;
}

class PresenceService {
  private agents: Map<string, AgentPresenceRecord> = new Map();
  private readonly HEARTBEAT_TTL_MS = 60 * 1000; // 60 seconds TTL

  /**
   * Register or update agent presence on connection / heartbeat
   */
  public registerAgent(
    agentId: string,
    name: string,
    role: string,
    socketId: string,
    status: 'ONLINE' | 'BUSY' | 'OFFLINE' = 'ONLINE'
  ): void {
    const existing = this.agents.get(agentId);
    if (existing) {
      existing.socketIds.add(socketId);
      existing.lastHeartbeat = Date.now();
      existing.status = status;
      existing.name = name;
    } else {
      this.agents.set(agentId, {
        agentId,
        name,
        role,
        status,
        socketIds: new Set([socketId]),
        lastHeartbeat: Date.now(),
      });
    }
  }

  /**
   * Remove socket on disconnect
   */
  public removeSocket(socketId: string): { agentId?: string; wasLastSocket: boolean } {
    for (const [agentId, agent] of this.agents.entries()) {
      if (agent.socketIds.has(socketId)) {
        agent.socketIds.delete(socketId);
        if (agent.socketIds.size === 0) {
          agent.status = 'OFFLINE';
          return { agentId, wasLastSocket: true };
        }
        return { agentId, wasLastSocket: false };
      }
    }
    return { wasLastSocket: false };
  }

  /**
   * Set agent status explicitly (e.g. ONLINE, BUSY, OFFLINE)
   */
  public setAgentStatus(agentId: string, status: 'ONLINE' | 'BUSY' | 'OFFLINE'): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      agent.lastHeartbeat = Date.now();
    }
  }

  /**
   * Process heartbeat ping from agent portal
   */
  public recordHeartbeat(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.lastHeartbeat = Date.now();
      if (agent.status === 'OFFLINE') {
        agent.status = 'ONLINE';
      }
    }
  }

  /**
   * Check if a specific agent is currently active/online
   */
  public isAgentOnline(agentId: string): boolean {
    this.pruneStaleAgents();
    const agent = this.agents.get(agentId);
    return !!agent && agent.status === 'ONLINE' && agent.socketIds.size > 0;
  }

  /**
   * Check if any agent is currently active/online
   */
  public hasOnlineAgents(): boolean {
    this.pruneStaleAgents();
    for (const agent of this.agents.values()) {
      if (agent.status === 'ONLINE' && agent.socketIds.size > 0) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get list of online agents
   */
  public getOnlineAgents(): Array<{ agentId: string; name: string; status: string; role: string }> {
    this.pruneStaleAgents();
    const list: Array<{ agentId: string; name: string; status: string; role: string }> = [];
    for (const agent of this.agents.values()) {
      if (agent.status !== 'OFFLINE' && agent.socketIds.size > 0) {
        list.push({
          agentId: agent.agentId,
          name: agent.name,
          status: agent.status,
          role: agent.role,
        });
      }
    }
    return list;
  }

  /**
   * Remove or mark offline any agents whose heartbeat expired
   */
  private pruneStaleAgents(): void {
    const now = Date.now();
    for (const [agentId, agent] of this.agents.entries()) {
      if (now - agent.lastHeartbeat > this.HEARTBEAT_TTL_MS) {
        agent.status = 'OFFLINE';
      }
    }
  }
}

export const presenceService = new PresenceService();
