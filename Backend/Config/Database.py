from pymongo import MongoClient
import os

# MONGO_URL="mongodb://localhost:27017/notes"
database_url = os.environ.get("MONGO_URL")
print(database_url)
Connection=MongoClient(database_url)