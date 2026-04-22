/// Agent graph unit tests following London School TDD approach
///
/// Tests verify graph topology management, cluster operations,
/// and agent relationship tracking through behavioral contracts.

use flow_orchestrator_tui::state::{
    Agent, AgentGraph, AgentRole, Cluster, ClusterType, Topology,
    agent::Framework,
};
use uuid::Uuid;

// ============================================================================
// AgentGraph Creation Tests
// ============================================================================

#[test]
fn test_agent_graph_new() {
    let graph = AgentGraph::new();

    assert_eq!(graph.agent_count(), 0);
    assert_eq!(graph.cluster_count(), 0);
    assert_eq!(graph.roots().len(), 0);
}

#[test]
fn test_agent_graph_default() {
    let graph = AgentGraph::default();

    assert_eq!(graph.agent_count(), 0);
}

// ============================================================================
// Agent Management Tests
// ============================================================================

#[test]
fn test_add_agent_increases_count() {
    let mut graph = AgentGraph::new();
    let agent = Agent::new(
        AgentRole::Coder,
        "Test Agent".to_string(),
        Framework::ClaudeFlow,
    );

    graph.add_agent(agent);

    assert_eq!(graph.agent_count(), 1);
}

#[test]
fn test_add_agent_tracks_root_agents() {
    let mut graph = AgentGraph::new();
    let agent = Agent::new(
        AgentRole::Coordinator,
        "Root".to_string(),
        Framework::ClaudeFlow,
    );
    let agent_id = agent.id;

    graph.add_agent(agent);

    assert_eq!(graph.roots().len(), 1);
    assert!(graph.roots().contains(&agent_id));
}

#[test]
fn test_add_agent_with_parent_not_in_roots() {
    let mut graph = AgentGraph::new();
    let mut agent = Agent::new(
        AgentRole::Coder,
        "Child".to_string(),
        Framework::ClaudeFlow,
    );
    agent.set_parent(Uuid::new_v4());

    graph.add_agent(agent);

    assert_eq!(graph.roots().len(), 0);
}

#[test]
fn test_get_agent_returns_agent_by_id() {
    let mut graph = AgentGraph::new();
    let agent = Agent::new(
        AgentRole::Coder,
        "Test".to_string(),
        Framework::ClaudeFlow,
    );
    let agent_id = agent.id;

    graph.add_agent(agent);

    let retrieved = graph.get_agent(&agent_id);
    assert!(retrieved.is_some());
    assert_eq!(retrieved.unwrap().id, agent_id);
}

#[test]
fn test_get_agent_returns_none_when_not_found() {
    let graph = AgentGraph::new();
    let random_id = Uuid::new_v4();

    let retrieved = graph.get_agent(&random_id);
    assert!(retrieved.is_none());
}

#[test]
fn test_get_agent_mut_allows_modification() {
    let mut graph = AgentGraph::new();
    let agent = Agent::new(
        AgentRole::Coder,
        "Test".to_string(),
        Framework::ClaudeFlow,
    );
    let agent_id = agent.id;

    graph.add_agent(agent);

    {
        let agent_mut = graph.get_agent_mut(&agent_id).unwrap();
        agent_mut.add_capability("rust");
    }

    let agent = graph.get_agent(&agent_id).unwrap();
    assert!(agent.has_capability("rust"));
}

#[test]
fn test_remove_agent_decreases_count() {
    let mut graph = AgentGraph::new();
    let agent = Agent::new(
        AgentRole::Coder,
        "Test".to_string(),
        Framework::ClaudeFlow,
    );
    let agent_id = agent.id;

    graph.add_agent(agent);
    assert_eq!(graph.agent_count(), 1);

    let removed = graph.remove_agent(&agent_id);
    assert!(removed.is_some());
    assert_eq!(graph.agent_count(), 0);
}

#[test]
fn test_remove_agent_removes_from_roots() {
    let mut graph = AgentGraph::new();
    let agent = Agent::new(
        AgentRole::Coordinator,
        "Root".to_string(),
        Framework::ClaudeFlow,
    );
    let agent_id = agent.id;

    graph.add_agent(agent);
    assert_eq!(graph.roots().len(), 1);

    graph.remove_agent(&agent_id);
    assert_eq!(graph.roots().len(), 0);
}

