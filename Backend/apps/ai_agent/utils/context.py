import asyncio
from contextvars import ContextVar
from collections import defaultdict

# Shared execution state across agents
current_user_context = ContextVar("current_user_context", default={})
current_message_id = ContextVar("current_message_id", default=None)

# Tenant-level concurrency control (max 3 concurrent agent streams per business)
_tenant_semaphores = defaultdict(lambda: asyncio.Semaphore(3))

def get_tenant_semaphore(business_id):
    """Retrieve the asyncio semaphore for the given business ID."""
    if not business_id:
        # Fallback to a global semaphore with higher concurrency for headless users
        return _tenant_semaphores["global_unassigned"]
    return _tenant_semaphores[business_id]
