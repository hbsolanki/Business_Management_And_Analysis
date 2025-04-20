from django.http import JsonResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.contrib.auth.hashers import make_password, check_password
from datetime import timedelta
from Database.db import conn  # Make sure this import is correct based on your project structure
from Auth.Auth import ACCESS_TOKEN_EXPIRE_MINUTES, create_access_token, get_current_user

@api_view(["POST"])
def owner_registration(request):
    """Handles owner registration."""
    try:
        data = request.data
        name = data.get('name')
        email = data.get('email')
        businessid = data.get('businessid', "")
        mobile_number = data.get('mobile_number')
        password = data.get("password")  # type: ignore

        # Hash the password before storing it
        hashed_password = make_password(password)

        # Insert owner data into the database
        conn.Visionary.Owner.insert_one({
            "name": name,
            "email": email,
            "businessid": businessid,
            "mobile_number": mobile_number,
            "password": hashed_password,
            "type": "owner"
        })

        # Generate access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": email, "type": "owner"},
            expires_delta=access_token_expires
        )
        return JsonResponse({'status': 'success', 'message': 'Registration successful', 'token': access_token})

    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@api_view(['POST'])
def owner_login(request):
    """Handles owner login."""
    email = request.data.get('email')
    password = request.data.get('password')

    # Fetch user from database
    user = conn.Visionary.Owner.find_one({"email": email})
    # hashed_password=make_password(password)
    if user and password== user['password']:
        
        # Generate access token if login is successful
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": email, "type": "owner"},
            expires_delta=access_token_expires
        )
        return Response({'token': access_token}, status=status.HTTP_200_OK)
    
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(["GET"])
def owner_home(request):
    """Returns owner details."""
    auth_header = request.headers.get('Authorization')
    email = get_current_user(auth_header)

    if email:
        owner = conn.Visionary.Owner.find_one({"email": email})
        if owner:
            # Convert MongoDB object ID to string
            owner['_id'] = str(owner['_id'])
            if owner.get('businessid'):
                owner['businessid'] = str(owner['businessid'])
            return JsonResponse(owner)
    
    return JsonResponse({"error": "Owner not found"}, status=404)

@api_view(["PUT"])
def owner_edit(request):
    """Allows owners to update their details."""
    try:
        # Extract the token from the Authorization header
        auth_header = request.headers.get('Authorization')
        email = get_current_user(auth_header)

        if email:
            # Find the owner in the database
            owner = conn.Visionary.Owner.find_one({"email": email})
            if owner:
                # Extract updated data from the request
                data = request.data
                updated_data = {}

                if 'name' in data:
                    updated_data['name'] = data['name']
                if 'mobile_number' in data:
                    updated_data['mobile_number'] = data['mobile_number']
                if 'businessid' in data:
                    updated_data['businessid'] = data['businessid']
                if 'password' in data:
                    updated_data['password'] = data['password']

                conn.Visionary.Owner.update_one(
                    {"email": email},
                    {"$set": updated_data}
                )

                return JsonResponse({"status": "success", "message": "Owner details updated successfully."})

        return JsonResponse({"error": "Owner not found or unauthorized access."}, status=404)

    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
