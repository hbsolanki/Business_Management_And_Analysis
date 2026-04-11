import {
  PencilSquareIcon,
  TrashIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";

function UserCardGrid({
  title,
  users,
  onDelete,
  editPath,
  showDelete = true,
  emptyText = "No data found",
}) {
  return (
    <>
      <h2 className="text-2xl font-semibold text-slate-900 mb-6">
        {title}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-6">
        {users.length ? (
          users.map((user) => (
            <div
              key={user.id}
              className="glass-panel rounded-2xl p-5 shadow-card hover:shadow-glow transition"
            >
              <img
                src={user.profile_picture || `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}`}
                alt="avatar"
                className="w-full h-32 object-cover rounded-xl shadow-sm"
              />

              <h3 className="mt-4 text-lg font-semibold text-slate-900 flex items-center gap-1">
                <UserIcon className="h-5 w-5 text-slate-500" />
                {user.first_name} {user.last_name}
              </h3>

              <div className="mt-2 space-y-1 text-sm text-slate-600">
                <p className="flex items-center gap-1">
                  <EnvelopeIcon className="h-4 w-4" />
                  {user.email || "N/A"}
                </p>
                <p className="flex items-center gap-1">
                  <PhoneIcon className="h-4 w-4" />
                  {user.mobile_number}
                </p>
                <p>
                  <strong>Role:</strong> {user.role}
                </p>
              </div>

              <div className="mt-4 flex justify-between text-sm">
                <a
                  href={`${editPath}/${user.id}/edit`}
                  className="text-brand-700 hover:text-brand-800 flex items-center gap-1 font-semibold"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  Edit
                </a>

                {showDelete && (
                  <button
                    onClick={() => onDelete(user.id)}
                    className="text-red-600 hover:text-red-700 flex items-center gap-1 font-semibold"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="col-span-full text-center text-slate-500">
            {emptyText}
          </p>
        )}
      </div>
    </>
  );
}

export default UserCardGrid;
