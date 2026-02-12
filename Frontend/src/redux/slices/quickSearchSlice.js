import { createSlice } from '@reduxjs/toolkit';

const ownerItems = [
    {
        label: 'Analytics',
        desc: 'Insights and performance reports',
        path: '/analytics',
        icon: 'analytics',
        group: 'Insights',
        keywords: ['reports', 'overview', 'charts'],
    },
    {
        label: 'Employees',
        desc: 'Manage employee records',
        path: '/employees/manage',
        icon: 'employees',
        group: 'People',
        keywords: ['staff', 'team'],
    },
    {
        label: 'Managers',
        desc: 'Manage managers and roles',
        path: '/manager/manage',
        icon: 'managers',
        group: 'People',
        keywords: ['team leads'],
    },
    {
        label: 'Products',
        desc: 'View products and pricing',
        path: '/product',
        icon: 'products',
        group: 'Catalog',
        keywords: ['items', 'catalog'],
    },
    {
        label: 'Inventory',
        desc: 'Check stock levels',
        path: '/inventory',
        icon: 'inventory',
        group: 'Operations',
        keywords: ['stock'],
    },
    {
        label: 'Invoices',
        desc: 'Create and manage invoices',
        path: '/invoice',
        icon: 'invoices',
        group: 'Finance',
        keywords: ['billing', 'payments'],
    },
    {
        label: 'Costs',
        desc: 'Track monthly expenses',
        path: '/cost-category',
        icon: 'costs',
        group: 'Finance',
        keywords: ['expenses', 'cost'],
    },
    {
        label: 'Chat',
        desc: 'Message your team',
        path: '/chat',
        icon: 'chat',
        group: 'Comms',
        keywords: ['messages', 'broadcast'],
    },
    {
        label: 'Tasks',
        desc: 'Assign and manage tasks',
        path: '/tasks',
        icon: 'tasks',
        group: 'Work',
        keywords: ['todo', 'work'],
    },
    {
        label: 'My Profile',
        desc: 'View your profile details',
        path: '/profile',
        icon: 'profile',
        group: 'Account',
        keywords: ['account'],
    },
    {
        label: 'Edit Profile',
        desc: 'Update personal information',
        path: '/owner/edit',
        icon: 'edit_profile',
        group: 'Account',
        keywords: ['settings', 'account edit'],
    },
];

const managerItems = [
    {
        label: 'Analytics',
        desc: 'Insights and performance reports',
        path: '/analytics',
        icon: 'analytics',
        group: 'Insights',
        keywords: ['reports', 'overview', 'charts'],
    },
    {
        label: 'Employees',
        desc: 'Manage employee records',
        path: '/employees/manage',
        icon: 'employees',
        group: 'People',
        keywords: ['staff', 'team'],
    },
    {
        label: 'Products',
        desc: 'View products and pricing',
        path: '/product',
        icon: 'products',
        group: 'Catalog',
        keywords: ['items', 'catalog'],
    },
    {
        label: 'Inventory',
        desc: 'Check stock levels',
        path: '/inventory',
        icon: 'inventory',
        group: 'Operations',
        keywords: ['stock'],
    },
    {
        label: 'Invoices',
        desc: 'Create and manage invoices',
        path: '/invoice',
        icon: 'invoices',
        group: 'Finance',
        keywords: ['billing', 'payments'],
    },
    {
        label: 'Costs',
        desc: 'Track monthly expenses',
        path: '/cost-category',
        icon: 'costs',
        group: 'Finance',
        keywords: ['expenses', 'cost'],
    },
    {
        label: 'Tasks',
        desc: 'Assign and manage tasks',
        path: '/tasks',
        icon: 'tasks',
        group: 'Work',
        keywords: ['todo', 'work'],
    },
    {
        label: 'Chat',
        desc: 'Message your team',
        path: '/chat',
        icon: 'chat',
        group: 'Comms',
        keywords: ['messages', 'broadcast'],
    },
    {
        label: 'My Profile',
        desc: 'View your profile details',
        path: '/profile',
        icon: 'profile',
        group: 'Account',
        keywords: ['account'],
    },
    {
        label: 'Edit Profile',
        desc: 'Update personal information',
        path: '/manager/edit',
        icon: 'edit_profile',
        group: 'Account',
        keywords: ['settings', 'account edit'],
    },
];

const quickSearchSlice = createSlice({
    name: 'quickSearch',
    initialState: {
        ownerItems,
        managerItems,
    },
    reducers: {},
});

export const selectOwnerQuickSearchItems = (state) => state.quickSearch.ownerItems;
export const selectManagerQuickSearchItems = (state) => state.quickSearch.managerItems;

export default quickSearchSlice.reducer;