#[test]
fn test_remove_agent_returns_none_when_not_found() {
    let mut graph = AgentGraph::new();
    let random_id = Uuid::new_v4();

    let removed = graph.remove_agent(&random_id);
    assert!(removed.is_none());
}

#[test]
fn test_contains_agent_returns_true_when_present() {
    let mut graph = AgentGraph::new();
    let agent = Agent::new(
        AgentRole::Coder,
        "Test".to_string(),
        Framework::ClaudeFlow,
    );
    let agent_id = agent.id;

    graph.add_agent(agent);

    assert!(graph.contains_agent(&agent_id));
}

#[test]
fn test_contains_agent_returns_false_when_absent() {
    let graph = AgentGraph::new();
    let random_id = Uuid::new_v4();

    assert!(!graph.contains_agent(&random_id));
}

#[test]
fn test_agents_iterates_all_agents() {
    let mut graph = AgentGraph::new();

    for i in 0..5 {
        let agent = Agent::new(
            AgentRole::Coder,
            format!("Agent {}", i),
            Framework::ClaudeFlow,
        );
        graph.add_agent(agent);
    }

    let count = graph.agents().count();
    assert_eq!(count, 5);
}

// ============================================================================
// Edge Management Tests
// ============================================================================

#[test]
fn test_add_edge_creates_relationship() {
    let mut graph = AgentGraph::new();
    let agent1 = Agent::new(
        AgentRole::Coordinator,
        "Parent".to_string(),
        Framework::ClaudeFlow,
    );
    let agent2 = Agent::new(
        AgentRole::Coder,
        "Child".to_string(),
        Framework::ClaudeFlow,
    );

    let parent_id = agent1.id;
    let child_id = agent2.id;

    graph.add_agent(agent1);
    graph.add_agent(agent2);

    graph.add_edge(parent_id, child_id);

    let children = graph.get_children(&parent_id);
    assert_eq!(children.len(), 1);
    assert!(children.contains(&child_id));
}

#[test]
fn test_get_children_returns_empty_when_no_children() {
    let mut graph = AgentGraph::new();
    let agent = Agent::new(
        AgentRole::Coder,
        "Leaf".to_string(),
        Framework::ClaudeFlow,
    );
    let agent_id = agent.id;

    graph.add_agent(agent);

    let children = graph.get_children(&agent_id);
    assert!(children.is_empty());
}

#[test]
fn test_get_parent_returns_parent_id() {
    let mut graph = AgentGraph::new();
    let mut child = Agent::new(
        AgentRole::Coder,
        "Child".to_string(),
        Framework::ClaudeFlow,
    );
    let parent_id = Uuid::new_v4();
    child.set_parent(parent_id);
    let child_id = child.id;

    graph.add_agent(child);

    let parent = graph.get_parent(&child_id);
    assert_eq!(parent, Some(parent_id));
}

#[test]
fn test_get_parent_returns_none_for_root() {
    let mut graph = AgentGraph::new();
    let agent = Agent::new(
        AgentRole::Coordinator,
        "Root".to_string(),
        Framework::ClaudeFlow,
    );
    let agent_id = agent.id;

    graph.add_agent(agent);

    let parent = graph.get_parent(&agent_id);
    assert!(parent.is_none());
}

#[test]
fn test_remove_edge_removes_relationship() {
    let mut graph = AgentGraph::new();
    let parent_id = Uuid::new_v4();
    let child_id = Uuid::new_v4();

    graph.add_edge(parent_id, child_id);
    assert_eq!(graph.get_children(&parent_id).len(), 1);

    let removed = graph.remove_edge(&parent_id, &child_id);
    assert!(removed);
    assert_eq!(graph.get_children(&parent_id).len(), 0);
}

#[test]
fn test_remove_edge_returns_false_when_not_found() {
    let mut graph = AgentGraph::new();
    let parent_id = Uuid::new_v4();
    let child_id = Uuid::new_v4();

    let removed = graph.remove_edge(&parent_id, &child_id);
    assert!(!removed);
}

// ============================================================================
// Cluster Management Tests
// ============================================================================

