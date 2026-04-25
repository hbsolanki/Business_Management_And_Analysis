from apps.ai_agent.models import AiChatSession, AiChatMessage, AiChartRef
from apps.base.serializers.base import BaseSerializer
from rest_framework import serializers
import re


class AiChatSessionSerializer(BaseSerializer):

    class Meta(BaseSerializer.Meta):
        model = AiChatSession
        fields = BaseSerializer.Meta.fields + ['title']
        read_only_fields = BaseSerializer.Meta.read_only_fields


class AiChatMessageSerializer(BaseSerializer):
    content = serializers.SerializerMethodField()

    class Meta(BaseSerializer.Meta):
        model = AiChatMessage
        fields = BaseSerializer.Meta.fields + ['sender', 'content', 'embedding']
        read_only_fields = BaseSerializer.Meta.read_only_fields + ['sender']

    def get_content(self, obj):
        content_text = obj.content or ""
        
        # 1. Permissive Regex: Match tags with variable length to handle LLM errors
        tag_pattern = re.compile(r'(<ChartRef:[0-9a-fA-F-]+>)', re.IGNORECASE)
        parts = tag_pattern.split(content_text)
        
        # 2. Build map of all charts in the current session for robust lookup
        session_charts = AiChartRef.objects.filter(message__session=obj.session)
        
        # Exact map for perfect matches
        chart_map = {str(c.id).lower(): c for c in session_charts}
        
        # Prefix map for recovering from minor hallucination (first 16 chars)
        prefix_map = {str(c.id).lower()[:16]: c for c in session_charts}
        
        structured_content = []
        for part in parts:
            if not part:
                continue
            
            # Use regex search on the segment to extract the identifier if it's a tag
            match = tag_pattern.search(part)
            if match:
                # Extract the identifier (UUID or similar handle) from the tag
                uuid_match = re.search(r':([0-9a-fA-F-]+)', part)
                if uuid_match:
                    chart_id_raw = uuid_match.group(1).lower()
                    
                    # Strategy 1: Exact Match
                    chart_obj = chart_map.get(chart_id_raw)
                    
                    # Strategy 2: Prefix-based Recovery (handle minor character errors at end of UUID)
                    if not chart_obj and len(chart_id_raw) >= 16:
                        chart_obj = prefix_map.get(chart_id_raw[:16])
                    
                    if chart_obj:
                        structured_content.append({
                            "type": "chart",
                            "id": str(chart_obj.id),
                            "html": chart_obj.html,
                        })
                        continue

            # Fallback for text parts or tags with missing objects
            structured_content.append({
                "type": "text",
                "value": part
            })
        
        return structured_content