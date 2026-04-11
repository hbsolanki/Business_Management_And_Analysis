# Framework Imports
from django.test import override_settings
from rest_framework.test import APITestCase
from django.contrib.auth.models import Group, Permission
from django.utils import timezone
from datetime import timedelta, datetime
from django.core.cache import cache

# Model Imports
from apps.subscription.models import Plan, Subscription, Usage
from apps.user.models import User
from apps.business.models import Business, Branch
from apps.inventory.models import Inventory, InventoryProduct
from apps.product.models import Product, ProductCategory
from apps.business.models import BusinessCustomer
from apps.invoice.models import Invoice, ProductInvoice
from apps.employee.models import (
    UserRole, UserBusinessRole, UserBranch, 
    EmployeeDetails, UserBranchWork
)
from apps.cost.models import MonthlyFinancialSummary, CostCategory, MonthlyCostCategory
from apps.supplier.models import (
    Supplier, PurchaseOrder, SalesOrder, 
    OrderStatus, PurchaseOrderItem, SalesOrderItem
)
from apps.chat.models import Conversation
from apps.activity_log.models import ActivityLog

# Permission Imports
from apps.employee.permission.role_permissions import ROLE_PERMISSIONS, MODULE_GROUPS
from apps.employee.utils.permission_utils import (
    sync_user_role_permissions, WORK_TO_GROUP
)


