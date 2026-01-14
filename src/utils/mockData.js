export const MOCK_ADMIN = {
    _id: 'admin_1',
    username: 'Admin User',
    email: 'admin@securecollab.com',
    role: 'admin',
    organizationId: 'org_1',
    profilePicture: 'https://via.placeholder.com/150',
};

export const MOCK_EMPLOYEE = {
    _id: 'emp_1',
    username: 'Employee User',
    email: 'employee@securecollab.com',
    role: 'employee',
    organizationId: 'org_1',
    profilePicture: 'https://via.placeholder.com/150',
};

export const MOCK_USER = MOCK_ADMIN;

export const MOCK_CHANNELS = [
    { _id: 'chan_1', name: 'general', description: 'General discussion', type: 'public', unreadCount: 2 },
    { _id: 'chan_2', name: 'announcements', description: 'Important company updates', type: 'public', unreadCount: 0 },
    { _id: 'chan_3', name: 'development', description: 'Coding and tech', type: 'private', unreadCount: 5 },
];

export const MOCK_DIRECT_MESSAGES = [
    {
        conversationId: 'dm_1',
        participant: { _id: 'user_2', username: 'Sarah Johnson', status: 'online' },
        lastMessage: 'Got the documents, thanks!',
        timestamp: new Date().toISOString(),
        unreadCount: 0,
    },
    {
        conversationId: 'dm_2',
        participant: { _id: 'user_3', username: 'Mike Porter', status: 'offline' },
        lastMessage: 'Are we still meeting at 2?',
        timestamp: new Date().toISOString(),
        unreadCount: 1,
    },
];

export const MOCK_MESSAGES = [
    {
        _id: 'msg_1',
        senderId: 'user_2',
        senderName: 'Sarah Johnson',
        content: 'Hello team! Welcome to the secure collaboration platform.',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        type: 'text',
    },
    {
        _id: 'msg_2',
        senderId: 'user_1',
        senderName: 'Demo User',
        content: 'Thank you Sarah! This looks great.',
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        type: 'text',
    },
];

export const MOCK_VAULT_ITEMS = [
    {
        _id: 'file_1',
        fileName: 'Project_Security_Plan.pdf',
        fileSize: 2500000,
        mimeType: 'application/pdf',
        createdAt: new Date().toISOString(),
        tags: ['Confidential', 'Planning'],
    },
    {
        _id: 'file_2',
        fileName: 'Employee_Credentials.xlsx',
        fileSize: 120000,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        createdAt: new Date().toISOString(),
        tags: ['HR', 'Sensitive'],
    },
];
