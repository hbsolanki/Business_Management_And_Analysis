export const formatTime = (isoString) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const getInitials = (user) => {
    if (!user) return "?";
    return `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}` || user.username?.[0]?.toUpperCase() || "?";
};
