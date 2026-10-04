import re
from rest_framework import serializers
from apps.ai_agent.models import AiChatSession, AiChatMessage, AiChartRef
from apps.base.serializers.base import BaseSerializer



class AiChatMessageSerializer(BaseSerializer):
    content = serializers.SerializerMethodField()
    reasoning = serializers.SerializerMethodField()

    class Meta(BaseSerializer.Meta):
        model = AiChatMessage
        fields = BaseSerializer.Meta.fields + ['sender', 'content', 'has_chart', 'thinking_duration', 'reasoning']
        read_only_fields = BaseSerializer.Meta.read_only_fields + ['sender']

    def get_reasoning(self, message):
        if message.sender != "assistant" or message.thinking_duration is None:
            return None
        return {
            "label": "Reasoning total time",
            "total_time": message.thinking_duration,
            "tool_calls": 0,
        }

    def get_content(self, message):
        raw_text = message.content or ""
        if not raw_text:
            return []

        session_charts = AiChartRef.objects.filter(message__session=message.session)
        chart_map = {str(chart.id).lower(): chart for chart in session_charts}
        
        tag_regex = re.compile(r'(<?ChartRef:[a-f0-9-]{36}>?)', re.IGNORECASE)
        segments = tag_regex.split(raw_text)
        
        final_result = []
        for segment in segments:
            if not segment:
                continue
            
            match = re.search(r'ChartRef:([a-f0-9-]{36})', segment, re.IGNORECASE)
            if match:
                ref_id = match.group(1).lower()
                chart = chart_map.get(ref_id)
                if chart:
                    # Return the structured data consistent with chart_intent_tool
                    # We prioritize the 'config' field if it holds the full payload
                    chart_payload = chart.config or {}
                    
                    final_result.append({
                        "type": "chart",
                        "id": str(chart.id),
                        "title": chart.title or chart_payload.get("title", ""),
                        "chart_type": chart.chart_type or chart_payload.get("chart_type", ""),
                        "option": chart.option or chart_payload.get("option", {}),
                        "data": chart.data or chart_payload # Flattening or nested as per frontend
                    })
                    continue

            final_result.append({"type": "text", "value": segment})
            
        return final_result