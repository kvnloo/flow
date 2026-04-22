# Multi-Agent Orchestration Patterns: Deep Dive for Flow Orchestrator TUI

**Research Date:** 2025-11-25
**Version:** 1.0
**Status:** Comprehensive Analysis

---

## Executive Summary

This research investigates multi-agent orchestration frameworks (Claude Flow, AutoGen, LangGraph, CrewAI, OpenCode) and their integration patterns for building a unified Flow Orchestrator TUI. Key findings:

### Key Insights

1. **Convergence on Standards**: Industry is rapidly adopting standardized protocols:
   - **JSON-RPC 2.0** for agent communication (MCP, A2A)
   - **Server-Sent Events (SSE)** for real-time streaming
   - **Event-driven architecture** as the dominant pattern

2. **Framework Diversity**: Each framework has distinct strengths:
   - **Claude Flow**: Hooks-based coordination, 64 specialized agents, MCP-native
   - **AutoGen**: Group chat patterns, WebSocket streaming, flexible topology
   - **LangGraph**: State machine graphs, powerful streaming API, LangSmith integration
   - **CrewAI**: Hierarchical delegation, role-based agents, event listeners
   - **OpenCode**: TUI-first, dual-mode (plan/build), Bubble Tea architecture

3. **Integration Opportunity**: A unified TUI can consume events from all frameworks through:
   - **Adapter pattern** for framework-specific protocols
   - **Common event schema** for internal representation
   - **SSE/WebSocket** for real-time updates
   - **JSON-RPC 2.0** as the wire protocol

4. **Standardization Initiatives**:
   - **A2A Protocol** (Agent2Agent) for cross-framework communication
   - **MCP** (Model Context Protocol) for LLM-tool integration
   - **ACP** (Agent Communication Protocol) for multi-vendor interoperability

---

## 1. Framework Comparison Matrix

### 1.1 Claude Flow (ruvnet/claude-flow)

**Architecture**: Swarm-based multi-agent orchestration with MCP protocol integration

**Key Features**:
- 64 specialized agents across 16 categories
- 5 coordination topologies: hierarchical, mesh, ring, star, adaptive
- 100 MCP tools for orchestration
- Advanced hooks system for lifecycle management
- Native Claude Code support
- Hybrid memory system with vector search
- Queen-led "Hive-Mind" coordination

**Coordination Modes**:
- **Hierarchical**: Tree structure with Queen coordinator
- **Mesh**: Peer-to-peer with fault tolerance
- **Ring**: Circular token-passing
- **Star**: Central hub coordination
- **Adaptive**: ML-driven dynamic topology switching

**Agent Categories**:
```yaml
Core: coder, planner, researcher, reviewer, tester
Coordination: hierarchical-coordinator, mesh-coordinator, adaptive-coordinator
Consensus: byzantine-coordinator, raft-manager, gossip-coordinator
Performance: perf-analyzer, memory-coordinator, smart-agent
GitHub: pr-manager, code-review-swarm, issue-tracker, release-manager
SPARC: specification, pseudocode, architecture, refinement
Specialized: backend-dev, mobile-dev, ml-developer, api-docs
```

**Event Streaming**:
- Hooks-based lifecycle events: `pre-task`, `post-edit`, `post-task`
- MCP protocol over stdio or SSE
- JSON-RPC 2.0 message format
- Real-time agent coordination via hooks

**Integration Points**:
```bash
# Add MCP server
claude mcp add claude-flow npx claude-flow@alpha mcp start

# Hook configuration in .claude/settings.json
{
  "hooks": {
    "pre_tool_use": ["validate-command"],
    "post_edit": ["format-code", "update-memory"],
    "session_end": ["export-metrics"]
  }
}
```

**Strengths**:
- Proven performance: 84.8% SWE-Bench solve rate
- Token efficiency: 32.3% reduction
- Speed: 2.8-4.4x improvement
- Native MCP integration
- Comprehensive agent library

**Weaknesses**:
- Primarily focused on Claude ecosystem
- Documentation could be more extensive
- Steep learning curve for full feature set

