/// Agent graph and network topology management

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

use super::{Agent, AgentId};

/// Unique identifier for a cluster
pub type ClusterId = Uuid;

/// Graph representation of the agent network
///
/// This structure maintains the topology of agents including their
/// hierarchical relationships (parent-child) and cluster memberships.
#[derive(Debug, Clone)]
pub struct AgentGraph {
    /// All agents indexed by ID
    nodes: HashMap<AgentId, Agent>,

    /// Edges representing relationships (parent -> children)
    edges: HashMap<AgentId, HashSet<AgentId>>,

    /// All clusters
    clusters: HashMap<ClusterId, Cluster>,

    /// Root agents (agents with no parent)
    roots: Vec<AgentId>,
}

impl AgentGraph {
    /// Create a new empty agent graph
    pub fn new() -> Self {
        Self {
            nodes: HashMap::new(),
            edges: HashMap::new(),
            clusters: HashMap::new(),
            roots: Vec::new(),
        }
    }

    /// Add an agent to the graph
    pub fn add_agent(&mut self, agent: Agent) {
        let id = agent.id;
        let is_root = agent.parent.is_none();

        // Add node
        self.nodes.insert(id, agent);

        // Initialize edges
        self.edges.entry(id).or_default();

        // Track root agents
        if is_root && !self.roots.contains(&id) {
            self.roots.push(id);
        }
    }

    /// Remove an agent from the graph
    pub fn remove_agent(&mut self, agent_id: &AgentId) -> Option<Agent> {
        // Remove from roots if present
        self.roots.retain(|id| id != agent_id);

        // Remove all edges to this agent
        for edges in self.edges.values_mut() {
            edges.remove(agent_id);
        }

        // Remove edges from this agent
        self.edges.remove(agent_id);

        // Remove from all clusters
        for cluster in self.clusters.values_mut() {
            cluster.members.retain(|id| id != agent_id);
        }

        // Remove the node
        self.nodes.remove(agent_id)
    }

    /// Add a relationship edge between two agents
    pub fn add_edge(&mut self, from: AgentId, to: AgentId) {
        self.edges.entry(from).or_default().insert(to);
    }

    /// Remove a relationship edge
    pub fn remove_edge(&mut self, from: &AgentId, to: &AgentId) -> bool {
        if let Some(edges) = self.edges.get_mut(from) {
            edges.remove(to)
        } else {
            false
        }
    }

    /// Get an agent by ID
    pub fn get_agent(&self, id: &AgentId) -> Option<&Agent> {
        self.nodes.get(id)
    }

    /// Get a mutable reference to an agent
    pub fn get_agent_mut(&mut self, id: &AgentId) -> Option<&mut Agent> {
        self.nodes.get_mut(id)
    }

    /// Get all agents
    pub fn agents(&self) -> impl Iterator<Item = &Agent> {
        self.nodes.values()
    }

    /// Get the children of an agent
    pub fn get_children(&self, id: &AgentId) -> Vec<AgentId> {
        self.edges
            .get(id)
            .map(|set| set.iter().copied().collect())
            .unwrap_or_default()
    }

    /// Get the parent of an agent
    pub fn get_parent(&self, id: &AgentId) -> Option<AgentId> {
        self.nodes.get(id).and_then(|agent| agent.parent)
    }

    /// Get all root agents (agents with no parent)
    pub fn roots(&self) -> &[AgentId] {
        &self.roots
    }

    /// Add a cluster to the graph
    pub fn add_cluster(&mut self, cluster: Cluster) {
        self.clusters.insert(cluster.id, cluster);
    }

    /// Remove a cluster
    pub fn remove_cluster(&mut self, cluster_id: &ClusterId) -> Option<Cluster> {
        // Remove cluster from all agents
        for agent in self.nodes.values_mut() {
            if agent.cluster == Some(*cluster_id) {
                agent.cluster = None;
            }
        }

        self.clusters.remove(cluster_id)
    }

    /// Get a cluster by ID
    pub fn get_cluster(&self, id: &ClusterId) -> Option<&Cluster> {
        self.clusters.get(id)
    }

