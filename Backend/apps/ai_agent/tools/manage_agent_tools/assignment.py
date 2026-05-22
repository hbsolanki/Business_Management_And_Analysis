import logging
from asgiref.sync import sync_to_async
from django.db import transaction
from apps.ai_agent.utils.context import current_user_context
from apps.tasks.models import Task
from apps.user.models import User
from apps.product.models import Product, ProductCategory
from apps.cost.models import Expense, CostCategory
from apps.business.models import Branch

from types import SimpleNamespace
from apps.tasks.serializers import TaskSerializer
from apps.product.serializers.product import ProductSerializer
from apps.cost.serializers.expense import ExpenseSerializer

logger = logging.getLogger(__name__)

async def assign_task_to_employee(task_query: str, employee_query: str) -> dict:
    """
    Search for a task and an employee, and generate a pre-flight confirmation trigger.
    - task_query: search query matching task title or description.
    - employee_query: search query matching username, email, first name, or last name of the employee.
    """
    ctx = current_user_context.get()
    if not ctx or not ctx.get("business_id"):
        return {"error": "User context or business_id not found."}
    
    biz_id = ctx.get("business_id")

    try:
        def resolve_entities():
            # 1. Resolve Task
            tasks = list(Task.objects.filter(business_id=biz_id, title__icontains=task_query))
            if not tasks:
                return {"error": f"No tasks found matching '{task_query}'."}
            if len(tasks) > 1:
                options = [{"id": t.id, "title": t.title} for t in tasks]
                return {"error": "Multiple tasks found. Please be more specific:", "options": options}
            
            task = tasks[0]

            # 2. Resolve User (Employee)
            users = list(User.objects.filter(
                business_roles__business_id=biz_id,
                username__icontains=employee_query
            ) | User.objects.filter(
                business_roles__business_id=biz_id,
                email__icontains=employee_query
            ))
            # Deduplicate users
            users = list({u.id: u for u in users}.values())

            if not users:
                return {"error": f"No employees found matching '{employee_query}'."}
            if len(users) > 1:
                options = [{"id": u.id, "username": u.username, "email": u.email} for u in users]
                return {"error": "Multiple employees found. Please be more specific:", "options": options}
            
            user = users[0]

            # 3. Generate confirmation trigger
            return {
                "type": "confirmation_trigger",
                "message": f"Are you sure you want to assign the task '{task.title}' to {user.username} ({user.email})?",
                "action": {
                    "tool": "execute_assignment",
                    "parameters": {
                        "entity_type": "task_employee",
                        "source_id": task.id,
                        "target_id": user.id
                    }
                }
            }

        return await sync_to_async(resolve_entities)()
    except Exception as e:
        logger.error(f"Error in assign_task_to_employee: {e}")
        return {"error": str(e)}


async def link_product_to_category(product_query: str, category_query: str) -> dict:
    """
    Search for a product and a category, and generate a pre-flight confirmation trigger.
    - product_query: matches product name or SKU.
    - category_query: matches category name.
    """
    ctx = current_user_context.get()
    if not ctx or not ctx.get("business_id"):
        return {"error": "User context or business_id not found."}
    
    biz_id = ctx.get("business_id")

    try:
        def resolve_entities():
            # 1. Resolve Product
            products = list(Product.objects.filter(business_id=biz_id, name__icontains=product_query) | Product.objects.filter(business_id=biz_id, sku__icontains=product_query))
            products = list({p.id: p for p in products}.values())

            if not products:
                return {"error": f"No products found matching '{product_query}'."}
            if len(products) > 1:
                options = [{"id": p.id, "name": p.name, "sku": p.sku} for p in products]
                return {"error": "Multiple products found. Please be more specific:", "options": options}
            
            product = products[0]

            # 2. Resolve Category
            categories = list(ProductCategory.objects.filter(business_id=biz_id, name__icontains=category_query))
            if not categories:
                return {"error": f"No product categories found matching '{category_query}'."}
            if len(categories) > 1:
                options = [{"id": c.id, "name": c.name} for c in categories]
                return {"error": "Multiple categories found. Please be more specific:", "options": options}
            
            category = categories[0]

            # 3. Generate confirmation trigger
            return {
                "type": "confirmation_trigger",
                "message": f"Are you sure you want to categorize the product '{product.name}' under '{category.name}'?",
                "action": {
                    "tool": "execute_assignment",
                    "parameters": {
                        "entity_type": "product_category",
                        "source_id": product.id,
                        "target_id": category.id
                    }
                }
            }

        return await sync_to_async(resolve_entities)()
    except Exception as e:
        logger.error(f"Error in link_product_to_category: {e}")
        return {"error": str(e)}


async def link_expense_to_cost_category(expense_query: str, category_query: str) -> dict:
    """
    Search for an expense and a cost category, and generate a pre-flight confirmation trigger.
    - expense_query: matches expense title.
    - category_query: matches cost category name.
    """
    ctx = current_user_context.get()
    if not ctx or not ctx.get("business_id"):
        return {"error": "User context or business_id not found."}
    
    biz_id = ctx.get("business_id")

    try:
        def resolve_entities():
            # 1. Resolve Expense
            expenses = list(Expense.objects.filter(business_id=biz_id, title__icontains=expense_query))
            if not expenses:
                return {"error": f"No expenses found matching '{expense_query}'."}
            if len(expenses) > 1:
                options = [{"id": ex.id, "title": ex.title, "amount": float(ex.amount)} for ex in expenses]
                return {"error": "Multiple expenses found. Please be more specific:", "options": options}
            
            expense = expenses[0]

            # 2. Resolve Cost Category
            categories = list(CostCategory.objects.filter(business_id=biz_id, name__icontains=category_query))
            if not categories:
                return {"error": f"No cost categories found matching '{category_query}'."}
            if len(categories) > 1:
                options = [{"id": c.id, "name": c.name} for c in categories]
                return {"error": "Multiple cost categories found. Please be more specific:", "options": options}
            
            category = categories[0]

            # 3. Generate confirmation trigger
            return {
                "type": "confirmation_trigger",
                "message": f"Are you sure you want to link the expense '{expense.title}' to the cost category '{category.name}'?",
                "action": {
                    "tool": "execute_assignment",
                    "parameters": {
                        "entity_type": "expense_cost_category",
                        "source_id": expense.id,
                        "target_id": category.id
                    }
                }
            }

        return await sync_to_async(resolve_entities)()
    except Exception as e:
        logger.error(f"Error in link_expense_to_cost_category: {e}")
        return {"error": str(e)}


