from rest_framework.pagination import CursorPagination

class AnalyticsCustomerCursorPagination(CursorPagination):
    page_size = 6
    cursor_query_param = "cursor"
    ordering = None


from rest_framework.pagination import PageNumberPagination

class DefaultPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "limit"
