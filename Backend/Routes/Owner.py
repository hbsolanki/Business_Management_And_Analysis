from fastapi import APIRouter,FastAPI,Request
from fastapi.responses import RedirectResponse
from Models.Owner import Owner
from Config.Database import Connection

Owner=APIRouter()

@Owner.post("/API/owner/registration")
async def owner_registration(request:Request):
    form_data=dict(await request.form())
    owner=Owner(name=form_data["name"],email=form_data["email"],mobile_number=["mobile_number"],password=form_data["password"]) # type: ignore
    print(form_data)
    
    return RedirectResponse(url=f"http://localhost:5173/owner",status_code=302)

@Owner.post("/owner/login")
def owner_login(request:Request):
    pass
