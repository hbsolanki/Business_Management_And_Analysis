from channels.db import database_sync_to_async
from apps.ai_agent.models import AiChatSession, AiChatMessage, AiChatMessageSenderChoices, AiChartRef
from apps.user.models import User


@database_sync_to_async
def get_or_create_session(user_id, session_id=None):
    from django.core.exceptions import ValidationError
    user = User.all_objects.get(id=user_id)
    if session_id and session_id != "new":
        try:
            return AiChatSession.objects.get(id=session_id, user=user)
        except (AiChatSession.DoesNotExist, ValueError, ValidationError):
            pass
    return AiChatSession.objects.create(user=user, title="New Chat")


@database_sync_to_async
def save_message(session_id, sender, content):
    session = AiChatSession.objects.get(id=session_id)
    return AiChatMessage.objects.create(session=session, sender=sender, content=content), False


@database_sync_to_async
def create_assistant_message(session_id):
    session = AiChatSession.objects.get(id=session_id)
    return AiChatMessage.objects.create(session=session, sender=AiChatMessageSenderChoices.ASSISTANT, content="")


@database_sync_to_async
def finalize_assistant_message(message_id, content):
    message = AiChatMessage.objects.get(id=message_id)
    message.content = content
    message.save(update_fields=["content"])

    session = message.session
    if session.title == "New Chat":
        clean = content.replace('#', '').replace('*', '').strip().split('\n')[0]
        if len(clean) > 10:
            session.title = clean[:60] + ("..." if len(clean) > 60 else "")
            session.save(update_fields=["title"])
            return message, True
    return message, False


@database_sync_to_async
def update_last_assistant_message(session_id, content):
    msg = AiChatMessage.objects.filter(session_id=session_id, sender=AiChatMessageSenderChoices.ASSISTANT).last()
    if msg:
        msg.content = content
        msg.save(update_fields=["content"])
        return msg
    return None


@database_sync_to_async
def get_user_context_data(user_id):
    user = User.all_objects.get(id=user_id)
    branch_id = None
    if user.role_name == "MANAGER":
        branch = user.branches.first()
        branch_id = branch.id if branch else None
    return user.role_name, user.business_id, branch_id, str(user.id)


@database_sync_to_async
def get_session_title(session_id):
    return AiChatSession.objects.get(id=session_id).title


@database_sync_to_async
def create_chart_ref(message_id, title, chart_type, data, option):
    return AiChartRef.objects.create(
        message_id=message_id, 
        title=title, 
        chart_type=chart_type, 
        data=data, 
        option=option
    )