@override_settings(
    CACHES={
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        }
    },
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_BROKER_URL='memory://',
    CELERY_RESULT_BACKEND='cache',
    CELERY_CACHE_BACKEND='default',
    REDIS_URL='redis://localhost:6379/1',
    CHANNEL_LAYERS={
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        },
    }
)
class BaseTestCase(APITestCase):
    def setUp(self):
        super().setUp()
        self.setup_role_permissions()
        cache.clear()

    def create_plan(self, name="Basic Plan", price=100.0, duration_days=30, max_products=100, max_staff=10, max_invoices=1000, **kwargs):
        return Plan.objects.get_or_create(
            name=name, price=price, duration_days=duration_days,
            max_products=max_products, max_staff=max_staff, 
            max_invoices=max_invoices, **kwargs
        )[0]

    def create_subscription(self, business, plan=None, **kwargs):
        if not plan:
            plan = self.create_plan()
        
        start_date = kwargs.pop("start_date", timezone.now())
        end_date = kwargs.pop("end_date", start_date + timedelta(days=30))
        
        max_staff = kwargs.pop("max_staff", plan.max_staff)
        max_branches = kwargs.pop("max_branches", plan.max_branches)
        max_products = kwargs.pop("max_products", plan.max_products)
        max_invoices = kwargs.pop("max_invoices", plan.max_invoices)
        
        price = kwargs.pop("price", plan.price)
        plan_name = kwargs.pop("plan_name", plan.name)
        duration_days = kwargs.pop("duration_days", plan.duration_days)
        
        has_chat = kwargs.pop("has_chat", plan.has_chat)
        has_advanced_analytics = kwargs.pop("has_advanced_analytics", plan.has_advanced_analytics)
        has_api_access = kwargs.pop("has_api_access", plan.has_api_access)
        has_ai_agent = kwargs.pop("has_ai_agent", plan.has_ai_agent)

        sub = Subscription.objects.create(
            business=business,
            plan=plan,
            start_date=start_date,
            end_date=end_date,
            max_staff=max_staff,
            max_branches=max_branches,
            max_products=max_products,
            max_invoices=max_invoices,
            has_chat=has_chat,
            has_advanced_analytics=has_advanced_analytics,
            has_api_access=has_api_access,
            has_ai_agent=has_ai_agent,
            price=price,
            plan_name=plan_name,
            duration_days=duration_days,
            **kwargs
        )
        return sub

    def setup_business_with_plan(self, business_name="Test Business", plan_kwargs=None):
        business = Business.objects.create(name=business_name)
        plan = self.create_plan(**(plan_kwargs or {}))
        subscription = self.create_subscription(business, plan)
        return business, plan, subscription

    def create_conversation(self, user1, user2):
        if user1.id > user2.id:
            user1, user2 = user2, user1
        conversation, _ = Conversation.objects.get_or_create(user1=user1, user2=user2)
        return conversation

    def setup_role_permissions(self):
        """
        Setup standard Django permissions for role groups based on ROLE_PERMISSIONS mapping.
        """
        for role, config in ROLE_PERMISSIONS.items():
            group, _ = Group.objects.get_or_create(name=role)
            group.permissions.clear()

            if config == "__all__":
                group.permissions.set(Permission.objects.all())
                continue

            if config == "__manager__":
                all_perms = Permission.objects.exclude(
                    content_type__app_label='business',
                    codename__in=[
                        'add_business', 'change_business', 'delete_business',
                        'add_branch', 'change_branch', 'delete_branch'
                    ]
                ).exclude(
                    content_type__app_label__in=['user', 'employee'],
                    codename__in=['can_create_owner', 'can_create_manager', 'can_create_employee']
                )
                group.permissions.set(all_perms)
                continue
                
            permissions = Permission.objects.none()
            if isinstance(config, dict):
                for app_label, codenames in config.items():
                    permissions |= Permission.objects.filter(
                        content_type__app_label=app_label,
                        codename__in=codenames
                    )

            group.permissions.set(permissions)
                
    def create_owner(self, username="owner", business=None, authenticate=False, **kwargs):
        email = kwargs.pop('email', f"{username}@example.com")
        user = User.objects.create_user(
            username=username,
            password="password123",
            mobile_number="9876543210",
            first_name="Owner",
            email=email,
            **kwargs
        )
        if business:
            UserBusinessRole.objects.create(user=user, business=business, role=UserRole.OWNER)
            sync_user_role_permissions(user)
        else:
            group, _ = Group.objects.get_or_create(name=UserRole.OWNER)
            user.groups.add(group)
            
        if authenticate:
            self.client.force_authenticate(user=user)
            
        return user

    def create_manager(self, username="manager", business=None, authenticate=False, **kwargs):
        email = kwargs.pop('email', f"{username}@example.com")
        user = User.objects.create_user(
            username=username,
            password="password123",
            mobile_number="9876543211",
            first_name="Manager",
            email=email,
            **kwargs
        )
        if business:
            UserBusinessRole.objects.create(user=user, business=business, role=UserRole.MANAGER)
            sync_user_role_permissions(user)
            
        if authenticate:
            self.client.force_authenticate(user=user)
            
        return user

    def create_employee(self, username="employee", business=None, authenticate=False, **kwargs):
        email = kwargs.pop('email', f"{username}@example.com")
        user = User.objects.create_user(
            username=username,
            password="password123",
            mobile_number="9876543212",
            first_name="Employee",
            email=email,
            **kwargs
        )
        if business:
            UserBusinessRole.objects.create(user=user, business=business, role=UserRole.EMPLOYEE)
            sync_user_role_permissions(user)
            
        if authenticate:
            self.client.force_authenticate(user=user)
            
        return user

    def create_branch(self, business, name="Test Branch", **kwargs):
        """Helper to create a branch for a business."""
        return Branch.objects.create(business=business, name=name, **kwargs)

    def create_product(self, business, name="Test Product", **kwargs):
        """Helper to create a product for a business."""
        from apps.product.models import Product
        defaults = {
            "sku": f"SKU-{name.replace(' ', '-')}-{business.id}",
            "base_price": 10.0,
            "cost_price": 5.0,
            "input_gst_rate": 18.0,
            "output_gst_rate": 18.0
        }
        defaults.update(kwargs)
        return Product.objects.create(business=business, name=name, **defaults)

    def assign_work_to_user(self, user, branch, work_type):
        """Helper to assign work and grant permissions."""

        # Create Work Assignment
        assignment, _ = UserBranchWork.objects.get_or_create(
            user=user, branch=branch, work_type=work_type
        )

        # Grant Group Permissions
        group_name = WORK_TO_GROUP.get(work_type)
        if group_name:
            group, _ = Group.objects.get_or_create(name=group_name)
            
            # Find associated app labels from MODULE_GROUPS
            app_labels = MODULE_GROUPS.get(group_name, [])
            if app_labels:
                perms = Permission.objects.filter(content_type__app_label__in=app_labels)
                group.permissions.set(perms)
            
            user.groups.add(group)

        return assignment

    def setup_full_business_environment(self, **kwargs):
        """
        Creates a comprehensive test environment with 2 businesses, each having:
        - 2 Branches
        - 2 Products
        - 2 Inventories
        - InventoryProducts linking products to inventories
        - 3 Customers (Business A)
        - 6+ Invoices (Business A: Global, Branch 1/2, Historical Dec/Feb/March)
        - Users (Owner, Manager 1, Manager 2, Employee 1, Employee 2) with UserBranch
        - 3 MonthlyFinancialSummary (Global, Branch 1, Branch 2)
        - 1 CostCategory
        - 1 PurchaseOrder per branch
        - 1 SalesOrder per branch
        """

        # BUSINESS A
        self.business_a, self.plan_a, self.subscription_a = self.setup_business_with_plan(business_name="Business A", plan_kwargs=kwargs)
        
        # Business A Branch
        self.branch_a1 = self.create_branch(business=self.business_a, name="Branch A1")
        self.branch_a2 = self.create_branch(business=self.business_a, name="Branch A2")
        
        # Plans for Multi-Tenant Testing
        self.plan_a = Plan.objects.get_or_create(name="Plan A", price=499.00, duration_days=30, max_products=100, max_staff=5, max_invoices=500, max_branches=2, is_active=True)[0]
        self.plan_b = Plan.objects.get_or_create(name="Plan B", price=999.00, duration_days=30, max_products=500, max_staff=20, max_invoices=5000, max_branches=10, is_active=True)[0]
        self.plan_c = Plan.objects.get_or_create(name="Plan C", price=1999.00, duration_days=30, max_products=2000, max_staff=100, max_invoices=20000, max_branches=50, is_active=True)[0]
        
        # Business A Inventory
        self.inventory_a1 = Inventory.objects.create(business=self.business_a, branch=self.branch_a1)
        self.inventory_a2 = Inventory.objects.create(business=self.business_a, branch=self.branch_a2)
        
        # Business A Category
        self.category_a = ProductCategory.objects.create(name="Category A", business=self.business_a)
        
        # Business A Product
        self.product_a1 = Product.objects.create(business=self.business_a, name="Product A1", sku="PRD-A1", base_price=10.0, cost_price=5.0, input_gst_rate=18.0, output_gst_rate=18.0, product_category=self.category_a)
        self.product_a2 = Product.objects.create(business=self.business_a, name="Product A2", sku="PRD-A2", base_price=20.0, cost_price=15.0, input_gst_rate=18.0, output_gst_rate=18.0, product_category=self.category_a)
        
        # Business A Inventory Product
        self.inventory_product_a1_1 = InventoryProduct.objects.create(inventory=self.inventory_a1, product=self.product_a1, stock_quantity=100)
        self.inventory_product_a2_1 = InventoryProduct.objects.create(inventory=self.inventory_a2, product=self.product_a1, stock_quantity=100)
        self.inventory_product_a1_2 = InventoryProduct.objects.create(inventory=self.inventory_a1, product=self.product_a2, stock_quantity=100)
        self.inventory_product_a2_2 = InventoryProduct.objects.create(inventory=self.inventory_a2, product=self.product_a2, stock_quantity=100)

        # Business A Customers
        self.customer_a = BusinessCustomer.objects.create(
            business=self.business_a, name="Customer A", mobile_number="1234567890"
        )
        self.customer_a2 = BusinessCustomer.objects.create(
            business=self.business_a, name="Customer A2", mobile_number="1112223334"
        )
        self.customer_a3 = BusinessCustomer.objects.create(
            business=self.business_a, name="Customer A3", mobile_number="5556667778"
        )

        # Business A Invoices
        self.invoice_global_a = Invoice.objects.create(business=self.business_a, branch=None, payment_mode="CASH", total_amount=100.00, sub_total=100.00)
        
        self.invoice_branch_a1 = Invoice.objects.create(business=self.business_a, branch=self.branch_a1, customer=self.customer_a, payment_mode="ONLINE", total_amount=118.00, sub_total=100.00)
        ProductInvoice.objects.create(invoice=self.invoice_branch_a1, product=self.product_a1, quantity=2, selling_price=50.00, base_price=45.00)
        
        self.invoice_branch_a1_2 = Invoice.objects.create(business=self.business_a, branch=self.branch_a1, customer=self.customer_a, payment_mode="CASH", total_amount=177.00, sub_total=150.00)
        ProductInvoice.objects.create(invoice=self.invoice_branch_a1_2, product=self.product_a1, quantity=1, selling_price=50.00, base_price=45.00)
        ProductInvoice.objects.create(invoice=self.invoice_branch_a1_2, product=self.product_a2, quantity=1, selling_price=100.00, base_price=90.00)

        # Force March 2024 for Deterministic Analytics
        dt_march = timezone.make_aware(datetime(2024, 3, 10, 10, 0, 0))
        Invoice.objects.filter(id__in=[self.invoice_branch_a1.id, self.invoice_branch_a1_2.id]).update(created_at=dt_march)

        self.invoice_branch_a2 = Invoice.objects.create(business=self.business_a, branch=self.branch_a2, customer=self.customer_a, payment_mode="CASH", total_amount=354.00, sub_total=300.00)
        ProductInvoice.objects.create(invoice=self.invoice_branch_a2, product=self.product_a2, quantity=3, selling_price=100.00, base_price=90.00)
        
        self.invoice_branch_a2_2 = Invoice.objects.create(business=self.business_a, branch=self.branch_a2, customer=self.customer_a, payment_mode="ONLINE", total_amount=354.00, sub_total=300.00)
        ProductInvoice.objects.create(invoice=self.invoice_branch_a2_2, product=self.product_a2, quantity=3, selling_price=100.00, base_price=90.00)

        # Business A Historical Invoices (Analytics Setup)
        dt_old = timezone.make_aware(datetime(2023, 12, 15, 10, 0, 0))
        self.invoice_old_a1 = Invoice.objects.create(business=self.business_a, branch=self.branch_a1, customer=self.customer_a, payment_mode="CASH", total_amount=500.00, sub_total=400.00)
        Invoice.objects.filter(id=self.invoice_old_a1.id).update(created_at=dt_old)
        ProductInvoice.objects.create(invoice=self.invoice_old_a1, product=self.product_a1, quantity=10, selling_price=40.00, base_price=35.00)

        dt_current = timezone.make_aware(datetime(2024, 3, 10, 10, 0, 0))
        self.invoice_current_a2 = Invoice.objects.create(business=self.business_a, branch=self.branch_a1, customer=self.customer_a2, payment_mode="ONLINE", total_amount=200.00, sub_total=180.00)
        Invoice.objects.filter(id=self.invoice_current_a2.id).update(created_at=dt_current)
        
        dt_feb = timezone.make_aware(datetime(2024, 2, 20, 10, 0, 0))
        self.invoice_feb_a3 = Invoice.objects.create(business=self.business_a, branch=self.branch_a2, customer=self.customer_a3, payment_mode="CASH", total_amount=300.00, sub_total=250.00)
        Invoice.objects.filter(id=self.invoice_feb_a3.id).update(created_at=dt_feb)

        # Business A Cost Models
        from decimal import Decimal
        self.summary_global_a = MonthlyFinancialSummary.objects.create(
            business=self.business_a, branch=None, year=2024, month=3,
            total_revenue=Decimal("10000.00"), invoice_count=20,
            cost_of_goods_sold=Decimal("4000.00"), operating_expenses=Decimal("1000.00"),
            salary_expenses=Decimal("2000.00"), input_gst=Decimal("400.00"), output_gst=Decimal("1000.00")
        )
        self.summary_branch_a1 = MonthlyFinancialSummary.objects.create(
            business=self.business_a, branch=self.branch_a1, year=2024, month=3,
            total_revenue=Decimal("5000.00"), invoice_count=10,
            cost_of_goods_sold=Decimal("2000.00"), operating_expenses=Decimal("500.00"),
            salary_expenses=Decimal("1000.00"), input_gst=Decimal("200.00"), output_gst=Decimal("500.00")
        )
        self.summary_branch_a2 = MonthlyFinancialSummary.objects.create(
            business=self.business_a, branch=self.branch_a2, year=2024, month=3,
            total_revenue=Decimal("5000.00"), invoice_count=10,
            cost_of_goods_sold=Decimal("2000.00"), operating_expenses=Decimal("500.00"),
            salary_expenses=Decimal("1000.00"), input_gst=Decimal("200.00"), output_gst=Decimal("500.00")
        )
        self.cost_category_a = CostCategory.objects.create(business=self.business_a, name="Test Category A")
        self.cost_item_a1 = MonthlyCostCategory.objects.create(
            monthly_summary=self.summary_branch_a1,
            cost_category=self.cost_category_a,
            cost=Decimal("500.00")
        )

        # Business A Suppliers
        self.supplier_a1 = Supplier.objects.create(business=self.business_a, name="Supplier A1", mobile_number="9000000001")
        self.supplier_a2 = Supplier.objects.create(business=self.business_a, name="Supplier A2", mobile_number="9000000003")

        # Business A User Roles
        self.owner_a = self.create_owner(username="owner_a", business=self.business_a)
        
        self.manager_a1 = self.create_manager(username="manager_a1", business=self.business_a)
        UserBranch.objects.create(user=self.manager_a1, branch=self.branch_a1)
        EmployeeDetails.objects.create(user=self.manager_a1, salary=5000)
        
        self.manager_a2 = self.create_manager(username="manager_a2", business=self.business_a)
        UserBranch.objects.create(user=self.manager_a2, branch=self.branch_a2)
        EmployeeDetails.objects.create(user=self.manager_a2, salary=5000)

        self.employee_a1 = self.create_employee(username="employee_a1", business=self.business_a)
        UserBranch.objects.create(user=self.employee_a1, branch=self.branch_a1)
        EmployeeDetails.objects.create(user=self.employee_a1, salary=3000)

        self.employee_a2 = self.create_employee(username="employee_a2", business=self.business_a)
        UserBranch.objects.create(user=self.employee_a2, branch=self.branch_a2)
        EmployeeDetails.objects.create(user=self.employee_a2, salary=3000)

        # Business A Initial Orders
        # Branch A1 Orders
        self.po_a1 = PurchaseOrder.objects.create(business=self.business_a, branch=self.branch_a1, supplier=self.supplier_a1, notes="Initial PO A1")
        PurchaseOrderItem.objects.create(purchase_order=self.po_a1, product=self.product_a1, quantity=10, unit_cost=5.0)
        self.po_a1.total_amount = 50.0
        self.po_a1.save()

        self.so_a1 = SalesOrder.objects.create(business=self.business_a, branch=self.branch_a1, customer=self.customer_a, notes="Initial SO A1")
        SalesOrderItem.objects.create(sales_order=self.so_a1, product=self.product_a1, quantity=5, unit_price=10.0)
        self.so_a1.total_amount = 50.0
        self.so_a1.save()

        # Branch A2 Orders
        self.po_a2 = PurchaseOrder.objects.create(business=self.business_a, branch=self.branch_a2, supplier=self.supplier_a1, notes="Initial PO A2")
        PurchaseOrderItem.objects.create(purchase_order=self.po_a2, product=self.product_a2, quantity=10, unit_cost=15.0)
        self.po_a2.total_amount = 150.0
        self.po_a2.save()

        self.so_a2 = SalesOrder.objects.create(business=self.business_a, branch=self.branch_a2, customer=self.customer_a, notes="Initial SO A2")
        SalesOrderItem.objects.create(sales_order=self.so_a2, product=self.product_a2, quantity=5, unit_price=20.0)
        self.so_a2.total_amount = 100.0
        self.so_a2.save()


        # BUSINESS B
        self.business_b, self.plan_b, self.subscription_b = self.setup_business_with_plan(business_name="Business B", plan_kwargs=kwargs)
        
        # Business B Branch
        self.branch_b1 = self.create_branch(business=self.business_b, name="Branch B1")
        self.branch_b2 = self.create_branch(business=self.business_b, name="Branch B2")
        
        # Business B Inventory
        self.inventory_b1 = Inventory.objects.create(business=self.business_b, branch=self.branch_b1)
        self.inventory_b2 = Inventory.objects.create(business=self.business_b, branch=self.branch_b2)
        
        # Business B Category
        self.category_b = ProductCategory.objects.create(name="Category B", business=self.business_b)
        
        # Business B Product
        self.product_b1 = Product.objects.create(business=self.business_b, name="Product B1", sku="PRD-A1", base_price=10.0, cost_price=5.0, input_gst_rate=18.0, output_gst_rate=18.0, product_category=self.category_b)
        self.product_b2 = Product.objects.create(business=self.business_b, name="Product B2", sku="PRD-B2", base_price=20.0, cost_price=15.0, input_gst_rate=18.0, output_gst_rate=18.0, product_category=self.category_b)
        self.mapped_product_b = self.product_b1
        
        # Business B Inventory Product
        self.inventory_product_b1_1 = InventoryProduct.objects.create(inventory=self.inventory_b1, product=self.product_b1, stock_quantity=100)
        self.inventory_product_b2_1 = InventoryProduct.objects.create(inventory=self.inventory_b2, product=self.product_b1, stock_quantity=100)
        self.inventory_product_b1_2 = InventoryProduct.objects.create(inventory=self.inventory_b1, product=self.product_b2, stock_quantity=100)
        self.inventory_product_b2_2 = InventoryProduct.objects.create(inventory=self.inventory_b2, product=self.product_b2, stock_quantity=100)

        # Business B Customer
        self.customer_b = BusinessCustomer.objects.create(business=self.business_b, name="Customer B", mobile_number="0987654321")

        # Business B Invoice
        self.invoice_global_b = Invoice.objects.create(business=self.business_b, branch=None, payment_mode="CASH", total_amount=100.00, sub_total=100.00)
        
        self.invoice_branch_b1 = Invoice.objects.create(business=self.business_b, branch=self.branch_b1, customer=self.customer_b, payment_mode="ONLINE", total_amount=118.00, sub_total=100.00)
        ProductInvoice.objects.create(invoice=self.invoice_branch_b1, product=self.product_b1, quantity=2, selling_price=50.00, base_price=45.00)
        
        self.invoice_branch_b1_2 = Invoice.objects.create(business=self.business_b, branch=self.branch_b1, customer=self.customer_b, payment_mode="CASH", total_amount=177.00, sub_total=150.00)
        ProductInvoice.objects.create(invoice=self.invoice_branch_b1_2, product=self.product_b1, quantity=1, selling_price=50.00, base_price=45.00)
        ProductInvoice.objects.create(invoice=self.invoice_branch_b1_2, product=self.product_b2, quantity=1, selling_price=100.00, base_price=90.00)

        self.invoice_branch_b2 = Invoice.objects.create(business=self.business_b, branch=self.branch_b2, customer=self.customer_b, payment_mode="CASH", total_amount=354.00, sub_total=300.00)
        ProductInvoice.objects.create(invoice=self.invoice_branch_b2, product=self.product_b2, quantity=3, selling_price=100.00, base_price=90.00)
        
        self.invoice_branch_b2_2 = Invoice.objects.create(business=self.business_b, branch=self.branch_b2, customer=self.customer_b, payment_mode="ONLINE", total_amount=354.00, sub_total=300.00)
        ProductInvoice.objects.create(invoice=self.invoice_branch_b2_2, product=self.product_b2, quantity=3, selling_price=100.00, base_price=90.00)

        # Business B Cost Models
        self.summary_global_b = MonthlyFinancialSummary.objects.create(business=self.business_b, branch=None, year=2024, month=3)
        self.summary_branch_b1 = MonthlyFinancialSummary.objects.create(business=self.business_b, branch=self.branch_b1, year=2024, month=3)
        self.summary_branch_b2 = MonthlyFinancialSummary.objects.create(business=self.business_b, branch=self.branch_b2, year=2024, month=3)
        self.cost_category_b = CostCategory.objects.create(business=self.business_b, name="Test Category B")

        # Business B Suppliers
        self.supplier_b1 = Supplier.objects.create(
            business=self.business_b,
            supplier_business=self.business_a,
            name="Supplier B1",
            mobile_number="9000000002",
            same_platform=True,
        )
        self.supplier_b2 = Supplier.objects.create(business=self.business_b, name="Supplier B2", mobile_number="9000000004")
        self.reciprocal_supplier = self.supplier_b1

        self.customer_a.customer_business = self.business_b
        self.customer_a.same_platform = True
        self.customer_a.save(update_fields=["customer_business", "same_platform"])
        self.same_platform_customer = self.customer_a

        # Business B User Roles
        self.owner_b = self.create_owner(username="owner_b", business=self.business_b)
        
        self.manager_b1 = self.create_manager(username="manager_b1", business=self.business_b)
        UserBranch.objects.create(user=self.manager_b1, branch=self.branch_b1)
        EmployeeDetails.objects.create(user=self.manager_b1, salary=5000)
        
        self.manager_b2 = self.create_manager(username="manager_b2", business=self.business_b)
        UserBranch.objects.create(user=self.manager_b2, branch=self.branch_b2)
        EmployeeDetails.objects.create(user=self.manager_b2, salary=5000)

        self.employee_b1 = self.create_employee(username="employee_b1", business=self.business_b)
        UserBranch.objects.create(user=self.employee_b1, branch=self.branch_b1)
        EmployeeDetails.objects.create(user=self.employee_b1, salary=3000)

        self.employee_b2 = self.create_employee(username="employee_b2", business=self.business_b)
        UserBranch.objects.create(user=self.employee_b2, branch=self.branch_b2)
        EmployeeDetails.objects.create(user=self.employee_b2, salary=3000)

        # Business B Initial Orders
        # Branch B1 Orders
        self.po_b1 = PurchaseOrder.objects.create(
            business=self.business_b,
            branch=self.branch_b1,
            supplier=self.supplier_b1,
            notes="PO for sync tests",
        )
        PurchaseOrderItem.objects.create(
            purchase_order=self.po_b1,
            product=self.product_b1,
            quantity=5,
            unit_cost=8.0,
        )
        self.po_b1.total_amount = 40.0
        self.po_b1.save()
        self.sync_purchase_order = self.po_b1

        self.so_b1 = SalesOrder.objects.create(business=self.business_b, branch=self.branch_b1, customer=self.customer_b, notes="Initial SO B1")
        SalesOrderItem.objects.create(sales_order=self.so_b1, product=self.product_b1, quantity=5, unit_price=10.0)
        self.so_b1.total_amount = 50.0
        self.so_b1.save()

        # Branch B2 Orders
        self.po_b2 = PurchaseOrder.objects.create(business=self.business_b, branch=self.branch_b2, supplier=self.supplier_b1, notes="Initial PO B2")
        PurchaseOrderItem.objects.create(purchase_order=self.po_b2, product=self.product_b2, quantity=10, unit_cost=15.0)
        self.po_b2.total_amount = 150.0
        self.po_b2.save()

        # Chat Conversations
        self.conv_a1 = self.create_conversation(self.owner_a, self.manager_a1)
        self.conv_a2 = self.create_conversation(self.owner_a, self.employee_a1)
        
        self.conv_b1 = self.create_conversation(self.owner_b, self.manager_b1)
        self.conv_b2 = self.create_conversation(self.owner_b, self.employee_b1)

        self.so_b2 = SalesOrder.objects.create(business=self.business_b, branch=self.branch_b2, customer=self.customer_b, notes="Initial SO B2")
        SalesOrderItem.objects.create(sales_order=self.so_b2, product=self.product_b2, quantity=5, unit_price=20.0)
        self.so_b2.total_amount = 100.0
        self.so_b2.save()

    def _verify_log(self, action, module, actor=None):
        """Helper to verify log existence"""
        log = ActivityLog.objects.filter(action=action, module=module).order_by('-created_at').first()
        self.assertIsNotNone(log, f"Log not found for {action} in {module}")
        if actor:
            self.assertEqual(log.actor, actor)
        return log