#[test]
fn test_add_cluster_increases_count() {
    let mut graph = AgentGraph::new();
    let cluster = Cluster::new(
        "Test Cluster".to_string(),
        ClusterType::Backend,
        Topology::Mesh,
    );

    graph.add_cluster(cluster);

    assert_eq!(graph.cluster_count(), 1);
}

#[test]
fn test_get_cluster_returns_cluster_by_id() {
    let mut graph = AgentGraph::new();
    let cluster = Cluster::new(
        "Test".to_string(),
        ClusterType::Backend,
        Topology::Mesh,
    );
    let cluster_id = cluster.id;

    graph.add_cluster(cluster);

    let retrieved = graph.get_cluster(&cluster_id);
    assert!(retrieved.is_some());
    assert_eq!(retrieved.unwrap().id, cluster_id);
}

#[test]
fn test_get_cluster_returns_none_when_not_found() {
    let graph = AgentGraph::new();
    let random_id = Uuid::new_v4();

    let retrieved = graph.get_cluster(&random_id);
    assert!(retrieved.is_none());
}

#[test]
fn test_remove_cluster_decreases_count() {
    let mut graph = AgentGraph::new();
    let cluster = Cluster::new(
        "Test".to_string(),
        ClusterType::Backend,
        Topology::Mesh,
    );
    let cluster_id = cluster.id;

    graph.add_cluster(cluster);
    assert_eq!(graph.cluster_count(), 1);

    let removed = graph.remove_cluster(&cluster_id);
    assert!(removed.is_some());
    assert_eq!(graph.cluster_count(), 0);
}

#[test]
fn test_remove_cluster_clears_agent_cluster_references() {
    let mut graph = AgentGraph::new();
    let cluster = Cluster::new(
        "Test".to_string(),
        ClusterType::Backend,
        Topology::Mesh,
    );
    let cluster_id = cluster.id;

    let mut agent = Agent::new(
        AgentRole::Coder,
        "Test".to_string(),
        Framework::ClaudeFlow,
    );
    agent.cluster = Some(cluster_id);
    let agent_id = agent.id;

    graph.add_cluster(cluster);
    graph.add_agent(agent);

    graph.remove_cluster(&cluster_id);

    let agent = graph.get_agent(&agent_id).unwrap();
    assert!(agent.cluster.is_none());
}

#[test]
fn test_get_cluster_members_returns_member_ids() {
    let mut graph = AgentGraph::new();
    let mut cluster = Cluster::new(
        "Test".to_string(),
        ClusterType::Backend,
        Topology::Mesh,
    );

    let agent1_id = Uuid::new_v4();
    let agent2_id = Uuid::new_v4();
    cluster.add_member(agent1_id);
    cluster.add_member(agent2_id);

    let cluster_id = cluster.id;
    graph.add_cluster(cluster);

    let members = graph.get_cluster_members(&cluster_id);
    assert_eq!(members.len(), 2);
    assert!(members.contains(&agent1_id));
    assert!(members.contains(&agent2_id));
}

#[test]
fn test_get_cluster_members_returns_empty_for_unknown_cluster() {
    let graph = AgentGraph::new();
    let random_id = Uuid::new_v4();

    let members = graph.get_cluster_members(&random_id);
    assert!(members.is_empty());
}

#[test]
fn test_clusters_iterates_all_clusters() {
    let mut graph = AgentGraph::new();

    for i in 0..3 {
        let cluster = Cluster::new(
            format!("Cluster {}", i),
            ClusterType::Backend,
            Topology::Mesh,
        );
        graph.add_cluster(cluster);
    }

    let count = graph.clusters().count();
    assert_eq!(count, 3);
}

// ============================================================================
// Clear Tests
// ============================================================================

#[test]
fn test_clear_removes_all_agents_and_clusters() {
    let mut graph = AgentGraph::new();

    // Add agents
    for i in 0..5 {
        let agent = Agent::new(
            AgentRole::Coder,
            format!("Agent {}", i),
            Framework::ClaudeFlow,
        );
        graph.add_agent(agent);
    }

    // Add clusters
    for i in 0..3 {
        let cluster = Cluster::new(
            format!("Cluster {}", i),
            ClusterType::Backend,
            Topology::Mesh,
        );
        graph.add_cluster(cluster);
    }

    assert_eq!(graph.agent_count(), 5);
    assert_eq!(graph.cluster_count(), 3);

    graph.clear();

    assert_eq!(graph.agent_count(), 0);
    assert_eq!(graph.cluster_count(), 0);
    assert_eq!(graph.roots().len(), 0);
}

