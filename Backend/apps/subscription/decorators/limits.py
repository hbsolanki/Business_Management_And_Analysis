from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from apps.subscription.utils.entitlements import can_use_feature, check_resource_limit
from functools import wraps


def limit_required(limit_field, resource_model=None, usage_field=None):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            from django.db import transaction
            from apps.business.models import Business

            # Wrap the entire limit check and the creation view inside a single transaction
            with transaction.atomic():
                business = request.user.business
                if business:
                    # Obtain a database row-level lock on the Business to serialize limit checks & resource creation
                    Business.objects.select_for_update().get(id=business.id)

                # 1. Strict Active Count Check
                if resource_model:
                    try:
                        check_resource_limit(
                            business=business,
                            model=resource_model,
                            limit_field=limit_field,
                        )
                    except PermissionDenied as e:
                        return Response(
                            {"message": str(e)}, status=status.HTTP_403_FORBIDDEN
                        )

                # 2. Legacy Usage Table Check
                elif usage_field:
                    allow, message = can_use_feature(
                        business=business,
                        feature_name=limit_field,
                        usage_field=usage_field,
                    )
                    if not allow:
                        return Response(
                            {"message": message}, status=status.HTTP_403_FORBIDDEN
                        )

                return view_func(self, request, *args, **kwargs)

        return wrapper

    return decorator


def feature_required(feature_name):
    def decorator(view_func):
        def wrapper(self, request, *args, **kwargs):
            business = request.user.business
            allow, message = can_use_feature(
                business=business,
                feature_name=feature_name,
            )

            if not allow:
                return Response({"message": message}, status=status.HTTP_403_FORBIDDEN)

            return view_func(self, request, *args, **kwargs)

        return wrapper

    return decorator
