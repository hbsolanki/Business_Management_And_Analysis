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
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {title}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-6">
        {users.length ? (
          users.map((user) => (
            <div
              key={user.id}
              className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition"
            >
              <img
                src={user.profile_picture || `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}`}
                alt="avatar"
                className="w-full h-32 object-cover rounded-md"
              />

              <h3 className="mt-3 text-lg font-semibold flex items-center gap-1">
                <UserIcon className="h-5 w-5 text-gray-600" />
                {user.first_name} {user.last_name}
              </h3>

              <div className="mt-2 space-y-1 text-sm text-gray-700">
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
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  Edit
                </a>

                {showDelete && (
                  <button
                    onClick={() => onDelete(user.id)}
                    className="text-red-600 hover:underline flex items-center gap-1"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="col-span-full text-center text-gray-500">
            {emptyText}
          </p>
        )}
      </div>
    </>
  );
}

export default UserCardGrid;