async def link_expense_to_branch(expense_query: str, branch_query: str) -> dict:
    """
    Search for an expense and a branch, and generate a pre-flight confirmation trigger.
    - expense_query: search query matching expense title.
    - branch_query: search query matching branch name.
    """
    ctx = current_user_context.get()
    if not ctx or not ctx.get("business_id"):
        return {"error": "User context or business_id not found."}
    
    biz_id = ctx.get("business_id")

    try:
        def resolve_entities():
            from apps.business.models import Branch
            # 1. Resolve Expense
            expenses = list(Expense.objects.filter(business_id=biz_id, title__icontains=expense_query))
            if not expenses:
                return {"error": f"No expenses found matching '{expense_query}'."}
            if len(expenses) > 1:
                options = [{"id": ex.id, "title": ex.title, "amount": float(ex.amount)} for ex in expenses]
                return {"error": "Multiple expenses found. Please be more specific:", "options": options}
            
            expense = expenses[0]

            # 2. Resolve Branch
            branches = list(Branch.objects.filter(business_id=biz_id, name__icontains=branch_query))
            if not branches:
                return {"error": f"No branches found matching '{branch_query}'."}
            if len(branches) > 1:
                options = [{"id": b.id, "name": b.name} for b in branches]
                return {"error": "Multiple branches found. Please be more specific:", "options": options}
            
            branch = branches[0]

            # 3. Generate confirmation trigger
            return {
                "type": "confirmation_trigger",
                "message": f"Are you sure you want to allocate the expense '{expense.title}' to the branch '{branch.name}'?",
                "action": {
                    "tool": "execute_assignment",
                    "parameters": {
                        "entity_type": "expense_branch",
                        "source_id": expense.id,
                        "target_id": branch.id
                    }
                }
            }

        return await sync_to_async(resolve_entities)()
    except Exception as e:
        logger.error(f"Error in link_expense_to_branch: {e}")
        return {"error": str(e)}



async def execute_assignment(entity_type: str, source_id: int, target_id: int) -> dict:
    """
    Core executor called only after user double confirmation (Yes clicked).
    Performs transactional update of ForeignKey relations in database.
    - entity_type: task_employee, product_category, expense_cost_category, po_supplier, so_customer.
    - source_id: Primary key of source model.
    - target_id: Primary key of target model.
    """
    ctx = current_user_context.get()
    if not ctx or not ctx.get("business_id"):
        return {"error": "User context or business_id not found."}
    
    biz_id = ctx.get("business_id")

    try:
        def db_write():
            with transaction.atomic():
                # Helper to create a mock request object for serializer contexts
                from apps.business.models import Business
                biz_obj = Business.objects.filter(id=biz_id).first()
                mock_request = SimpleNamespace(
                    user=SimpleNamespace(
                        business=biz_obj,
                        is_authenticated=True,
                        role_name="OWNER"
                    ),
                    query_params={}
                )

                if entity_type == "task_employee":
                    task = Task.objects.get(business_id=biz_id, id=source_id)
                    user = User.objects.get(business_roles__business_id=biz_id, id=target_id)
                    serializer = TaskSerializer(
                        instance=task,
                        data={"assignee_id": user.id},
                        partial=True,
                        context={"request": mock_request}
                    )
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                    return {"success": True, "message": f"Successfully assigned task '{task.title}' to employee '{user.username}'!"}
                
                elif entity_type == "product_category":
                    product = Product.objects.get(business_id=biz_id, id=source_id)
                    category = ProductCategory.objects.get(business_id=biz_id, id=target_id)
                    serializer = ProductSerializer(
                        instance=product,
                        data={"product_category_id": category.id},
                        partial=True,
                        context={"request": mock_request}
                    )
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                    return {"success": True, "message": f"Successfully grouped product '{product.name}' under category '{category.name}'!"}
                
                elif entity_type == "expense_cost_category":
                    expense = Expense.objects.get(business_id=biz_id, id=source_id)
                    category = CostCategory.objects.get(business_id=biz_id, id=target_id)
                    serializer = ExpenseSerializer(
                        instance=expense,
                        data={"category_id": category.id},
                        partial=True,
                        context={"request": mock_request}
                    )
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                    return {"success": True, "message": f"Successfully linked expense '{expense.title}' to cost category '{category.name}'!"}
                
                elif entity_type == "expense_branch":
                    expense = Expense.objects.get(business_id=biz_id, id=source_id)
                    branch = Branch.objects.get(business_id=biz_id, id=target_id)
                    serializer = ExpenseSerializer(
                        instance=expense,
                        data={"branch_id": branch.id},
                        partial=True,
                        context={"request": mock_request}
                    )
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                    return {"success": True, "message": f"Successfully linked expense '{expense.title}' to branch '{branch.name}'!"}
                

                else:
                    return {"error": f"Invalid entity_type '{entity_type}'."}

        return await sync_to_async(db_write)()
    except Exception as e:
        logger.error(f"Error in execute_assignment: {e}")
        return {"error": str(e)}
