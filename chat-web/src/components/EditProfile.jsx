import { useRef, useState } from "react";
import axios from "axios";
import { PROFILE_URL } from "../utils/constants";
import { useDispatch } from "react-redux";
import { addUser } from "../utils/userSlice";
import PreviewCard from "./PreviewCard";
import { useNavigate } from "react-router-dom";

const EditProfile = ({ user }) => {
  const [firstName,    setFirstName]    = useState(user.firstName  || "");
  const [lastName,     setLastName]     = useState(user.lastName   || "");
  const [age,          setAge]          = useState(user.age        || "");
  const [gender,       setGender]       = useState(user.gender     || "");
  const [about,        setAbout]        = useState(user.about      || "");
  const [photoFile,    setPhotoFile]    = useState(null);
  const [photoPreview, setPhotoPreview] = useState(user.profilePic || "");
  const [error,        setError]        = useState("");
  const [showToast,    setShowToast]    = useState(false);
  const [loading,      setLoading]      = useState(false);

  const fileInputRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const saveProfile = async () => {
    setError("");
    setLoading(true);
    try {
      const body = { firstName, lastName, age, gender, about };

      if (photoFile) {
        body.profilePic = await toBase64(photoFile);
      }

      const patchRes = await axios.put(
        PROFILE_URL + "patchProfile",
        body,
        { withCredentials: true }
      );
      const updatedProfile = patchRes.data.data;

      dispatch(addUser(updatedProfile));
      setPhotoFile(null);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      navigate("/friends");
    } catch (err) {
      const status = err?.response?.status;
      if ([401, 403, 404, 500].includes(status)) {
        navigate("/error", { state: { code: status } });
      } else {
        setError(err?.response?.data?.message || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { label: "First Name:", value: firstName, setter: setFirstName, placeholder: "Enter firstName", type: "text"   },
    { label: "Last Name:",  value: lastName,  setter: setLastName,  placeholder: "Enter lastName",  type: "text"   },
    { label: "Age:",        value: age,       setter: setAge,       placeholder: "Enter age",        type: "number" },
    { label: "Gender:",     value: gender,    setter: setGender,    placeholder: "Enter gender",     type: "text"   },
  ];

  return (
    <>
      <div className="flex flex-col lg:flex-row justify-center items-start gap-10 my-10 px-4">
        <div className="card bg-base-100/80 backdrop-blur-md shadow-xl border border-primary/20 rounded-2xl w-full max-w-md">
          <div className="card-body space-y-3 py-6">

            <div className="flex flex-col items-center gap-1 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  strokeLinejoin="round" className="text-primary">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-primary tracking-wide">Edit Profile</h2>
              <p className="text-xs text-base-content/50">Update your details below</p>
            </div>

            {/* Photo upload */}
            <div className="form-control items-center gap-3">
              <div
                className="w-20 h-20 rounded-full border-2 border-primary/30 overflow-hidden bg-base-200 flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="profile" className="w-full h-full object-cover" />
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                    className="text-base-content/30">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                )}
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm btn-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                {photoFile ? "Change Photo" : "Upload Photo"}
              </button>
              {photoFile && (
                <p className="text-xs text-base-content/50 truncate max-w-xs">{photoFile.name}</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {fields.map(({ label, value, setter, placeholder, type }) => (
              <div className="form-control" key={label}>
                <label className="label py-1">
                  <span className="label-text text-base-content/80 text-xs">{label}</span>
                </label>
                <input
                  type={type}
                  value={value}
                  placeholder={placeholder}
                  className="input input-bordered input-sm bg-base-200/60 focus:border-primary focus:outline-none w-full"
                  onChange={(e) => setter(e.target.value)}
                />
              </div>
            ))}

            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-base-content/80 text-xs">About</span>
              </label>
              <textarea
                value={about}
                placeholder="Write a short bio..."
                rows={3}
                className="textarea textarea-bordered textarea-sm bg-base-200/60 focus:border-primary focus:outline-none w-full resize-none"
                onChange={(e) => setAbout(e.target.value)}
              />
            </div>

            {error && (
              <label className="label pt-0">
                <span className="label-text-alt text-error flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </span>
              </label>
            )}

            <div className="pt-1">
              <button
                className="btn btn-primary w-full text-base font-semibold tracking-wide hover:scale-[1.02] transition-all duration-300"
                onClick={saveProfile}
                disabled={loading}
              >
                {loading ? <span className="loading loading-spinner loading-sm" /> : "Save Profile"}
              </button>
            </div>
          </div>
        </div>

        <PreviewCard photoPreview={photoPreview} />
      </div>

      {showToast && (
        <div className="toast toast-top toast-center z-50">
          <div className="alert alert-success shadow-lg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
            <span>Profile saved successfully.</span>
          </div>
        </div>
      )}
    </>
  );
};

export default EditProfile;
