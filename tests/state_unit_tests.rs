/// Comprehensive unit tests for state management module
/// Following London School TDD approach with focus on behavior verification

// Include test modules
#[path = "state/agent_tests.rs"]
mod agent_tests;

#[path = "state/task_tests.rs"]
mod task_tests;

#[path = "state/session_tests.rs"]
mod session_tests;

#[path = "state/metrics_tests.rs"]
mod metrics_tests;

#[path = "state/graph_tests.rs"]
mod graph_tests;
