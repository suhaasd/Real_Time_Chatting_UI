import { useSelector } from "react-redux";

const PreviewCard = ({ photoPreview }) => {
  const user = useSelector((store) => store.user);

  if (!user) return null;

  const { firstName, lastName, age, gender, about } = user;
  const profilePic = photoPreview || user.profilePic;

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-base-content/50 tracking-wide uppercase font-medium">
        Preview
      </p>

      <div className="card bg-base-100/80 backdrop-blur-md shadow-xl border border-primary/20 rounded-2xl w-80 overflow-hidden">


        <figure className="relative h-72 bg-base-200">
          {profilePic ? (
            <img
              src={profilePic}
              alt="profile preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                className="text-primary/40">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
          )}

          {(age || gender) && (
            <div className="absolute bottom-3 left-3">
              <span className="badge badge-primary badge-sm font-medium px-3 py-2 shadow">
                {[age, gender].filter(Boolean).join(" · ")}
              </span>
            </div>
          )}
        </figure>


        <div className="card-body px-5 py-4 space-y-2">
          <h2 className="card-title text-lg font-bold text-base-content">
            {firstName || "Your Name"} {lastName}
          </h2>
          {about ? (
            <p className="text-sm text-base-content/60 line-clamp-3 leading-relaxed">
              {about}
            </p>
          ) : (
            <p className="text-sm text-base-content/30 italic">
              Your bio will appear here...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviewCard;