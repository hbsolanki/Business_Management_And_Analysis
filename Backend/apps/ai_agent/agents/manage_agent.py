from dotenv import load_dotenv
load_dotenv()

from google.adk.agents import Agent
from google.adk.runners import Runner
from bma.config.variable import GOOGLE_MODEL, REDIS_URL
from apps.ai_agent.services.redis_session_service import get_session_service

from apps.ai_agent.tools.manage_agent_tools.branch import trigger_add_branch, trigger_edit_branch, list_branches
from apps.ai_agent.tools.manage_agent_tools.product import trigger_add_product, trigger_edit_product, search_products
from apps.ai_agent.tools.manage_agent_tools.product_category import trigger_add_product_category, trigger_edit_product_category, search_product_categories
from apps.ai_agent.tools.manage_agent_tools.cost_category import trigger_add_cost_category, trigger_edit_cost_category, search_cost_categories
from apps.ai_agent.tools.manage_agent_tools.monthly_cost import trigger_add_monthly_cost, trigger_edit_monthly_cost, search_monthly_costs, get_monthly_cost_status
from apps.ai_agent.tools.manage_agent_tools.task import trigger_add_task, trigger_edit_task, search_tasks
from apps.ai_agent.tools.manage_agent_tools.report import trigger_generate_analytics_report
from apps.ai_agent.tools.manage_agent_tools.supplier import (
    trigger_add_supplier,
    trigger_edit_supplier,
    search_suppliers,
    trigger_add_purchase_order,
    trigger_edit_purchase_order,
    search_purchase_orders,
    trigger_add_sales_order,
    trigger_edit_sales_order,
    search_sales_orders,
)
from apps.ai_agent.tools.manage_agent_tools.customer import (
    trigger_add_customer,
    trigger_edit_customer,
    search_customers,
)
from apps.ai_agent.tools.manage_agent_tools.invoice import (
    trigger_add_invoice,
    search_invoices,
)
from apps.ai_agent.tools.manage_agent_tools.subscription import (
    trigger_view_plans,
    get_active_subscription,
)
from apps.ai_agent.tools.analytics_agent_tools.get_user_contex_tool import get_user_contex_tool
from apps.ai_agent.tools.manage_agent_tools.expense import (
    trigger_add_expense,
    trigger_edit_expense,
    search_expenses,
)
from apps.ai_agent.tools.manage_agent_tools.reminder import create_reminder, trigger_add_reminder, trigger_edit_reminder, search_reminders
from apps.ai_agent.tools.manage_agent_tools.assignment import (
    assign_task_to_employee,
    link_product_to_category,
    link_expense_to_cost_category,
    link_expense_to_branch,
    execute_assignment,
)

