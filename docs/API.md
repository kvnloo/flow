# Flow API Reference

## Overview
Complete API reference for Flow orchestration system components and interfaces.

## Table of Contents
1. [Core API](#core-api)
2. [Orchestration API](#orchestration-api)
3. [Memory API](#memory-api)
4. [Agent API](#agent-api)
5. [Hooks API](#hooks-api)
6. [Types](#types)

## Core API

### FlowOrchestrator
Main orchestration controller.

```typescript
class FlowOrchestrator {
  constructor(config: OrchestratorConfig)
  initialize(): Promise<void>
  shutdown(): Promise<void>
}
```

**Methods:**
- `initialize()` - Initialize orchestrator
- `shutdown()` - Clean shutdown
- `getStatus()` - Get current status

### Configuration
System configuration interfaces.

```typescript
interface OrchestratorConfig {
  maxAgents: number
  topology: TopologyType
  memory: MemoryConfig
}
```

## Orchestration API

### Swarm Management
Initialize and manage agent swarms.

```typescript
interface SwarmConfig {
  topology: 'mesh' | 'hierarchical' | 'ring' | 'star'
  maxAgents: number
  strategy: 'balanced' | 'specialized' | 'adaptive'
}
```

**Functions:**
- `initSwarm(config: SwarmConfig)` - Initialize swarm
- `scaleSwarm(count: number)` - Scale agent count
- `destroySwarm(id: string)` - Cleanup swarm

### Task Orchestration
Distribute and coordinate tasks.

```typescript
interface TaskConfig {
  task: string
  strategy: 'parallel' | 'sequential' | 'adaptive'
  maxAgents: number
  priority: 'low' | 'medium' | 'high' | 'critical'
}
```

**Functions:**
- `orchestrateTask(config: TaskConfig)` - Execute task
- `getTaskStatus(id: string)` - Check status
- `cancelTask(id: string)` - Cancel execution

## Memory API

### Memory Operations
Store and retrieve coordination data.

```typescript
interface MemoryOperation {
  action: 'store' | 'retrieve' | 'delete'
  key: string
  namespace: string
  value?: any
}
```

**Functions:**
- `storeMemory(key, value, namespace)` - Store data
- `retrieveMemory(key, namespace)` - Get data
- `deleteMemory(key, namespace)` - Remove data
- `listMemories(namespace)` - List keys

### Memory Namespaces
Organized memory storage.

- `coordination` - Agent coordination data
- `session` - Session state
- `patterns` - Learned patterns
- `metrics` - Performance metrics

## Agent API

### Agent Spawning
Create specialized agents.

```typescript
interface AgentConfig {
  type: 'researcher' | 'coder' | 'analyst' | 'optimizer' | 'coordinator'
  name?: string
  capabilities?: string[]
}
```

**Functions:**
- `spawnAgent(config: AgentConfig)` - Create agent
- `getAgentStatus(id: string)` - Agent status
- `terminateAgent(id: string)` - Stop agent

### Agent Types
Available agent specializations.

- **researcher** - Information gathering
- **coder** - Implementation work
- **analyst** - Data analysis
- **optimizer** - Performance tuning
- **coordinator** - Orchestration

## Hooks API

### Pre-Operation Hooks
Execute before operations.

```typescript
interface PreHookConfig {
  operation: string
  context: Record<string, any>
}
```

**Hooks:**
- `pre-task` - Before task execution
- `pre-edit` - Before file modification
- `pre-search` - Before search operation

### Post-Operation Hooks
Execute after operations.

```typescript
interface PostHookConfig {
  operation: string
  result: any
  metrics: OperationMetrics
}
```

**Hooks:**
- `post-task` - After task completion
- `post-edit` - After file modification
- `post-search` - After search completion

### Session Hooks
Manage session lifecycle.

**Hooks:**
- `session-restore` - Load session state
- `session-checkpoint` - Save checkpoint
- `session-end` - Session cleanup

## Types

### Common Types
Shared type definitions.

```typescript
type TopologyType = 'mesh' | 'hierarchical' | 'ring' | 'star'
type StrategyType = 'balanced' | 'specialized' | 'adaptive'
type PriorityLevel = 'low' | 'medium' | 'high' | 'critical'
type AgentType = 'researcher' | 'coder' | 'analyst' | 'optimizer' | 'coordinator'
```

### Response Types
Standard response structures.

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  metrics?: OperationMetrics
}

interface OperationMetrics {
  duration: number
  tokensUsed?: number
  agentsUsed?: number
}
```

## Error Handling

### Error Types
Standard error categories.

```typescript
class FlowError extends Error {
  code: string
  context: Record<string, any>
}
```

**Error Codes:**
- `INIT_FAILED` - Initialization error
- `INVALID_CONFIG` - Configuration error
- `AGENT_SPAWN_FAILED` - Agent creation error
- `MEMORY_ERROR` - Memory operation error
- `TASK_FAILED` - Task execution error

### Error Responses
Standardized error response format.

```typescript
interface ErrorResponse {
  success: false
  error: string
  code: string
  details?: Record<string, any>
}
```

## Examples

### Basic Usage
```typescript
// Initialize orchestrator
const orchestrator = new FlowOrchestrator({
  maxAgents: 5,
  topology: 'mesh',
  memory: { namespace: 'coordination' }
})

await orchestrator.initialize()

// Spawn agents
const agent = await spawnAgent({
  type: 'coder',
  capabilities: ['typescript', 'testing']
})

// Store coordination data
await storeMemory('task/status', { progress: 0.5 }, 'coordination')
```

### Advanced Orchestration
```typescript
// Complex task orchestration
const result = await orchestrateTask({
  task: 'Implement feature X',
  strategy: 'adaptive',
  maxAgents: 3,
  priority: 'high'
})

// Monitor progress
const status = await getTaskStatus(result.taskId)
```

## Best Practices

### Performance
- Optimal agent counts
- Memory management
- Batch operations

### Security
- Access control
- Data validation
- Error handling

### Monitoring
- Metrics collection
- Log management
- Health checks
