from fastapi import FastAPI

# import Routes
from Routes.Owner import Owner

app=FastAPI()
app.include_router(Owner)