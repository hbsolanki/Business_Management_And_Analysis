from django.db import migrations

def migrate_customers(apps, schema_editor):
    try:
        # Using the historical model for Customer
        Customer = apps.get_model('invoice', 'Customer')
    except LookupError:
        return

    BusinessCustomer = apps.get_model('business', 'BusinessCustomer')
    
    for customer in Customer.objects.all():
        BusinessCustomer.objects.get_or_create(
            id=customer.id,
            defaults={
                'created_at': customer.created_at,
                'updated_at': customer.updated_at,
                'is_deleted': customer.is_deleted,
                'is_active': customer.is_active,
                'name': customer.name,
                'mobile_number': customer.mobile_number,
                'email': customer.email,
                'address': customer.address,
                'age': customer.age,
                'gender': customer.gender,
                'date_joined': customer.date_joined,
                'business_id': customer.business_id,
                'created_by_id': customer.created_by_id,
                'updated_by_id': customer.updated_by_id,
            }
        )

class Migration(migrations.Migration):
    dependencies = [
        ('business', '0004_businesscustomer'),
        ('invoice', '0002_invoice_branch'),
    ]
    operations = [
        migrations.RunPython(migrate_customers),
    ]
