from rest_framework.pagination import CursorPagination

class CursorPagination(CursorPagination):
    page_size = 6
    ordering = ["-is_active","-created_at"]
    cursor_query_param = "cursor"
