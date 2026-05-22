from rest_framework.pagination import CursorPagination, PageNumberPagination

class AnalyticsCustomerCursorPagination(CursorPagination):
    page_size = 6
    cursor_query_param = "cursor"
    ordering = None

class DefaultPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "limit"