**Sources**:
- [GitHub - ruvnet/claude-flow](https://github.com/ruvnet/claude-flow)
- [Agent System Overview](https://github.com/ruvnet/claude-flow/wiki/Agent-System-Overview)
- [Claude-Flow Complete Guide](https://deeplearning.fr/claude-flow-the-complete-beginners-guide-to-ai-powered-development/)

---

### 1.2 AutoGen (Microsoft)

**Architecture**: Conversational multi-agent framework with flexible group chat patterns

**Key Features**:
- LLM-mediated agent interactions
- Multiple conversation patterns
- WebSocket streaming support
- Human-in-the-loop integration
- Tool/function calling
- Flexible speaker selection

**Conversation Patterns**:

1. **Two-Agent Chat**: Basic conversational pattern
2. **Sequential Chat**: Chained conversations with carryover
3. **Group Chat**: Manager-orchestrated multi-agent conversations
4. **Dynamic Group Chat**: Hierarchical with runtime selection
5. **Nested Chat**: Recursive agent conversations

**Speaker Selection Strategies**:
- `round_robin`: Sequential turn-taking
- `random`: Randomized selection
- `manual`: Human selection
- `auto`: LLM-based selection (default)
- FSM graphs: Finite state machine constraints

**Agent Types**:
- **AssistantAgent**: LLM-powered with code execution
- **UserProxyAgent**: Human or automated user proxy
- **GroupChatManager**: Orchestrates group conversations
- **Custom Agents**: User-defined specialized agents

**Event Streaming Implementation**:

```python
# WebSocket streaming with IOWebsockets
from autogen import IOWebsockets

async def on_connect(iostream):
    chatbot = MyAgent(iostream=iostream)
    await chatbot.run()

IOWebsockets.run_server_in_thread(on_connect=on_connect)
```

**Real-Time Monitoring**:
- WebSocket-based bidirectional communication
- StreamingResponse with asyncio queues
- Server-Sent Events (SSE) for compatibility
- Low latency event-driven updates

**Integration Architecture**:
```yaml
Transport: WebSocket, SSE, HTTP
Message Format: JSON
Streaming: Async iterators with create_stream
Queue Pattern: Asyncio message queue for agent coordination
Frontend Integration: FastAPI + WebSocket endpoints
```

**Strengths**:
- Mature framework with extensive documentation
- Flexible conversation patterns
- Strong Microsoft ecosystem integration
- Active community and examples
- WebSocket streaming well-implemented

**Weaknesses**:
- Can be verbose for simple use cases
- Group chat coordination can be complex
- Token usage can be high with many agents

**Sources**:
- [AutoGen Multi-agent Framework](https://microsoft.github.io/autogen/docs/Use-Cases/agent_chat/)
- [Group Chat Patterns](https://microsoft.github.io/autogen/stable//user-guide/core-user-guide/design-patterns/group-chat.html)
- [WebSocket Streaming](https://microsoft.github.io/autogen/docs/notebooks/agentchat_websockets/)
- [Conversation Patterns](https://microsoft.github.io/autogen/0.2/docs/tutorial/conversation-patterns/)

---

### 1.3 LangGraph (LangChain)

**Architecture**: State machine-based graph workflows with powerful streaming

**Key Features**:
- Directed graph agent workflows
- Multiple streaming modes
- Durable execution with persistence
- Human-in-the-loop integration
- Checkpoint-based time-travel debugging
- LangSmith tracing integration

**Core Components**:
1. **State**: Shared data structure passed between nodes
2. **Nodes**: Functions that process state
3. **Edges**: Connections defining control flow
4. **Conditional Edges**: Dynamic routing based on state

**Graph Patterns**:
```python
# Basic graph structure
from langgraph.graph import StateGraph

workflow = StateGraph(State)
workflow.add_node("agent", agent_node)
workflow.add_node("tools", tool_node)
workflow.add_conditional_edges(
    "agent",
    should_continue,
    {
        "continue": "tools",
        "end": END
    }
)
```

**Streaming Modes**:

1. **updates**: Default, emits state updates after each node
2. **values**: Emits complete state after each step
3. **messages**: Streams individual messages
4. **events**: Detailed lifecycle events via `astream_events()`
5. **debug**: Additional debugging information
6. **checkpoints**: Full checkpoint snapshots after supersteps

**Event Streaming API**:
```python
async for event in graph.astream_events(inputs, version="v2"):
    kind = event["event"]
    if kind == "on_chat_model_stream":
        # Handle streaming tokens
        content = event["data"]["chunk"].content
    elif kind == "on_tool_start":
        # Handle tool execution
        print(f"Tool: {event['name']}")
```

**LangSmith Integration**:
- Automatic trace collection
- Zero-latency async tracing
- Direct correlation between traces and logs
- Full execution history reconstruction
- Real-time monitoring dashboards

**State Management**:
- Persistent state across sessions
- Checkpoint-based recovery
- Time-travel debugging capabilities
- Shared memory between agents
- Vector search integration

**Strengths**:
- Powerful streaming API with multiple modes
- Excellent state management
- Strong integration with LangSmith observability
- Durable execution for long-running tasks
- Conditional branching and complex workflows

**Weaknesses**:
- Steeper learning curve
- Can be over-engineered for simple tasks
- Requires understanding of graph concepts

**Sources**:
- [LangGraph Multi-Agent Workflows](https://blog.langchain.com/langgraph-multi-agent-workflows/)
- [LangGraph State Machines](https://dev.to/jamesli/langgraph-state-machines-managing-complex-agent-task-flows-in-production-36f4)
- [Streaming API](https://docs.langchain.com/langsmith/streaming)
- [LangGraph Documentation](https://www.langchain.com/langgraph)

---

### 1.4 CrewAI

**Architecture**: Role-based hierarchical multi-agent orchestration

**Key Features**:
- Role-driven agent teams
- Hierarchical delegation patterns
- Manager agent coordination
- Event listener system
- Task allocation and validation
- Controlled delegation with allowed_agents

**Agent Hierarchy**:
```yaml
Manager Agent:
  role: Coordinator
  delegation: true
  responsibilities:
    - Task allocation
    - Work validation
    - Result synthesis

Specialist Agents:
  roles: [researcher, coder, writer, analyst]
  delegation: false  # Prevents re-delegation
  capabilities: domain-specific
```

**Hierarchical Process**:
1. **Manager** receives task and breaks into sub-tasks
2. **Delegation** to specialists based on capabilities
3. **Execution** by specialist agents
4. **Validation** of results by manager
5. **Synthesis** of final output

**Delegation Control**:
```python
# Controlled hierarchical structure
specialist = Agent(
    role="Backend Developer",
    allow_delegation=False,  # Prevent re-delegation
    delegation=False
)

manager = Agent(
    role="Project Manager",
    allow_delegation=True,
    allowed_agents=[specialist1, specialist2]  # Explicit control
)
```

**Event System**:
```python
from crewai import BaseEventListener, CrewKickoffStartedEvent

class CustomListener(BaseEventListener):
    def setup_listeners(self):
        self.on(CrewKickoffStartedEvent, self.on_crew_start)
        self.on(AgentExecutionCompletedEvent, self.on_agent_done)

    def on_crew_start(self, event):
        print(f"Crew started: {event.crew_id}")
```

**Available Events**:
- `CrewKickoffStartedEvent`
- `CrewKickoffCompletedEvent`
- `AgentExecutionCompletedEvent`
- `LLMStreamChunkEvent` (for streaming)
- Task-level events

**Communication Protocols**:
- Inter-agent delegation via built-in mechanisms
- Question-asking between agents
- Result passing through crew context
- Shared memory for context

**Streaming Support**:
- LLM streaming with `stream=True`
- Event-based chunk capture
- CrewAI Control Plane for observability
- Real-time analytics and reporting

**Integration with BentoML**:
- Streaming endpoints for real-time progress
- Long-running task support
- Planning and thinking process visibility

**Strengths**:
- Clear role-based organization
- Effective hierarchical delegation
- Good for enterprise-style workflows
- Event system for monitoring
- Controlled agent communication

**Weaknesses**:
- Event system not fully complete
- Streaming support limited for multi-agent scenarios
- Can be rigid for dynamic workflows
- Delegation can become unreliable with many agents

**Sources**:
- [CrewAI Hierarchical Process](https://docs.crewai.com/how-to/hierarchical-process)
- [Collaboration Mechanisms](https://docs.crewai.com/en/concepts/collaboration)
- [Event Listeners](https://docs.crewai.com/en/concepts/event-listener)
- [Hierarchical Delegation PR](https://github.com/crewAIInc/crewAI/pull/2068)

---

### 1.5 OpenCode

**Architecture**: Terminal-first AI coding agent with dual-mode operation

**Key Features**:
- TUI built with Bubble Tea (Go)
- Dual-mode: Plan (analysis) and Build (execution)
- MCP integration for tool access
- JSON output for automation
- Session persistence
- Event bus architecture

**Modes**:

1. **Plan Mode**: Analysis and planning without changes
   - Read-only operations
   - Architecture analysis
   - Code review
   - Planning documents

2. **Build Mode**: Full development with all tools
   - File operations
   - Code generation
   - Testing
   - Deployment

**Agent Configuration**:
```json
{
  "agent": {
    "default": "build",
    "agents": {
      "build": {
        "tools": ["file", "terminal", "search"],
        "model": "claude-3-5-sonnet-20241022",
        "permissions": "full"
      },
      "plan": {
        "tools": ["search", "read"],
        "model": "claude-3-5-sonnet-20241022",
        "permissions": "read-only"
      }
    }
  }
}
```

**Event Architecture**:
- LLM results processed and persisted to disk
- Each message part emits event through shared bus
- Bus exposed over HTTP via SSE
- Real-time updates to all connected clients

**Event Flow**:
```
TUI → HTTP server → Session.prompt
  → History/Tools/Functions prepared
  → LLM responds (text + tool calls)
  → Results persisted
  → Events broadcast to Event Bus
  → TUI + HTTP clients receive updates
```

**CLI Integration**:
```bash
# Non-interactive mode with JSON output
opencode -p "your prompt" -f json

# Quiet mode for scripting
opencode -p "your prompt" --quiet

# Attach to running server
opencode attach
```

**Streaming Output**:
- SSE endpoint at `/sse`
- Real-time session updates
- Tool execution results
- LLM response streaming

**TUI Architecture (Bubble Tea)**:
```go
type Model struct {
    // State
}

func (m Model) Init() tea.Cmd
func (m Model) Update(tea.Msg) (tea.Model, tea.Cmd)
func (m Model) View() string
```

**Key Components**:
- Elm Architecture pattern
- Event-driven updates
- Composable models
- Message-based communication
- Concurrent safe via central channel

**Strengths**:
- Excellent TUI implementation
- Clean dual-mode separation
- JSON output for automation
- SSE streaming well-implemented
- Go performance benefits

**Weaknesses**:
- Limited multi-agent orchestration
- Primarily single-agent focused
- Less flexible than other frameworks
- Smaller ecosystem

**Sources**:
- [OpenCode GitHub](https://github.com/opencode-ai/opencode)
- [OpenCode Documentation](https://opencode.ai/docs/)
- [How Coding Agents Work](https://cefboud.com/posts/coding-agents-internals-opencode-deepdive/)
- [Bubble Tea Framework](https://github.com/charmbracelet/bubbletea)

---

## 2. Integration Architecture Patterns

### 2.1 Standardized Protocol Landscape

The multi-agent ecosystem is converging on several key standards:

#### A2A (Agent2Agent) Protocol

**Overview**: Open standard for agent interoperability using JSON-RPC 2.0

**Key Features**:
- HTTP + JSON-RPC 2.0 + SSE transport
- Async-first design for long-running tasks
- Human-in-the-loop support
- Enterprise-ready (auth, security, tracing)
- Transport agnostic

**Architecture**:
```yaml
Transport Layer: HTTP, WebSocket, custom
Wire Protocol: JSON-RPC 2.0
Streaming: Server-Sent Events (SSE)
Message Format:
  request:
    jsonrpc: "2.0"
    method: "agent.execute"
    params: {...}
    id: 123
  response:
    jsonrpc: "2.0"
    result: {...}
    id: 123
```

**Integration Components**:
- **A2AServer**: Server-side adapter for A2A compliance
- **A2AAgent**: Client-side adapter for communication
- **Event Bridge**: Converts framework events to A2A format

**BeeAI Integration**: Originally developed by IBM's BeeAI, now using A2A adapters under Linux Foundation

**Sources**:
- [A2A Protocol Specification](https://a2a-protocol.org/latest/specification/)
- [Using A2A for AI Agent Interoperability](https://www.ibm.com/think/tutorials/acp-ai-agent-interoperability-building-multi-agent-workflows)

#### MCP (Model Context Protocol)

**Overview**: Anthropic's open standard for AI-tool integration

**Release**: November 2024 with formal specification

**Transport Methods**:

1. **stdio** (Standard Input/Output)
   - Local resource integration
   - Synchronous messaging
   - Lightweight communication

2. **HTTP + SSE** (Server-Sent Events)
   - Remote resource integration
   - Asynchronous event-driven
   - Multiple concurrent server calls

**Message Format**: JSON-RPC 2.0

**Protocol Design**:
- Inspired by Language Server Protocol (LSP)
- Transported over JSON-RPC 2.0
- Event-driven architecture
- Real-time updates without polling

**Key Methods**:
- `initialize`: Setup connection
- `resources/list`: Enumerate available resources
- `tools/call`: Execute tool functions
- Custom methods per implementation

**Industry Adoption**:
- OpenAI (March 2025): ChatGPT, Agents SDK, Responses API
- Google DeepMind (April 2025): Gemini models
- Microsoft, Block, and others
- 200+ community-built servers

**Integration Example**:
```json
// Initialize request
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {}
  },
  "id": 1
}

// Tool call
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "search_code",
    "arguments": {"query": "TODO"}
  },
  "id": 2
}
```

**Sources**:
- [MCP Specification](https://modelcontextprotocol.io/specification/2025-06-18)
- [Anthropic MCP Announcement](https://www.anthropic.com/news/model-context-protocol)
- [MCP Complete Guide](https://www.keywordsai.co/blog/introduction-to-mcp)

#### ACP (Agent Communication Protocol)

**Overview**: Common messaging system for cross-framework agent communication

**Key Features**:
- Decouples communication from agent logic
- Enables mixing agents from different frameworks
- No custom integration code required
- Works with LangChain, LangGraph, CrewAI, BeeAI

**Integration**:
```python
# Agent built with different frameworks can communicate
langchain_agent = LangChainAgent(acp_adapter)
crewai_agent = CrewAIAgent(acp_adapter)

# They can now exchange messages via ACP
langchain_agent.send_message(crewai_agent, message)
```

**Relationship to A2A**: ACP (originally IBM) merged with Google's A2A under Linux Foundation

**Sources**:
- [Using ACP for Agent Interoperability](https://www.ibm.com/think/tutorials/acp-ai-agent-interoperability-building-multi-agent-workflows)

---

### 2.2 Agent Topology Patterns

Agent systems implement various topological arrangements for communication:

#### Star Topology

**Structure**: Central hub with spoke agents

**Characteristics**:
- All communication through central node
- Hub manages routing and coordination
- Simple to understand and implement
- Single point of failure risk

**Use Cases**:
- Centralized orchestration
- Simple delegation patterns
- Manager-worker architectures

**Implementation**:
```
        [Manager]
         /  |  \
    [A1] [A2] [A3]
```

**Examples**:
- CrewAI hierarchical mode
- AutoGen GroupChatManager
- Claude Flow hierarchical coordinator

---

#### Mesh Topology

**Structure**: Every agent connected to every other agent

**Characteristics**:
- Full connectivity between all nodes
- High redundancy and fault tolerance
- Complex coordination requirements
- Higher message overhead

**Variants**:
- **Full Mesh**: Every agent to every agent
- **Partial Mesh**: Selected connections

**Use Cases**:
- High-availability systems
- Peer-to-peer coordination
- Consensus-based decision making

**Implementation**:
```
    [A1]─────[A2]
     │  \   /  │
     │   \ /   │
     │   / \   │
     │  /   \  │
    [A3]─────[A4]
```

**Examples**:
- Claude Flow mesh coordinator
- Distributed consensus systems
- P2P agent networks

---

#### Ring Topology

**Structure**: Agents arranged in circular pattern

**Characteristics**:
- Each agent has exactly two neighbors
- Token-passing communication
- Deterministic message flow
- Predictable latency

**Use Cases**:
- Sequential processing
- Round-robin task distribution
- Token-based coordination

**Implementation**:
```
    [A1] → [A2]
     ↑       ↓
    [A4] ← [A3]
```

**Examples**:
- Claude Flow ring topology
- Sequential workflow systems

---

#### Hierarchical (Tree) Topology

**Structure**: Parent-child relationships in tree form

**Characteristics**:
- Clear authority structure
- Scalable organization
- Natural delegation patterns
- Layer-based communication

**Layers**:
- **Core**: Root coordinator
- **Distribution**: Middle managers
- **Access**: Worker agents

**Use Cases**:
- Enterprise workflows
- Complex task decomposition
- Multi-level decision making

**Implementation**:
```
        [Root]
       /      \
    [M1]      [M2]
    / \       / \
  [W1][W2] [W3][W4]
```

**Examples**:
- CrewAI hierarchical mode
- Claude Flow hierarchical coordinator
- Organization-modeled systems

---

#### Hybrid Topologies

Real-world systems often combine multiple patterns:

**Star-Mesh Hybrid**:
- Core agents in mesh for redundancy
- Edge agents in star for simplicity

**Hierarchical-Mesh Hybrid**:
- Tree structure for organization
- Mesh at each layer for fault tolerance

**Examples**:
- Claude Flow adaptive coordinator (ML-driven topology switching)
- Enterprise multi-agent systems
- Large-scale orchestrations

---

### 2.3 Message Passing Patterns

#### Synchronous Request-Response

**Characteristics**:
- Blocking communication
- Direct reply expected
- Simple but can cause bottlenecks

**Protocol**: JSON-RPC 2.0 request/response

**Example**:
```json
// Request
{
  "jsonrpc": "2.0",
  "method": "analyze_code",
  "params": {"file": "main.py"},
  "id": 1
}

// Response
{
  "jsonrpc": "2.0",
  "result": {"issues": []},
  "id": 1
}
```

---

#### Asynchronous Event-Based

**Characteristics**:
- Non-blocking communication
- Publish-subscribe pattern
- Scalable and resilient

**Protocols**: SSE, WebSocket, message queues

**Example**:
```json
// Event publication
{
  "event": "task_completed",
  "agent_id": "worker-1",
  "result": {...},
  "timestamp": "2025-11-25T10:30:00Z"
}

// Multiple subscribers receive
```

---

#### Message Queue Pattern

**Characteristics**:
- Decoupled producers and consumers
- Buffering for load management
- Exactly-once or at-least-once delivery

**Technologies**:
- Kafka for partitioned streams
- RabbitMQ for reliable delivery
- Redis Streams for lightweight queues

**Kafka Pattern**:
```
Orchestrator → Kafka Topic (partitioned by key)
                   ↓
              Worker Consumer Group
              [W1] [W2] [W3]
```

**Benefits**:
- Orchestrator doesn't manage connections
- Auto-scaling of workers
- Fault tolerance built-in

**Sources**:
- [Event-Driven Multi-Agent Systems](https://www.confluent.io/blog/event-driven-multi-agent-systems/)

---

#### Shared Knowledge Base

**Characteristics**:
- Centralized state repository
- Agents read/write to shared store
- Coordination through data

**Technologies**:
- Vector databases (Pinecone, Weaviate)
- Graph databases (Neo4j)
- Key-value stores (Redis)

**Pattern**:
```
    [A1] ─┐
    [A2] ─┼→ [Knowledge Base]
    [A3] ─┘
```

---

### 2.4 Real-Time Communication Technologies

#### WebSockets vs Server-Sent Events

| Feature | WebSocket | Server-Sent Events |
|---------|-----------|-------------------|
| Direction | Bidirectional | Unidirectional (server→client) |
| Protocol | Custom (ws://, wss://) | HTTP/HTTPS |
| Data Types | Text and binary | Text only |
| Reconnection | Manual | Automatic |
| Browser Support | Universal | Wide |
| Complexity | Higher | Lower |
| Use Cases | Chat, gaming, collaboration | Live feeds, notifications, logs |

**WebSocket Use Cases**:
- Online gaming (low latency critical)
- Live chat applications
- Collaborative editing
- Real-time trading platforms

**SSE Use Cases**:
- Live news feeds
- Social media updates
- Monitoring dashboards
- Agent log streaming

**Performance Considerations**:
- Both use one socket per connection
- SSE simpler to implement
- WebSocket has lower latency
- SSE better for one-way streaming

**Choice Guidance**:
- Use SSE if client rarely sends data
- Use WebSocket for frequent bidirectional communication
- SSE easier for debugging and testing

**Sources**:
- [WebSockets vs SSE](https://ably.com/blog/websockets-vs-sse)
- [Real-Time Protocol Comparison](https://systemdesignschool.io/blog/server-sent-events-vs-websocket)

---

#### Streaming HTTP

**Characteristics**:
- Uses HTTP 1.1 or 2.0
- Chunked transfer encoding
- Long-lived connections
- Standard HTTP semantics

**Advantages**:
- Works through firewalls
- Standard HTTP tooling
- Easy to implement

**Disadvantages**:
- One direction per request
- More overhead than WebSocket

---

#### WebTransport

**Characteristics**:
- Built on HTTP/3 (QUIC)
- Multiple streams over single connection
- Lower latency than WebSocket
- Bidirectional

**Status**: Emerging standard, growing support

**Use Cases**:
- Next-generation real-time apps
- High-performance requirements
- Many concurrent streams

---

## 3. Event Schema Design

### 3.1 Common Event Structure

To unify events from different frameworks, we need a common schema:

```json
{
  "schema_version": "1.0.0",
  "event_id": "uuid-v4",
  "timestamp": "2025-11-25T10:30:00.000Z",
  "source": {
    "framework": "claude-flow|autogen|langgraph|crewai|opencode",
    "agent_id": "agent-123",
    "agent_type": "coder|researcher|manager",
    "session_id": "session-456"
  },
  "event_type": "agent.started|agent.completed|task.assigned|message.sent",
  "event_category": "lifecycle|communication|execution|error",
  "severity": "debug|info|warning|error",
  "payload": {
    // Event-specific data
  },
  "metadata": {
    "trace_id": "trace-789",
    "parent_event_id": "parent-uuid",
    "tags": ["tag1", "tag2"]
  }
}
```

---

### 3.2 Event Categories

#### Lifecycle Events

**Agent Lifecycle**:
```json
{
  "event_type": "agent.started",
  "payload": {
    "agent_id": "coder-1",
    "agent_type": "coder",
    "capabilities": ["file_edit", "code_analysis"],
    "configuration": {...}
  }
}

{
  "event_type": "agent.completed",
  "payload": {
    "agent_id": "coder-1",
    "status": "success|failure",
    "duration_ms": 1234,
    "result": {...}
  }
}
```

---

#### Communication Events

**Message Passing**:
```json
{
  "event_type": "message.sent",
  "payload": {
    "from_agent": "manager-1",
    "to_agent": "worker-2",
    "message_type": "task_assignment|query|response",
    "content": {...}
  }
}

{
  "event_type": "message.received",
  "payload": {
    "agent_id": "worker-2",
    "message_id": "msg-123",
    "processing_started": true
  }
}
```

---

#### Execution Events

**Task Processing**:
```json
{
  "event_type": "task.assigned",
  "payload": {
    "task_id": "task-789",
    "agent_id": "coder-1",
    "task_type": "code_generation|analysis|review",
    "priority": "high|medium|low",
    "estimated_duration_ms": 5000
  }
}

{
  "event_type": "task.progress",
  "payload": {
    "task_id": "task-789",
    "progress_percent": 45,
    "current_step": "analyzing dependencies",
    "steps_completed": 3,
    "steps_total": 7
  }
}

{
  "event_type": "task.completed",
  "payload": {
    "task_id": "task-789",
    "status": "success|failure|partial",
    "result": {...},
    "metrics": {
      "duration_ms": 4523,
      "tokens_used": 1234
    }
  }
}
```

---

#### Tool Execution Events

```json
{
  "event_type": "tool.called",
  "payload": {
    "tool_name": "file_edit",
    "agent_id": "coder-1",
    "arguments": {...}
  }
}

{
  "event_type": "tool.result",
  "payload": {
    "tool_name": "file_edit",
    "success": true,
    "result": {...},
    "duration_ms": 123
  }
}
```

---

#### Error Events

```json
{
  "event_type": "error.occurred",
  "severity": "error",
  "payload": {
    "error_type": "tool_failure|timeout|validation_error",
    "error_message": "File not found: config.json",
    "stack_trace": "...",
    "recovery_action": "retry|skip|escalate|fail"
  }
}
```

---

#### State Events

**State Changes**:
```json
{
  "event_type": "state.updated",
  "payload": {
    "state_key": "workflow.current_step",
    "old_value": "analysis",
    "new_value": "implementation",
    "affected_agents": ["agent-1", "agent-2"]
  }
}

{
  "event_type": "checkpoint.created",
  "payload": {
    "checkpoint_id": "cp-123",
    "state_snapshot": {...},
    "can_rollback": true
  }
}
```

---

### 3.3 Framework-Specific Mappings

#### Claude Flow Event Mapping

```yaml
Claude Flow Hook → Common Event:
  pre-task → agent.started
  post-edit → tool.result (file_edit)
  post-task → task.completed
  session-end → session.completed

MCP Tool Call → tool.called + tool.result
Agent Spawn → agent.created
```

---

#### AutoGen Event Mapping

```yaml
AutoGen Pattern → Common Event:
  on_message → message.sent
  speaker_selection → agent.selected
  group_chat_started → session.started
  agent_response → message.received
  tool_call → tool.called
  execution_complete → task.completed
```

---

#### LangGraph Event Mapping

```yaml
LangGraph Event → Common Event:
  on_chain_start → agent.started
  on_chain_stream → task.progress (streaming)
  on_tool_start → tool.called
  on_tool_end → tool.result
  on_chain_end → agent.completed
  checkpoint_saved → checkpoint.created
```

---

#### CrewAI Event Mapping

```yaml
CrewAI Event → Common Event:
  CrewKickoffStartedEvent → session.started
  AgentExecutionCompletedEvent → task.completed
  LLMStreamChunkEvent → message.chunk (streaming)
  TaskAssignedEvent → task.assigned
```

---

#### OpenCode Event Mapping

```yaml
OpenCode Event → Common Event:
  session.prompt → task.assigned
  llm.response → message.received
  tool.execution → tool.called
  result.persisted → state.updated
  event_bus.emit → [forwarded to TUI]
```

---

### 3.4 Handoff Schema

For agent-to-agent handoffs, we need additional structure:

```json
{
  "event_type": "handoff.initiated",
  "schema_version": "1.0.0",
  "payload": {
    "from_agent": {
      "agent_id": "researcher-1",
      "agent_type": "researcher",
      "framework": "claude-flow"
    },
    "to_agent": {
      "agent_id": "coder-2",
      "agent_type": "coder",
      "framework": "autogen"
    },
    "handoff_reason": "research_complete|blocked|escalation",
    "context": {
      "task_id": "task-123",
      "accumulated_context": {...},
      "resources": ["file1.py", "doc.md"],
      "decisions_made": [...]
    },
    "contract": {
      "schema_version": "1.0",
      "expected_output": {...},
      "validation_rules": [...]
    }
  }
}
```

**Handoff Best Practices** (from research):
- Define payloads with JSON Schema
- Include `schemaVersion` for compatibility
- Add `trace_id` for observability
- Use strict validators
- Implement contract tests
- Avoid silent field mismatches

**Sources**:
- [Best Practices for Multi-Agent Orchestration](https://skywork.ai/blog/ai-agent-orchestration-best-practices-handoffs/)

---

## 4. Adapter Implementation Guide

### 4.1 Adapter Architecture

The adapter pattern decouples framework-specific implementations from the TUI:

```
┌─────────────────────────────────────────┐
│           Flow Orchestrator TUI          │
│         (Bubble Tea / Go)               │
└─────────────────┬───────────────────────┘
                  │ Common Event Schema
                  │
┌─────────────────┴───────────────────────┐
│         Event Aggregation Layer         │
│    - Schema normalization               │
│    - Event buffering                    │
│    - State synchronization              │
└──┬────────┬────────┬────────┬───────┬──┘
   │        │        │        │       │
┌──┴──┐ ┌──┴──┐ ┌──┴──┐ ┌──┴──┐ ┌──┴──┐
│CF   │ │AG   │ │LG   │ │CA   │ │OC   │
│Adapt│ │Adapt│ │Adapt│ │Adapt│ │Adapt│
└──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘
   │        │        │        │       │
┌──┴──┐ ┌──┴──┐ ┌──┴──┐ ┌──┴──┐ ┌──┴──┐
│CF   │ │AG   │ │LG   │ │CA   │ │OC   │
│Frame│ │Frame│ │Frame│ │Frame│ │Frame│
└─────┘ └─────┘ └─────┘ └─────┘ └─────┘

CF=Claude Flow, AG=AutoGen, LG=LangGraph
CA=CrewAI, OC=OpenCode
```

---

### 4.2 Adapter Interface

Define a common interface all adapters must implement:

```go
// adapter/interface.go
package adapter

import (
    "context"
    "github.com/kvnloo/flow/events"
)

type FrameworkAdapter interface {
    // Lifecycle
    Initialize(ctx context.Context, config Config) error
    Start(ctx context.Context) error
    Stop(ctx context.Context) error

    // Event streaming
    EventStream(ctx context.Context) (<-chan events.Event, error)

    // Agent management
    ListAgents(ctx context.Context) ([]AgentInfo, error)
    SpawnAgent(ctx context.Context, req SpawnRequest) (string, error)

    // Task orchestration
    AssignTask(ctx context.Context, req TaskRequest) (string, error)
    GetTaskStatus(ctx context.Context, taskID string) (TaskStatus, error)

    // State management
    GetState(ctx context.Context) (State, error)

    // Metadata
    FrameworkName() string
    FrameworkVersion() string
    Capabilities() []string
}

type Config struct {
    ConnectionString string
    APIKey          string
    Options         map[string]interface{}
}

type AgentInfo struct {
    ID          string
    Type        string
    Status      string
    Capabilities []string
}

type SpawnRequest struct {
    AgentType   string
    Config      map[string]interface{}
}

type TaskRequest struct {
    AgentID     string
    TaskType    string
    Payload     interface{}
    Priority    string
}

type TaskStatus struct {
    TaskID      string
    Status      string
    Progress    float64
    Result      interface{}
}

type State struct {
    SessionID   string
    Agents      []AgentInfo
    Tasks       []TaskStatus
    Metadata    map[string]interface{}
}
```

---

### 4.3 Claude Flow Adapter

```go
// adapter/claudeflow/adapter.go
package claudeflow

import (
    "context"
    "encoding/json"
    "os/exec"
    "bufio"
    "github.com/kvnloo/flow/adapter"
    "github.com/kvnloo/flow/events"
)

type ClaudeFlowAdapter struct {
    config      adapter.Config
    eventChan   chan events.Event
    cmd         *exec.Cmd
}

func New() *ClaudeFlowAdapter {
    return &ClaudeFlowAdapter{
        eventChan: make(chan events.Event, 100),
    }
}

func (a *ClaudeFlowAdapter) Initialize(ctx context.Context, config adapter.Config) error {
    a.config = config
    return nil
}

func (a *ClaudeFlowAdapter) Start(ctx context.Context) error {
    // Start Claude Flow MCP server
    a.cmd = exec.CommandContext(ctx, "npx", "claude-flow@alpha", "mcp", "start")

    stdout, err := a.cmd.StdoutPipe()
    if err != nil {
        return err
    }

    if err := a.cmd.Start(); err != nil {
        return err
    }

    // Parse MCP events
    go a.parseEvents(ctx, stdout)

    return nil
}

func (a *ClaudeFlowAdapter) parseEvents(ctx context.Context, reader io.Reader) {
    scanner := bufio.NewScanner(reader)
    for scanner.Scan() {
        line := scanner.Text()

        // Parse JSON-RPC 2.0 messages
        var msg map[string]interface{}
        if err := json.Unmarshal([]byte(line), &msg); err != nil {
            continue
        }

        // Convert to common event schema
        event := a.convertToCommonEvent(msg)

        select {
        case a.eventChan <- event:
        case <-ctx.Done():
            return
        }
    }
}

func (a *ClaudeFlowAdapter) convertToCommonEvent(msg map[string]interface{}) events.Event {
    // Map Claude Flow hook events to common schema
    method := msg["method"].(string)

    switch method {
    case "hook.pre_task":
        return events.Event{
            SchemaVersion: "1.0.0",
            EventType:     "agent.started",
            Source: events.Source{
                Framework: "claude-flow",
                // ... extract from msg
            },
            Payload: msg["params"],
        }
    // ... other mappings
    }

    return events.Event{}
}

func (a *ClaudeFlowAdapter) EventStream(ctx context.Context) (<-chan events.Event, error) {
    return a.eventChan, nil
}

func (a *ClaudeFlowAdapter) SpawnAgent(ctx context.Context, req adapter.SpawnRequest) (string, error) {
    // Call claude-flow agent spawn
    cmd := exec.CommandContext(ctx,
        "npx", "claude-flow@alpha", "agent", "spawn",
        "--type", req.AgentType,
        "--config", toJSON(req.Config),
    )

    output, err := cmd.Output()
    if err != nil {
        return "", err
    }

    var result struct {
        AgentID string `json:"agent_id"`
    }
    json.Unmarshal(output, &result)

    return result.AgentID, nil
}

// ... implement other interface methods
```

---

### 4.4 AutoGen Adapter

```go
// adapter/autogen/adapter.go
package autogen

import (
    "context"
    "github.com/gorilla/websocket"
    "github.com/kvnloo/flow/adapter"
    "github.com/kvnloo/flow/events"
)

type AutoGenAdapter struct {
    config      adapter.Config
    eventChan   chan events.Event
    wsConn      *websocket.Conn
}

func New() *AutoGenAdapter {
    return &AutoGenAdapter{
        eventChan: make(chan events.Event, 100),
    }
}

func (a *AutoGenAdapter) Start(ctx context.Context) error {
    // Connect to AutoGen WebSocket endpoint
    conn, _, err := websocket.DefaultDialer.DialContext(
        ctx,
        a.config.ConnectionString,
        nil,
    )
    if err != nil {
        return err
    }
    a.wsConn = conn

    // Read WebSocket messages
    go a.readMessages(ctx)

    return nil
}

func (a *AutoGenAdapter) readMessages(ctx context.Context) {
    for {
        select {
        case <-ctx.Done():
            return
        default:
            var msg map[string]interface{}
            err := a.wsConn.ReadJSON(&msg)
            if err != nil {
                continue
            }

            // Convert AutoGen message to common event
            event := a.convertToCommonEvent(msg)
            a.eventChan <- event
        }
    }
}

func (a *AutoGenAdapter) convertToCommonEvent(msg map[string]interface{}) events.Event {
    msgType := msg["type"].(string)

    switch msgType {
    case "agent_message":
        return events.Event{
            SchemaVersion: "1.0.0",
            EventType:     "message.sent",
            Source: events.Source{
                Framework: "autogen",
                AgentID:   msg["sender"].(string),
            },
            Payload: msg["content"],
        }
    case "group_chat_start":
        return events.Event{
            EventType: "session.started",
            // ...
        }
    }

    return events.Event{}
}

// ... implement other interface methods
```

---

### 4.5 LangGraph Adapter

```go
// adapter/langgraph/adapter.go
package langgraph

import (
    "context"
    "bufio"
    "net/http"
    "github.com/kvnloo/flow/adapter"
    "github.com/kvnloo/flow/events"
)

type LangGraphAdapter struct {
    config      adapter.Config
    eventChan   chan events.Event
    client      *http.Client
}

func New() *LangGraphAdapter {
    return &LangGraphAdapter{
        eventChan: make(chan events.Event, 100),
        client:    &http.Client{},
    }
}

func (a *LangGraphAdapter) Start(ctx context.Context) error {
    // Connect to LangGraph SSE endpoint
    req, err := http.NewRequestWithContext(
        ctx,
        "GET",
        a.config.ConnectionString+"/stream",
        nil,
    )
    if err != nil {
        return err
    }

    resp, err := a.client.Do(req)
    if err != nil {
        return err
    }

    // Read SSE stream
    go a.readSSE(ctx, resp)

    return nil
}

func (a *LangGraphAdapter) readSSE(ctx context.Context, resp *http.Response) {
    defer resp.Body.Close()

    scanner := bufio.NewScanner(resp.Body)
    var currentEvent events.Event

    for scanner.Scan() {
        line := scanner.Text()

        if strings.HasPrefix(line, "event:") {
            currentEvent.EventType = strings.TrimSpace(line[6:])
        } else if strings.HasPrefix(line, "data:") {
            data := strings.TrimSpace(line[5:])
            var payload map[string]interface{}
            json.Unmarshal([]byte(data), &payload)

            // Convert LangGraph event to common schema
            event := a.convertToCommonEvent(currentEvent.EventType, payload)

            select {
            case a.eventChan <- event:
            case <-ctx.Done():
                return
            }
        }
    }
}

func (a *LangGraphAdapter) convertToCommonEvent(eventType string, payload map[string]interface{}) events.Event {
    switch eventType {
    case "on_chain_start":
        return events.Event{
            SchemaVersion: "1.0.0",
            EventType:     "agent.started",
            Source: events.Source{
                Framework: "langgraph",
            },
            Payload: payload,
        }
    case "on_tool_start":
        return events.Event{
            EventType: "tool.called",
            // ...
        }
    }

    return events.Event{}
}

// ... implement other interface methods
```

---

### 4.6 Event Aggregation Layer

```go
// aggregator/aggregator.go
package aggregator

import (
    "context"
    "sync"
    "github.com/kvnloo/flow/adapter"
    "github.com/kvnloo/flow/events"
)

type Aggregator struct {
    adapters    []adapter.FrameworkAdapter
    eventChan   chan events.Event
    mu          sync.RWMutex
}

func New() *Aggregator {
    return &Aggregator{
        adapters:  make([]adapter.FrameworkAdapter, 0),
        eventChan: make(chan events.Event, 1000),
    }
}

func (ag *Aggregator) RegisterAdapter(a adapter.FrameworkAdapter) {
    ag.mu.Lock()
    defer ag.mu.Unlock()
    ag.adapters = append(ag.adapters, a)
}

func (ag *Aggregator) Start(ctx context.Context) error {
    // Start all adapters
    for _, adapter := range ag.adapters {
        if err := adapter.Start(ctx); err != nil {
            return err
        }

        // Merge event streams
        go ag.mergeEvents(ctx, adapter)
    }

    return nil
}

func (ag *Aggregator) mergeEvents(ctx context.Context, a adapter.FrameworkAdapter) {
    stream, err := a.EventStream(ctx)
    if err != nil {
        return
    }

    for {
        select {
        case event := <-stream:
            // Add trace information
            event.Metadata["adapter"] = a.FrameworkName()

            // Forward to aggregated stream
            select {
            case ag.eventChan <- event:
            case <-ctx.Done():
                return
            }
        case <-ctx.Done():
            return
        }
    }
}

func (ag *Aggregator) EventStream() <-chan events.Event {
    return ag.eventChan
}
```

---

## 5. Real-time Communication Patterns

### 5.1 TUI Integration with Bubble Tea

The TUI consumes the aggregated event stream:

```go
// tui/model.go
package tui

import (
    tea "github.com/charmbracelet/bubbletea"
    "github.com/kvnloo/flow/events"
    "github.com/kvnloo/flow/aggregator"
)

type Model struct {
    aggregator  *aggregator.Aggregator
    agents      []AgentView
    tasks       []TaskView
    messages    []MessageView
    width       int
    height      int
}

type AgentView struct {
    ID          string
    Framework   string
    Type        string
    Status      string
}

type TaskView struct {
    ID          string
    AgentID     string
    Progress    float64
    Status      string
}

type MessageView struct {
    Timestamp   string
    From        string
    To          string
    Content     string
}

// Bubble Tea messages
type eventMsg events.Event
type tickMsg time.Time

func (m Model) Init() tea.Cmd {
    return tea.Batch(
        listenForEvents(m.aggregator),
        tickCmd(),
    )
}

func listenForEvents(ag *aggregator.Aggregator) tea.Cmd {
    return func() tea.Msg {
        event := <-ag.EventStream()
        return eventMsg(event)
    }
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case eventMsg:
        // Handle event
        m = m.handleEvent(events.Event(msg))

        // Continue listening
        return m, listenForEvents(m.aggregator)

    case tea.KeyMsg:
        // Handle keyboard input
        // ...

    case tea.WindowSizeMsg:
        m.width = msg.Width
        m.height = msg.Height
    }

    return m, nil
}

func (m Model) handleEvent(event events.Event) Model {
    switch event.EventType {
    case "agent.started":
        // Add agent to view
        m.agents = append(m.agents, AgentView{
            ID:        event.Source.AgentID,
            Framework: event.Source.Framework,
            Type:      event.Source.AgentType,
            Status:    "running",
        })

    case "task.progress":
        // Update task progress
        for i, task := range m.tasks {
            if task.ID == event.Payload["task_id"].(string) {
                m.tasks[i].Progress = event.Payload["progress_percent"].(float64)
                break
            }
        }

    case "message.sent":
        // Add message to log
        m.messages = append(m.messages, MessageView{
            Timestamp: event.Timestamp,
            From:      event.Payload["from_agent"].(string),
            To:        event.Payload["to_agent"].(string),
            Content:   event.Payload["content"].(string),
        })
    }

    return m
}

func (m Model) View() string {
    // Render TUI using lipgloss
    return lipgloss.JoinVertical(
        lipgloss.Left,
        m.renderHeader(),
        m.renderAgents(),
        m.renderTasks(),
        m.renderMessages(),
    )
}
```

---

### 5.2 Component Architecture

```
┌──────────────────────────────────────────┐
│              Header Bar                  │
│  Flow Orchestrator | 5 Agents | 3 Tasks  │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│          Agent Panel                     │
│  ┌────────┐ ┌────────┐ ┌────────┐       │
│  │ CF     │ │ AG     │ │ LG     │       │
│  │ Coder  │ │ Manager│ │ State  │       │
│  │ ●      │ │ ●      │ │ ●      │       │
│  └────────┘ └────────┘ └────────┘       │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│          Task Panel                      │
│  Task-1: Code Analysis    [████░░] 80%   │
│  Task-2: Implementation   [██░░░░] 40%   │
│  Task-3: Testing          [░░░░░░] 0%    │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│          Message Log                     │
│  10:30:15 [Manager→Coder] Analyze main.py│
│  10:30:16 [Coder→Manager] Found 3 issues │
│  10:30:20 [Manager→Tester] Run tests     │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│  Commands: [q]uit [s]pawn [t]ask [f]ilter│
└──────────────────────────────────────────┘
```

---

### 5.3 Filtering and Views

```go
// tui/filters.go
package tui

type Filter struct {
    Framework   []string
    EventType   []string
    Severity    []string
    AgentID     string
}

func (m Model) applyFilter(event events.Event) bool {
    f := m.filter

    // Framework filter
    if len(f.Framework) > 0 {
        if !contains(f.Framework, event.Source.Framework) {
            return false
        }
    }

    // Event type filter
    if len(f.EventType) > 0 {
        if !contains(f.EventType, event.EventType) {
            return false
        }
    }

    // Severity filter
    if len(f.Severity) > 0 {
        if !contains(f.Severity, event.Severity) {
            return false
        }
    }

    // Agent filter
    if f.AgentID != "" {
        if event.Source.AgentID != f.AgentID {
            return false
        }
    }

    return true
}
```

---

### 5.4 State Synchronization

```go
// state/sync.go
package state

import (
    "sync"
    "github.com/kvnloo/flow/events"
)

type StateManager struct {
    agents      map[string]AgentState
    tasks       map[string]TaskState
    sessions    map[string]SessionState
    mu          sync.RWMutex
}

type AgentState struct {
    ID          string
    Framework   string
    Type        string
    Status      string
    Metadata    map[string]interface{}
}

type TaskState struct {
    ID          string
    AgentID     string
    Status      string
    Progress    float64
    Result      interface{}
}

type SessionState struct {
    ID          string
    Framework   string
    Started     time.Time
    Status      string
}

func (sm *StateManager) ApplyEvent(event events.Event) {
    sm.mu.Lock()
    defer sm.mu.Unlock()

    switch event.EventType {
    case "agent.started":
        sm.agents[event.Source.AgentID] = AgentState{
            ID:        event.Source.AgentID,
            Framework: event.Source.Framework,
            Type:      event.Source.AgentType,
            Status:    "running",
        }

    case "agent.completed":
        if agent, ok := sm.agents[event.Source.AgentID]; ok {
            agent.Status = "completed"
            sm.agents[event.Source.AgentID] = agent
        }

    case "task.assigned":
        taskID := event.Payload["task_id"].(string)
        sm.tasks[taskID] = TaskState{
            ID:       taskID,
            AgentID:  event.Payload["agent_id"].(string),
            Status:   "assigned",
            Progress: 0,
        }

    case "task.progress":
        taskID := event.Payload["task_id"].(string)
        if task, ok := sm.tasks[taskID]; ok {
            task.Progress = event.Payload["progress_percent"].(float64)
            task.Status = "in_progress"
            sm.tasks[taskID] = task
        }

    case "task.completed":
        taskID := event.Payload["task_id"].(string)
        if task, ok := sm.tasks[taskID]; ok {
            task.Status = event.Payload["status"].(string)
            task.Progress = 100
            task.Result = event.Payload["result"]
            sm.tasks[taskID] = task
        }
    }
}

func (sm *StateManager) GetAgents() []AgentState {
    sm.mu.RLock()
    defer sm.mu.RUnlock()

    agents := make([]AgentState, 0, len(sm.agents))
    for _, agent := range sm.agents {
        agents = append(agents, agent)
    }
    return agents
}

func (sm *StateManager) GetTasks() []TaskState {
    sm.mu.RLock()
    defer sm.mu.RUnlock()

    tasks := make([]TaskState, 0, len(sm.tasks))
    for _, task := range sm.tasks {
        tasks = append(tasks, task)
    }
    return tasks
}
```

---

## 6. Recommendations for Flow Orchestrator

### 6.1 Architecture Recommendations

1. **Use Adapter Pattern**: Implement framework-specific adapters that translate to common event schema
2. **Embrace SSE**: Server-Sent Events are ideal for TUI streaming (one-way, auto-reconnect)
3. **JSON-RPC 2.0**: Adopt as the wire protocol for consistency with MCP and A2A
4. **Event-Driven Design**: Build on event bus pattern for scalability
5. **State Management**: Centralize state with StateManager for consistency

---

### 6.2 Implementation Priorities

**Phase 1: Foundation**
- [ ] Define common event schema
- [ ] Implement adapter interface
- [ ] Build event aggregation layer
- [ ] Create basic TUI with Bubble Tea

**Phase 2: Framework Integration**
- [ ] Implement Claude Flow adapter (MCP stdio)
- [ ] Implement AutoGen adapter (WebSocket)
- [ ] Implement LangGraph adapter (SSE)
- [ ] Implement OpenCode adapter (SSE)
- [ ] Implement CrewAI adapter (Events)

**Phase 3: Features**
- [ ] Real-time event filtering
- [ ] Agent spawn/management
- [ ] Task assignment
- [ ] State persistence
- [ ] Tracing integration

**Phase 4: Advanced**
- [ ] Cross-framework handoffs
- [ ] Unified configuration
- [ ] Performance monitoring
- [ ] Error recovery

---

### 6.3 Technology Stack

**Core Language**: Go
- Performance
- Concurrency
- Static typing
- Excellent TUI libraries

**TUI Framework**: Bubble Tea
- Elm Architecture
- Composable components
- Active ecosystem
- Proven in production (10K+ apps)

**Complementary Libraries**:
- `lipgloss`: Styling
- `bubbles`: UI components
- `glamour`: Markdown rendering
- `gorilla/websocket`: WebSocket client

**Event Streaming**:
- SSE: Standard `http` library
- WebSocket: `gorilla/websocket`
- JSON-RPC: Custom parser

---

### 6.4 Event Schema Guidelines

1. **Versioning**: Always include `schema_version` for evolution
2. **Tracing**: Include `trace_id` for distributed tracing
3. **Timestamps**: Use ISO8601 format
4. **IDs**: Use UUIDv4 for global uniqueness
5. **Metadata**: Extensible metadata field for custom data
6. **Payload**: Keep framework-specific data in payload
7. **Categories**: Use consistent event categories
8. **Severity**: Include severity for filtering

---

### 6.5 Testing Strategy

**Unit Tests**:
- Adapter event conversion
- Event schema validation
- State manager updates
- Filter logic

**Integration Tests**:
- Adapter connectivity
- Event streaming
- Cross-framework communication
- State synchronization

**End-to-End Tests**:
- Full TUI workflows
- Multi-framework scenarios
- Performance under load
- Error recovery

---

### 6.6 Performance Considerations

1. **Event Buffering**: Use channels with appropriate buffer sizes
2. **Concurrent Processing**: Process events from different adapters in parallel
3. **State Caching**: Cache frequently accessed state
4. **Memory Management**: Limit event history size
5. **Connection Pooling**: Reuse connections where possible

**Benchmarks to Track**:
- Events per second throughput
- Latency (event to UI update)
- Memory usage
- CPU usage
- Connection count

---

### 6.7 Error Handling

**Adapter Failures**:
- Graceful degradation (continue with working adapters)
- Automatic reconnection with exponential backoff
- Clear error messages to user
- Recovery without data loss

**Event Processing Errors**:
- Log malformed events
- Continue processing other events
- Report validation failures
- Support manual retry

**Network Issues**:
- Detect disconnections
- Buffer events during reconnection
- Replay missed events
- Show connection status in TUI

---

### 6.8 Configuration

```yaml
# flow.yaml
orchestrator:
  port: 8080
  buffer_size: 1000
  max_event_age: 3600  # seconds

frameworks:
  claude_flow:
    enabled: true
    connection: "stdio"
    command: ["npx", "claude-flow@alpha", "mcp", "start"]

  autogen:
    enabled: true
    connection: "websocket"
    url: "ws://localhost:8765"

  langgraph:
    enabled: true
    connection: "sse"
    url: "http://localhost:8000/stream"

  crewai:
    enabled: true
    connection: "webhook"
    port: 9000

  opencode:
    enabled: true
    connection: "sse"
    url: "http://localhost:3000/sse"

ui:
  theme: "dark"
  update_interval: 100  # ms
  max_messages: 1000
  filters:
    default_frameworks: ["claude_flow", "autogen"]
    default_severity: ["info", "warning", "error"]

logging:
  level: "info"
  file: "/tmp/flow-orchestrator.log"
  format: "json"

tracing:
  enabled: true
  exporter: "jaeger"
  endpoint: "http://localhost:14268/api/traces"
```

---

### 6.9 Security Considerations

1. **API Keys**: Store securely, never log
2. **Connection Auth**: Support token-based auth
3. **Input Validation**: Validate all external events
4. **Rate Limiting**: Prevent event flooding
5. **Isolation**: Sandbox adapter processes

---

### 6.10 Documentation Needs

1. **Architecture Guide**: High-level design and patterns
2. **Adapter Development**: How to add new frameworks
3. **Event Schema**: Complete event catalog
4. **Configuration**: All config options
5. **Troubleshooting**: Common issues and solutions
6. **Examples**: Sample integrations

---

## 7. References

### Framework Documentation
- [Claude Flow GitHub](https://github.com/ruvnet/claude-flow)
- [AutoGen Documentation](https://microsoft.github.io/autogen/)
- [LangGraph Documentation](https://www.langchain.com/langgraph)
- [CrewAI Documentation](https://docs.crewai.com/)
- [OpenCode Documentation](https://opencode.ai/docs/)

### Protocol Specifications
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [A2A Protocol Specification](https://a2a-protocol.org/latest/specification/)
- [MCP Specification](https://modelcontextprotocol.io/specification/2025-06-18)

### Communication Technologies
- [WebSockets vs SSE Comparison](https://ably.com/blog/websockets-vs-sse)
- [SSE MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [WebSocket RFC 6455](https://tools.ietf.org/html/rfc6455)

### Orchestration Patterns
- [Event-Driven Multi-Agent Systems](https://www.confluent.io/blog/event-driven-multi-agent-systems/)
- [AI Agent Orchestration Patterns (Azure)](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)
- [Multi-Agent Orchestration Best Practices](https://skywork.ai/blog/ai-agent-orchestration-best-practices-handoffs/)

### TUI Development
- [Bubble Tea Framework](https://github.com/charmbracelet/bubbletea)
- [Building TUI Apps](https://themarkokovacevic.com/posts/terminal-ui-with-bubbletea/)
- [Charm Libraries](https://charm.sh)

### Additional Resources
- [AutoGen WebSocket Streaming](https://microsoft.github.io/autogen/docs/notebooks/agentchat_websockets/)
- [LangGraph Streaming API](https://docs.langchain.com/langsmith/streaming)
- [CrewAI Event Listeners](https://docs.crewai.com/en/concepts/event-listener)
- [MCP Introduction](https://www.ibm.com/think/topics/model-context-protocol)

---

## Appendix A: Event Schema JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Flow Orchestrator Event",
  "type": "object",
  "required": ["schema_version", "event_id", "timestamp", "source", "event_type"],
  "properties": {
    "schema_version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Semantic version of event schema"
    },
    "event_id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique identifier for this event"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO8601 timestamp when event occurred"
    },
    "source": {
      "type": "object",
      "required": ["framework"],
      "properties": {
        "framework": {
          "type": "string",
          "enum": ["claude-flow", "autogen", "langgraph", "crewai", "opencode"]
        },
        "agent_id": {
          "type": "string"
        },
        "agent_type": {
          "type": "string"
        },
        "session_id": {
          "type": "string"
        }
      }
    },
    "event_type": {
      "type": "string",
      "pattern": "^[a-z]+\\.[a-z_]+$",
      "examples": [
        "agent.started",
        "agent.completed",
        "task.assigned",
        "message.sent"
      ]
    },
    "event_category": {
      "type": "string",
      "enum": ["lifecycle", "communication", "execution", "error", "state"]
    },
    "severity": {
      "type": "string",
      "enum": ["debug", "info", "warning", "error", "critical"]
    },
    "payload": {
      "type": "object",
      "description": "Event-specific data"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "trace_id": {
          "type": "string"
        },
        "parent_event_id": {
          "type": "string",
          "format": "uuid"
        },
        "tags": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      }
    }
  }
}
```

---

## Appendix B: Adapter Checklist

When implementing a new framework adapter, ensure:

- [ ] Implements `FrameworkAdapter` interface
- [ ] Converts all framework events to common schema
- [ ] Handles connection failures gracefully
- [ ] Supports reconnection with backoff
- [ ] Validates event schema
- [ ] Logs errors appropriately
- [ ] Includes unit tests for event conversion
- [ ] Includes integration tests
- [ ] Documents configuration options
- [ ] Provides usage examples
- [ ] Handles framework-specific quirks
- [ ] Supports multiple concurrent connections
- [ ] Cleans up resources on shutdown
- [ ] Exposes metrics
- [ ] Includes health checks

---

## Appendix C: Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Event Latency | < 50ms | Event generation → TUI display |
| Throughput | > 1000 events/sec | Sustained load |
| Memory Usage | < 100MB | Idle state |
| Memory Growth | < 10MB/hour | Under load |
| CPU Usage | < 5% | Idle state |
| CPU Usage | < 50% | Under load |
| Connection Time | < 2s | Adapter initialization |
| Reconnection Time | < 5s | After failure |
| UI Responsiveness | < 16ms | Frame time (60fps) |
| Event Buffer | 10,000 events | Before backpressure |

---

## Conclusion

This deep dive research reveals a rapidly maturing ecosystem of multi-agent orchestration frameworks converging on common standards (JSON-RPC 2.0, SSE, MCP, A2A). The Flow Orchestrator TUI has a clear path to unified integration:

**Key Takeaways**:

1. **Adapter Pattern Works**: Each framework has distinct APIs but similar concepts (agents, tasks, events)
2. **Standards are Emerging**: MCP and A2A provide interoperability foundations
3. **SSE is Ideal for TUI**: One-way streaming with auto-reconnect fits TUI needs
4. **Event Schema is Critical**: Common schema enables cross-framework understanding
5. **Bubble Tea is Proven**: Elm Architecture + Go provides solid TUI foundation

**Next Steps**:
1. Implement core event schema and adapter interface
2. Build Claude Flow adapter first (MCP-native)
3. Add AutoGen adapter (WebSocket validation)
4. Expand to LangGraph, CrewAI, OpenCode
5. Iterate on UX based on real usage

The path forward is clear: unified event streaming through framework-specific adapters consumed by a Bubble Tea TUI, enabling real-time monitoring and control of multi-framework agent orchestrations.

---

**End of Document**