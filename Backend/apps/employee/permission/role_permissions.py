ROLE_PERMISSIONS = {
    "OWNER": "__all__",

    "MANAGER": "__manager__",

    "EMPLOYEE": {
        "user": [
            "view_user", 
            "change_user",
            "delete_user"
        ],
        "chat": [
            "view_conversation", "add_conversation", "change_conversation", "delete_conversation",
            "view_message", "add_message", "change_message", "delete_message"
        ],
        "business": [
            "view_business", "view_branch"
        ],
        "tasks": [
            "view_task", "add_task", "change_task", "delete_task",
            "view_taskgroup"
        ]
    }
}

# MODULE GROUPS for work-based permissions
MODULE_GROUPS = {
    "Invoice Access": ["invoice", "customer", "payment"],
    "Inventory Access": ["inventory"],
    "Product Access": ["product"],
    "Analytics Access": ["analytics"],
    "Supplier Access": ["supplier"]
}
