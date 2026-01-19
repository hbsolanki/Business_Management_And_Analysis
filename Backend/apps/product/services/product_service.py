from apps.product.models import Product
from decimal import Decimal


def create_product(*,name,base_price,cost_price,description,product_category,sku,input_gst_rate,output_gst_rate,business,user):
    product=Product.objects.create(
        name=name,
        base_price=base_price,
        cost_price=cost_price,
        description=description,
        product_category=product_category,
        sku=sku,
        input_gst_rate=input_gst_rate,
        output_gst_rate=output_gst_rate,
        business=business,
        created_by=user
    )
    return product