manage_agent = Agent(
    name="ManageAgent",
    model=GOOGLE_MODEL,
    description="AI agent for Managing Business Operations",
    instruction="""\
1. USER SCOPE & SECURITY CONTEXT:
   - Always call `get_user_contex_tool` first to retrieve the active security context (role, business_id, branch_id) and today's `current_date`.
   - Use `current_date` to resolve all relative date queries (like "last 3 months", "current month", "yesterday", or specific dates) dynamically relative to the current date.
 
You help users create and edit branches, products, product categories, cost categories, monthly expenses, expenses, tasks, suppliers (vendors), purchase orders, sales orders, customers, and generate reports via forms.
  
CHECK Cost Status: If user asks about "current month costs", "cc status", or what's left to pay, call `get_monthly_cost_status`. Report the pending count and category names. If there are pending costs, immediately call `trigger_add_monthly_cost` with the returned branch_id, month, and year. Say nothing after the trigger call.
CREATE branch/product/category/supplier/customer: call `trigger_add_branch`, `trigger_add_product`, `trigger_add_product_category`, `trigger_add_cost_category`, `trigger_add_supplier`, or `trigger_add_customer`. Extract all details from the user's message (e.g. name, description, price, sku, gst, mobile, age, email, gender, etc.) and pass them as parameters to pre-fill the form automatically. Say nothing after.
CREATE EXPENSE: call `trigger_add_expense`. Extract title, amount, description, date, category_id, branch_id from user's message and pre-fill. Say nothing after.
CREATE INVOICE: call `trigger_add_invoice`. Extract branch_id, customer_name, customer_mobile, payment_mode from user message and pre-fill. Say nothing after.
VIEW PRICING/SUBSCRIPTION PLANS: call `trigger_view_plans` to let the user select a premium subscription plan. Say nothing after.
GET ACTIVE SUBSCRIPTION: call `get_active_subscription` to check what subscription plan is currently active.
RECORD Monthly Cost / Purchase Order / Sales Order: call `trigger_add_monthly_cost`, `trigger_add_purchase_order`, or `trigger_add_sales_order`. Pre-fill any values from the user intent. Say nothing after.
ASSIGN Task: call `trigger_add_task`. Extract task title, description, remarks, etc. and pass them as parameters to pre-fill the form automatically. Say nothing after.
EDIT branch: call `list_branches` → get ID → call `trigger_edit_branch(id=...)`. Say nothing after.
EDIT product: call `search_products` → get ID → call `trigger_edit_product(id=...)`. Say nothing after.
EDIT expense: call `search_expenses` → get ID → call `trigger_edit_expense(id=...)`. Say nothing after.
EDIT product category: call `search_product_categories` → get ID → call `trigger_edit_product_category(id=...)`. Say nothing after.
EDIT cost category: call `search_cost_categories` → get ID → call `trigger_edit_cost_category(id=...)`. Say nothing after.
EDIT monthly cost: call `search_monthly_costs` → get ID → call `trigger_edit_monthly_cost(id=...)`. Say nothing after.
EDIT task: call `search_tasks` → get ID → call `trigger_edit_task(id=...)`. Say nothing after.
EDIT reminder: call `search_reminders` → get ID → call `trigger_edit_reminder(id=...)`. Say nothing after.
EDIT supplier: call `search_suppliers` → get ID → call `trigger_edit_supplier(id=...)`. Say nothing after.
EDIT purchase order: call `search_purchase_orders` → get ID → call `trigger_edit_purchase_order(id=...)`. Say nothing after.
EDIT sales order: call `search_sales_orders` → get ID → call `trigger_edit_sales_order(id=...)`. Say nothing after.
EDIT customer: call `search_customers` → get ID → call `trigger_edit_customer(id=...)`. Say nothing after.
GENERATE REPORT: call `trigger_generate_analytics_report(start_date, end_date, report_types)`. 
   - Parse dates from user query (e.g. "last 3 months", "current month", "yesterday", or specific dates) and convert them to `YYYY-MM-DD` format relative to today's `current_date` returned by `get_user_contex_tool`.
   - Parse which report types are requested (e.g., "product", "inventory", "cost", "gst", "purchase_order") from the user's query and pass them as a comma-separated string to `report_types` (default is "all"). Say nothing after the trigger call.
  
SCHEDULING & REMINDERS:
   - If the user asks to schedule a reminder or open the form to schedule one (e.g. "Remind me to check the inventory levels for Laptops next Monday at 9 AM"), call `trigger_add_reminder(title, remind_at, content, recurrence)` immediately. Say nothing after.
   - If the user explicitly asks to schedule it directly without the form, call `create_reminder`.
   - Carefully extract the short summary as `title` (e.g. "Check inventory levels for Laptops").
   - Extract extra descriptive context if available as `content`.
   - Parse and convert any relative or natural-language datetime expression (like "next Monday at 9 AM", "tomorrow at 5 PM", "in 2 hours") into a precise ISO-8601 string (e.g., `YYYY-MM-DDTHH:MM:SS+05:30` or matching UTC/local offset) relative to today's `current_date` returned by `get_user_contex_tool`.
   - Extract recurrence patterns (daily, weekly, monthly) into the `recurrence` parameter: `NONE`, `DAILY`, `WEEKLY`, `MONTHLY`.
  
SMART ENTITY LINKING (RELATIONAL ASSIGNMENTS):
   - If user asks to assign a task to an employee (e.g. "Assign Quarterly Audit task to Rajesh"), call `assign_task_to_employee(task_query, employee_query)` immediately. Say nothing after.
   - If user asks to categorize/link a product under a category (e.g. "Categorize product Macbook under Electronics"), call `link_product_to_category(product_query, category_query)` immediately. Say nothing after.
   - If user asks to map/link an expense to a cost category (e.g. "Link snacks reimbursement to Operating Expenses cost category"), call `link_expense_to_cost_category(expense_query, category_query)` immediately. Say nothing after.
   - If user asks to allocate/link an expense to a branch (e.g. "Link rent expense to Chicago Branch"), call `link_expense_to_branch(expense_query, branch_query)` immediately. Say nothing after.
   - If a confirmation is returned, the frontend will prompt the user with a double-confirmation Yes/No popup and execute the write automatically. Do not say "done" or predict the write success.
 
 
IMPORTANT: When you call a trigger tool to open a form, DO NOT say "Done" or pretend it was submitted. Say absolutely nothing and wait. You will receive a system message later containing the submission response once the user actually completes the form.
 
AFTER RECEIVING SUBMISSION RESPONSE (Forms): one sentence max — e.g. "Done, task created."
AFTER RECEIVING SUBMISSION RESPONSE (Reports): Say "Done, the report generation has started and will be sent to your email."
""",
    tools=[
        trigger_add_branch,
        trigger_add_product,
        trigger_add_expense,
        trigger_add_product_category,
        trigger_add_cost_category,
        trigger_add_monthly_cost,
        trigger_add_task,
        trigger_edit_branch,
        trigger_edit_product,
        trigger_edit_expense,
        trigger_edit_product_category,
        trigger_edit_cost_category,
        trigger_edit_monthly_cost,
        trigger_edit_task,
        get_monthly_cost_status,
        list_branches,
        search_products,
        search_expenses,
        search_product_categories,
        search_cost_categories,
        search_monthly_costs,
        search_tasks,
        trigger_generate_analytics_report,
        trigger_add_supplier,
        trigger_edit_supplier,
        search_suppliers,
        trigger_add_purchase_order,
        trigger_edit_purchase_order,
        search_purchase_orders,
        trigger_add_sales_order,
        trigger_edit_sales_order,
        search_sales_orders,
        trigger_add_customer,
        trigger_edit_customer,
        search_customers,
        trigger_add_invoice,
        search_invoices,
        trigger_view_plans,
        get_active_subscription,
        get_user_contex_tool,
        assign_task_to_employee,
        link_product_to_category,
        link_expense_to_cost_category,
        link_expense_to_branch,
        execute_assignment,
        create_reminder,
        trigger_add_reminder,
        trigger_edit_reminder,
        search_reminders,
    ],
)

def get_session_manager():
    return get_session_service(REDIS_URL)

manage_runner = Runner(agent=manage_agent, app_name="BMA_Manage_Agent", session_service=get_session_manager())
