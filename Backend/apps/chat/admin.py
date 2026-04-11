from django.contrib import admin
from apps.chat.models import Conversation,Message,BroadcastGroupMember,BroadcastGroup

admin.site.register(Conversation)
admin.site.register(Message)
admin.site.register(BroadcastGroupMember)
admin.site.register(BroadcastGroup)