from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Owner
from django.utils.crypto import get_random_string
from Database.db import conn  # Update this import if necessary
from Auth.Auth import ACCESS_TOKEN_EXPIRE_MINUTES,create_access_token,authenticate_user,get_current_user
from datetime import timedelta

@csrf_exempt 
def owner_registration(request):
    if request.method == 'POST':
        try:
            import json
            data = json.loads(request.body)
            name = data.get('name')
            email = data.get('email')
            businessid = data.get('businessid', "")
            mobile_number = data.get('mobile_number')
            password = data.get("password")  # type: ignore

            conn.Visionary.Owner.insert_one({
                "name": name,
                "email": email,
                "businessid": businessid,
                "mobile_number": mobile_number,
                "password": password
            })

            # Generate a token (for demonstration purposes; use a proper method in production)
            access_token_expires=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": email},
                expires_delta=access_token_expires
            )
            return JsonResponse({'status': 'success', 'message': 'Registration successful', 'token': access_token})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate

@api_view(['POST'])
def owner_login(request):
    email = request.data.get('email')
    password = request.data.get('password')

    user=conn.Visionary.Owner.find_one({"email":email,"password":password})

    if user is not None:
        # Generate a token (for demonstration purposes; use a proper method in production)
        access_token_expires=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": email},
            expires_delta=access_token_expires
        )
        print(access_token)
        return Response({'token': access_token}, status=status.HTTP_200_OK)
    else:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    

@api_view(["GET"])
def owner_home(request):
    auth_header = request.headers.get('Authorization')
    email = get_current_user(auth_header)

    if email:
        owner = conn.Visionary.Owner.find_one({"email": email})
        if owner:
            # Exclude the ObjectId field to avoid serialization issues
            owner['_id'] = str(owner['_id'])
            if owner['businessid']:
                owner['businessid'] = str(owner['businessid'])
            return JsonResponse(owner)
    return JsonResponse({"error": "Owner not found"}, status=404)