// ============================================================================
// Cluster Tests
// ============================================================================

#[test]
fn test_cluster_new() {
    let cluster = Cluster::new(
        "Test Cluster".to_string(),
        ClusterType::Backend,
        Topology::Mesh,
    );

    assert_eq!(cluster.name, "Test Cluster");
    assert_eq!(cluster.cluster_type, ClusterType::Backend);
    assert_eq!(cluster.topology, Topology::Mesh);
    assert!(cluster.members.is_empty());
    assert!(cluster.metadata.is_empty());
}

#[test]
fn test_cluster_add_member() {
    let mut cluster = Cluster::new(
        "Test".to_string(),
        ClusterType::Backend,
        Topology::Mesh,
    );
    let agent_id = Uuid::new_v4();

    cluster.add_member(agent_id);

    assert_eq!(cluster.member_count(), 1);
    assert!(cluster.contains_member(&agent_id));
}

#[test]
fn test_cluster_add_member_prevents_duplicates() {
    let mut cluster = Cluster::new(
        "Test".to_string(),
        ClusterType::Backend,
        Topology::Mesh,
    );
    let agent_id = Uuid::new_v4();

    cluster.add_member(agent_id);
    cluster.add_member(agent_id);

    assert_eq!(cluster.member_count(), 1);
}

#[test]
fn test_cluster_remove_member() {
    let mut cluster = Cluster::new(
        "Test".to_string(),
        ClusterType::Backend,
        Topology::Mesh,
    );
    let agent_id = Uuid::new_v4();

    cluster.add_member(agent_id);
    assert_eq!(cluster.member_count(), 1);

    let removed = cluster.remove_member(&agent_id);
    assert!(removed);
    assert_eq!(cluster.member_count(), 0);
}

#[test]
fn test_cluster_remove_member_returns_false_when_not_found() {
    let mut cluster = Cluster::new(
        "Test".to_string(),
        ClusterType::Backend,
        Topology::Mesh,
    );
    let random_id = Uuid::new_v4();

    let removed = cluster.remove_member(&random_id);
    assert!(!removed);
}

#[test]
fn test_cluster_contains_member() {
    let mut cluster = Cluster::new(
        "Test".to_string(),
        ClusterType::Backend,
        Topology::Mesh,
    );
    let agent_id = Uuid::new_v4();

    assert!(!cluster.contains_member(&agent_id));

    cluster.add_member(agent_id);

    assert!(cluster.contains_member(&agent_id));
}

// ============================================================================
// ClusterType Tests
// ============================================================================

#[test]
fn test_cluster_type_display_names() {
    assert_eq!(ClusterType::Backend.display_name(), "Backend");
    assert_eq!(ClusterType::Frontend.display_name(), "Frontend");
    assert_eq!(ClusterType::Research.display_name(), "Research");
    assert_eq!(ClusterType::Testing.display_name(), "Testing");
    assert_eq!(
        ClusterType::Custom("MyCluster".to_string()).display_name(),
        "MyCluster"
    );
}

#[test]
fn test_cluster_type_serialization() {
    let cluster_type = ClusterType::Backend;
    let json = serde_json::to_string(&cluster_type).unwrap();
    assert_eq!(json, "\"backend\"");
}

// ============================================================================
// Topology Tests
// ============================================================================

#[test]
fn test_topology_display_names() {
    assert_eq!(Topology::Hierarchical.display_name(), "Hierarchical");
    assert_eq!(Topology::Mesh.display_name(), "Mesh");
    assert_eq!(Topology::Ring.display_name(), "Ring");
    assert_eq!(Topology::Star.display_name(), "Star");
    assert_eq!(Topology::Adaptive.display_name(), "Adaptive");
}