    /// Get all clusters
    pub fn clusters(&self) -> impl Iterator<Item = &Cluster> {
        self.clusters.values()
    }

    /// Get all members of a cluster
    pub fn get_cluster_members(&self, cluster_id: &ClusterId) -> Vec<AgentId> {
        self.clusters
            .get(cluster_id)
            .map(|c| c.members.clone())
            .unwrap_or_default()
    }

    /// Get the total number of agents
    pub fn agent_count(&self) -> usize {
        self.nodes.len()
    }

    /// Get the total number of clusters
    pub fn cluster_count(&self) -> usize {
        self.clusters.len()
    }

    /// Check if the graph contains an agent
    pub fn contains_agent(&self, id: &AgentId) -> bool {
        self.nodes.contains_key(id)
    }

    /// Clear all agents and clusters
    pub fn clear(&mut self) {
        self.nodes.clear();
        self.edges.clear();
        self.clusters.clear();
        self.roots.clear();
    }
}

impl Default for AgentGraph {
    fn default() -> Self {
        Self::new()
    }
}

/// Agent cluster/group
///
/// A cluster is a logical grouping of agents that work together,
/// often with a specific topology governing their interactions.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Cluster {
    /// Unique identifier
    pub id: ClusterId,

    /// Cluster name
    pub name: String,

    /// Cluster type/purpose
    pub cluster_type: ClusterType,

    /// Member agent IDs
    pub members: Vec<AgentId>,

    /// Topology within the cluster
    pub topology: Topology,

    /// Additional metadata
    pub metadata: HashMap<String, String>,
}

impl Cluster {
    /// Create a new cluster
    pub fn new(name: String, cluster_type: ClusterType, topology: Topology) -> Self {
        Self {
            id: Uuid::new_v4(),
            name,
            cluster_type,
            members: Vec::new(),
            topology,
            metadata: HashMap::new(),
        }
    }

    /// Add a member to the cluster
    pub fn add_member(&mut self, agent_id: AgentId) {
        if !self.members.contains(&agent_id) {
            self.members.push(agent_id);
        }
    }

    /// Remove a member from the cluster
    pub fn remove_member(&mut self, agent_id: &AgentId) -> bool {
        if let Some(pos) = self.members.iter().position(|id| id == agent_id) {
            self.members.remove(pos);
            true
        } else {
            false
        }
    }

    /// Get the number of members
    pub fn member_count(&self) -> usize {
        self.members.len()
    }

    /// Check if an agent is a member
    pub fn contains_member(&self, agent_id: &AgentId) -> bool {
        self.members.contains(agent_id)
    }
}

/// Cluster type enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ClusterType {
    Backend,
    Frontend,
    Research,
    Testing,
    Custom(String),
}

impl ClusterType {
    /// Get a display name for the cluster type
    pub fn display_name(&self) -> &str {
        match self {
            Self::Backend => "Backend",
            Self::Frontend => "Frontend",
            Self::Research => "Research",
            Self::Testing => "Testing",
            Self::Custom(name) => name,
        }
    }
}

/// Network topology enumeration
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Topology {
    /// Hierarchical tree structure
    Hierarchical,

    /// Fully connected mesh
    Mesh,

    /// Ring structure
    Ring,

    /// Star structure with central coordinator
    Star,

    /// Adaptive topology that changes based on workload
    Adaptive,
}

impl Topology {
    /// Get a display name for the topology
    pub fn display_name(&self) -> &str {
        match self {
            Self::Hierarchical => "Hierarchical",
            Self::Mesh => "Mesh",
            Self::Ring => "Ring",
            Self::Star => "Star",
            Self::Adaptive => "Adaptive",
        }
    }

    /// Get a description of the topology
    pub fn description(&self) -> &str {
        match self {
            Self::Hierarchical => "Tree structure with parent-child relationships",
            Self::Mesh => "Fully connected network where all agents can communicate",
            Self::Ring => "Circular structure where agents communicate with neighbors",
            Self::Star => "Central coordinator with spoke agents",
            Self::Adaptive => "Dynamic topology that adjusts based on workload",
        }
    }
}
