from apps.business_app.models import Business

def create_business(*,name,description):
    business = Business.objects.create(name=name,description=description)
    return business