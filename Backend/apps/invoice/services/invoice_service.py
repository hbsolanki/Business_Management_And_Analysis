from django.db import transaction
from decimal import Decimal
from rest_framework.exceptions import ValidationError

from apps.customer.models import Customer
from apps.invoice.models import Invoice, ProductInvoice
from apps.product.models import Product
from apps.inventory.models import InventoryProduct


@transaction.atomic
def create_invoice(
    *,
    name,
    mobile_number,
    email=None,
    address=None,
    age,
    gender,
    items,
    payment_mode,
    user,
):
    customer = Customer.objects.filter(
        mobile_number=mobile_number,
        business=user.business
    ).first()
    if not customer:
        customer = Customer.objects.create(
            name=name,
            mobile_number=mobile_number,
            email=email or "",
            address=address,
            age=age,
            gender=gender,
            business=user.business,
        )
    updated_fields=[]
    if name and customer.name!=name:
        customer.name = name
        updated_fields.append("name")

    if email and customer.email!=email:
        customer.email = email
        updated_fields.append("email")

    if address and customer.address!=address:
        customer.address = address
        updated_fields.append("address")

    if age and customer.age!=age:
        customer.age = age
        updated_fields.append("age")

    if gender and customer.gender!=gender:
        customer.gender = gender
        updated_fields.append("gender")

    if updated_fields:
        customer.save(update_fields=updated_fields)

    invoice = Invoice.objects.create(
        business=user.business,
        customer=customer,
        created_by=user,
        payment_mode=payment_mode,
        sub_total=Decimal("0.00"),
        total_amount=Decimal("0.00"),
    )

    sub_total = Decimal("0.00")
    total_amount = Decimal("0.00")

    for item in items:
        product_id = item["productId"]
        quantity = Decimal(item["quantity"])

        try:
            product = Product.objects.select_for_update().get(
                id=product_id,
                business=user.business
            )
            inventory_product = InventoryProduct.objects.select_for_update().get(
                product=product,
            )
        except Product.DoesNotExist:
            raise ValidationError(f"Invalid product ID {product_id}")
        except InventoryProduct.DoesNotExist:
            raise ValidationError(
                f"No inventory found for product {product_id}"
            )

        if quantity > inventory_product.stock_quantity:
            raise ValidationError(
                f"Product {product.name} has only "
                f"{inventory_product.stock_quantity} stock"
            )

        inventory_product.stock_quantity -= quantity
        inventory_product.save(update_fields=["stock_quantity"])

        base_price = product.base_price
        gst_rate = product.output_gst_rate

        output_gst_amount = (
            base_price * gst_rate / Decimal("100")
        )
        final_selling_price = base_price + output_gst_amount

        line_sub_total = base_price * quantity
        line_total = final_selling_price * quantity

        sub_total += line_sub_total
        total_amount += line_total

        ProductInvoice.objects.create(
            invoice=invoice,
            product=product,
            quantity=quantity,
            base_price=base_price,
            selling_price=final_selling_price,
        )

    invoice.sub_total = sub_total
    invoice.total_amount = total_amount
    invoice.save(update_fields=["sub_total", "total_amount"])

    return invoice
