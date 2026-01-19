from ..models import User
from rest_framework_simplejwt.tokens import RefreshToken

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }

def create_user(*,first_name,last_name,username,mobile_number,password,role,business):
    user=User.objects.create_user(
        first_name=first_name,
        last_name=last_name,
        username=username,
        mobile_number=mobile_number,
        password=password,
        role=role,
        business=business)

    return user

def create_manager_employee(*,first_name,last_name,username,mobile_number,password,business,salary,description,role,user,work=None):
    user=User.objects.create_user(
        first_name=first_name,
        last_name=last_name,
        username=username,
        mobile_number=mobile_number,
        password=password,
        business=business,
        salary=salary,
        description=description,
        work=work,
        created_by=user,
        role=role
    )

    return user