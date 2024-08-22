from pydantic import BaseModel

class Owner(BaseModel):
    name:str
    mobile_number:int
    businesses:list =[]
    profit:int =0
    email:str
    password:str
