from fastapi import  HTTPException, status, Depends
from jose import JWTError, jwt
from passlib.context import CryptContext  #Password Password
from pydantic import BaseModel,EmailStr
from datetime import datetime, timedelta
from typing import  Optional
from fastapi.security import OAuth2PasswordBearer
from Database.db import conn
# Password hashing context (using bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Secret key and Algorithm
SECRET_KEY = "your_secret_key_here"  # Replace with a secure key in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 40


# Token Data Model
class Token(BaseModel):
    access_token: str
    token_type: str


# Helper function to hash the password
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

# Helper function to verify the password
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# Helper function to create a JWT token
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# Helper function to authenticate a user
def authenticate_user(username: str, password: str):
    user=conn.Ethics.User.find_one({"username":username,"password":password})
    
    # if not user or not verify_password(password, user.password):
    #     return False
    if not user:
        return False
    user=dict(user) # type: ignore
    user["_id"]=str(user["_id"]) # type: ignore
    return user

from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# Dependency to get current user by verifying the JWT token
def get_current_user(token):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        if token is None:
            raise HTTPException(status_code=403, detail="Authorization token not provided")

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
  
    return email

# def authenticate_user(token):
#     credentials_exception = HTTPException(
#         status_code=status.HTTP_401_UNAUTHORIZED,
#         detail="Could not validate credentials",
#         headers={"WWW-Authenticate": "Bearer"},
#     )
#     try:

#         if token is None:
#             raise HTTPException(status_code=403, detail="Authorization token not provided")

#         payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
#         print(payload)
#         # username: str = payload.get("sub") 
#         if username is None:
#             raise credentials_exception
#     except JWTError:
#         raise credentials_exception
    
#     return username

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_token(token: str = Depends(oauth2_scheme)):
    try:
        # Decode and validate the token (you may need to adapt it to your token type)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(payload)
        return payload  # Return decoded token data
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    


# owner/authentication.py


import jwt
from django.conf import settings
from rest_framework import authentication, exceptions

import jwt
from django.conf import settings
from rest_framework import authentication, exceptions

class JWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return None

        try:
            prefix, token = auth_header.split(' ')
            if prefix.lower() != 'bearer':
                raise exceptions.AuthenticationFailed('Authorization header must start with Bearer')
        except ValueError:
            raise exceptions.AuthenticationFailed('Invalid Authorization header format')

        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed('Invalid token')

        return (payload, token)

    def authenticate_header(self, request):
        return 'Bearer'
