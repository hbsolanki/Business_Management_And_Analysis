export function createStatusEntry(message, extra = {}) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: message || "Processing step",
    output: null,
    tool: null,
    ...extra,
  };
}

export function normalizeWorkflowStep(step, index = 0) {
  const data =
    step && typeof step.data === "object" && !Array.isArray(step.data)
      ? step.data
      : {};
  const stepType = String(step?.type || data?.type || "").toLowerCase();
  const stepId =
    step?.id ||
    data?.id ||
    `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
  const message =
    data?.message ||
    step?.message ||
    step?.label ||
    `Workflow step ${index + 1}`;
  const tool = data?.tool || step?.tool || null;
  const output = data?.output ?? step?.output ?? null;

  if (stepType === "tool_output") {
    return createStatusEntry(
      message || `Tool output received: ${tool || "tool"}`,
      {
        id: stepId,
        tool,
        output,
      },
    );
  }

  return createStatusEntry(message, {
    id: stepId,
    tool,
    output,
  });
}

export function groupSessionsByDate(sessions) {
  if (!sessions || !Array.isArray(sessions)) return {};
  
  return sessions.reduce((acc, session) => {
    const date = new Date(session.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    let groupKey = "Previous";
    if (date.toDateString() === today.toDateString()) groupKey = "Today";
    else if (date.toDateString() === yesterday.toDateString()) groupKey = "Yesterday";
    else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) groupKey = "Last 7 Days";
    else groupKey = "Previous";

    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(session);
    return acc;
  }, {});
}
