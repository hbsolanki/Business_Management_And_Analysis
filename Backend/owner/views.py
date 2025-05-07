from django.http import JsonResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.contrib.auth.hashers import make_password, check_password
from datetime import timedelta
from Database.db import conn  
from Auth.Auth import ACCESS_TOKEN_EXPIRE_MINUTES, create_access_token, get_current_user

@api_view(["POST"])
def owner_registration(request):
    """Handles owner registration."""
    try:
        data = request.data
        email = data.get('email')
        user = conn.Visionary.Owner.find_one({"email": email})
        if user:
            return JsonResponse({'status': 'Email Exist Already'}, status=409)

        name = data.get('name')
        businessid = data.get('businessid', "")
        mobile_number = data.get('mobile_number')
        password = data.get("password")  

        hashed_password = make_password(password)

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


@api_view(["POST"])
def forgot_password(request):
    email = request.data.get("email")

    if not email:
        return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

    user = conn.Visionary.Owner.find_one({"email": email})

    if not user:
        return Response({"error": "User with this email does not exist."}, status=status.HTTP_404_NOT_FOUND)

    # Generate 6-digit OTP
    otp = str(random.randint(100000, 999999))

    # Compose email
    subject = "Password Reset OTP"
    message = f"Dear {user.get('name', 'User')},\n\nYour OTP for password reset is: {otp}\n\nIf you didn't request this, please ignore this email.\n\nThanks,\nTeam"
    from_email = settings.DEFAULT_FROM_EMAIL
    recipient_list = [email]

    # try:
    send_mail(subject, message, from_email, recipient_list)
    # except Exception as e:
    #     return Response({"error": "Failed to send email."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Store OTP temporarily in user's record
    conn.Visionary.Owner.update_one(
        {"email": email},
        {"$set": {"reset_otp": otp}}
    )

    return Response({
        "email": email,
        # ⚠️ Do NOT include the OTP in production response!
        "message": "OTP has been sent to your email."
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
def verify_otp_and_reset_password(request):
    """Verifies OTP and resets user's password."""
    email = request.data.get("email")
    otp = request.data.get("otp")
    new_password = request.data.get("new_password")

    if not all([email, otp, new_password]):
        return Response({"error": "Email, OTP, and new password are required."}, status=status.HTTP_400_BAD_REQUEST)

    user = conn.Visionary.Owner.find_one({"email": email})

    if not user or user.get("reset_otp") != otp:
        return Response({"error": "Invalid OTP or email."}, status=status.HTTP_400_BAD_REQUEST)

    # Hash new password
    hashed_password = make_password(new_password)

    # Update password and remove OTP
    conn.Visionary.Owner.update_one(
        {"email": email},
        {
            "$set": {"password": hashed_password},
            "$unset": {"reset_otp": ""}
        }
    )

    return Response({"message": "Password has been reset successfully."}, status=status.HTTP_200_OK)
