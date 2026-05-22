from rest_framework_simplejwt.authentication import JWTAuthentication

class QueryParameterJWTAuthentication(JWTAuthentication):
    """
    Extends standard JWTAuthentication to also look for the token
    in the 'token' query parameter. Useful for SSE (EventSource) 
    or WebSocket connections where setting Authorization headers is difficult.
    """
    def get_header(self, request):
        header = super().get_header(request)
        if header is not None:
            return header
            
        token = request.query_params.get('token')
        if token:
            # simplejwt expects bytes
            return b'Bearer ' + token.encode('utf-8')
        return None
