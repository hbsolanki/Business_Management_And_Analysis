from django.contrib import admin
from apps.business.models import Business,Branch,BranchAddress

admin.site.register(Business)
admin.site.register(Branch)
admin.site.register(BranchAddress)
