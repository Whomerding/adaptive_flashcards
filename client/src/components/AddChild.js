import React from "react";

const avatarOptions = [
  {
    key: "red_dragon",
    label: "Red Dragon",
    src: "/avatars/red_dragon.png",
  },

  {
    key: "green_dragon",
    label: "Green Dragon",
    src: "/avatars/green_dragon.png",
  },
  {
    key: "white_tiger",
    label: "White Tiger",
    src: "/avatars/blue_tiger.png",
  },
  {
    key: "wolf_knight",
    label: "Wolf Knight",
    src: "/avatars/wolf_knight.png",
  },
  {
    key: "purple_unicorn",
    label: "Unicorn",
    src: "/avatars/purple_unicorn.png",
  },
  {
    key: "blue_phoenix",
    label: "Phoenix",
    src: "/avatars/blue_phoenix.png",
  },
];

export default function AddChild({
  handleAddChildren,
  deleteChild,
  children = [],
  error,
  loading = false,
}) {
  const [childName, setChildName] = React.useState("");
  const [selectedAvatar, setSelectedAvatar] = React.useState("red-dragon");
  const [isOpen, setIsOpen] = React.useState(false);

  function handleSubmit(e) {
    e.preventDefault();

    const trimmedName = childName.trim();
    if (!trimmedName) return;

    handleAddChildren({
      name: trimmedName,
      avatar: selectedAvatar,
    });

    setChildName("");
    setSelectedAvatar("red-dragon");
    setIsOpen(false);
  }

return (
    <div className="card shadow-sm border-0 h-100">
      <div
        className="card-body p-4"
        role="button"
        style={{ cursor: "pointer" }}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <div className="text-center">
          <div
            className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle bg-light"
            style={{ width: "96px", height: "96px", fontSize: "2rem" }}
          >
            {isOpen ? "✏️" : "➕"}
          </div>

          <h4 className="card-title mb-1">Add / Manage Children</h4>
          <p className="text-muted small mb-0">
            Click to {isOpen ? "collapse" : "expand"}
          </p>
        </div>

        {isOpen && (
          <div
            className="mt-4"
            onClick={(e) => e.stopPropagation()}
          >
            {error && (
              <div className="alert alert-danger py-2" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="childName" className="form-label fw-semibold">
                  Child Name
                </label>
                <input
                  id="childName"
                  type="text"
                  className="form-control"
                  placeholder="Enter child name"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Choose an Avatar</label>

                <div className="row g-2">
                  {avatarOptions.map((avatar) => (
                    <div className="col-4" key={avatar.key}>
                      <button
                        type="button"
                        className={`btn w-100 p-2 border ${
                          selectedAvatar === avatar.key
                            ? "border-primary border-3"
                            : "border-light"
                        }`}
                        onClick={() => setSelectedAvatar(avatar.key)}
                        style={{ background: "white" }}
                      >
                        <img
                          src={avatar.src}
                          alt={avatar.label}
                          className="img-fluid rounded-circle mb-2"
                          style={{
                            width: "64px",
                            height: "64px",
                            objectFit: "cover",
                          }}
                        />
                        <div
                          className="small text-dark"
                          style={{ lineHeight: "1.1" }}
                        >
                          {avatar.label}
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={loading}
              >
                {loading ? "Adding..." : "Add Child"}
              </button>
            </form>

            <hr className="my-4" />

            <div>
              <h6 className="fw-semibold mb-3">Delete a Child</h6>

              {children.length === 0 ? (
                <div className="text-muted small">No children to delete</div>
              ) : (
                <div className="d-grid gap-2">
                  {children.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={() => deleteChild(child.id)}
                    >
                      Delete {child.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}