#[test]
fn test_topology_descriptions() {
    assert!(Topology::Hierarchical.description().contains("Tree"));
    assert!(Topology::Mesh.description().contains("connected"));
    assert!(Topology::Ring.description().contains("Circular"));
    assert!(Topology::Star.description().contains("Central"));
    assert!(Topology::Adaptive.description().contains("Dynamic"));
}

#[test]
fn test_topology_serialization() {
    let topology = Topology::Mesh;
    let json = serde_json::to_string(&topology).unwrap();
    assert_eq!(json, "\"mesh\"");
}

// ============================================================================
// Complex Topology Tests
// ============================================================================

#[test]
fn test_hierarchical_topology() {
    let mut graph = AgentGraph::new();

    // Create root coordinator
    let coordinator = Agent::new(
        AgentRole::Coordinator,
        "Root".to_string(),
        Framework::ClaudeFlow,
    );
    let coord_id = coordinator.id;
    graph.add_agent(coordinator);

    // Create children
    for i in 0..3 {
        let mut child = Agent::new(
            AgentRole::Coder,
            format!("Child {}", i),
            Framework::ClaudeFlow,
        );
        child.set_parent(coord_id);
        let child_id = child.id;

        graph.add_agent(child);
        graph.add_edge(coord_id, child_id);
    }

    assert_eq!(graph.roots().len(), 1);
    assert_eq!(graph.get_children(&coord_id).len(), 3);
}

#[test]
fn test_mesh_topology_with_cluster() {
    let mut graph = AgentGraph::new();
    let mut cluster = Cluster::new(
        "Mesh Cluster".to_string(),
        ClusterType::Backend,
        Topology::Mesh,
    );

    // Add agents to cluster
    for i in 0..4 {
        let agent = Agent::new(
            AgentRole::Coder,
            format!("Agent {}", i),
            Framework::ClaudeFlow,
        );
        cluster.add_member(agent.id);
        graph.add_agent(agent);
    }

    let cluster_id = cluster.id;
    graph.add_cluster(cluster);

    let members = graph.get_cluster_members(&cluster_id);
    assert_eq!(members.len(), 4);
}

#[test]
fn test_agent_removal_cleans_edges() {
    let mut graph = AgentGraph::new();

    let parent = Agent::new(
        AgentRole::Coordinator,
        "Parent".to_string(),
        Framework::ClaudeFlow,
    );
    let parent_id = parent.id;
    graph.add_agent(parent);

    let child = Agent::new(
        AgentRole::Coder,
        "Child".to_string(),
        Framework::ClaudeFlow,
    );
    let child_id = child.id;
    graph.add_agent(child);

    graph.add_edge(parent_id, child_id);
    assert_eq!(graph.get_children(&parent_id).len(), 1);

    // Remove child
    graph.remove_agent(&child_id);

    // Edge should be cleaned up
    assert_eq!(graph.get_children(&parent_id).len(), 0);
}

#[test]
fn test_cluster_removal_from_agents() {
    let mut graph = AgentGraph::new();
    let cluster = Cluster::new(
        "Test".to_string(),
        ClusterType::Backend,
        Topology::Mesh,
    );
    let cluster_id = cluster.id;

    // Create agents in cluster
    for i in 0..3 {
        let mut agent = Agent::new(
            AgentRole::Coder,
            format!("Agent {}", i),
            Framework::ClaudeFlow,
        );
        agent.cluster = Some(cluster_id);
        graph.add_agent(agent);
    }

    graph.add_cluster(cluster);
    graph.remove_cluster(&cluster_id);

    // All agents should have cluster cleared
    for agent in graph.agents() {
        assert!(agent.cluster.is_none());
    }
}

// ============================================================================
// Serialization Tests
// ============================================================================

#[test]
fn test_cluster_serialization_roundtrip() {
    let mut cluster = Cluster::new(
        "Test Cluster".to_string(),
        ClusterType::Backend,
        Topology::Mesh,
    );
    cluster.add_member(Uuid::new_v4());

    let json = serde_json::to_string(&cluster).unwrap();
    let deserialized: Cluster = serde_json::from_str(&json).unwrap();

    assert_eq!(cluster.id, deserialized.id);
    assert_eq!(cluster.name, deserialized.name);
    assert_eq!(cluster.cluster_type, deserialized.cluster_type);
    assert_eq!(cluster.topology, deserialized.topology);
}
