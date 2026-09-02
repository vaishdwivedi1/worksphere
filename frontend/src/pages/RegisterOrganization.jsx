import { useState } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import APIPATHS from "../utils/APIPATHS";
import STATICPATHS from "../utils/STATICPATHS";

const RegisterOrganization = () => {
  // Form states
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();
  // Form data
  const [formData, setFormData] = useState({
    company_name: "",
    owner_name: "",
    owner_email: "",
    company_email: "",
    plan: "FREE",
    owner_phone: "",
    password: "",
    confirm_password: "",
  });

  // Phone number state
  const [phone, setPhone] = useState("");

  // File state
  const [logoBase64, setLogoBase64] = useState("");
  const [logoPreview, setLogoPreview] = useState("");

  // OTP states - THREE separate OTPs
  const [otpData, setOtpData] = useState({
    owner_otp: "",
    company_otp: "",
    phone_otp: "",
  });

  // Compress image function
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 150;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round(height * (MAX_SIZE / width));
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round(width * (MAX_SIZE / height));
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.6);
          resolve(compressed);
        };
      };
    });
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  // Handle phone change
  const handlePhoneChange = (value) => {
    setPhone(value);
    setFormData((prev) => ({
      ...prev,
      owner_phone: value || "",
    }));
    setError("");
  };

  // Handle file change
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
      ];
      if (!validTypes.includes(file.type)) {
        setError(
          "Please upload a valid image file (JPEG, PNG, GIF, WEBP, SVG)",
        );
        e.target.value = "";
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        setError("File size must be less than 2MB");
        e.target.value = "";
        return;
      }

      try {
        const compressedBase64 = await compressImage(file);
        setLogoPreview(compressedBase64);
        setLogoBase64(compressedBase64);
        setError("");
      } catch (error) {
        setError("Failed to process image");
      }
    }
  };

  // Remove logo
  const handleRemoveLogo = () => {
    setLogoBase64("");
    setLogoPreview("");
    const fileInput = document.getElementById("logo-upload");
    if (fileInput) fileInput.value = "";
  };

  // Handle OTP input change
  const handleOtpChange = (e) => {
    const { name, value } = e.target;
    if (value && !/^\d*$/.test(value)) return;
    setOtpData((prev) => ({
      ...prev,
      [name]: value.slice(0, 6),
    }));
    setError("");
  };

  // Validate form
  const validateForm = () => {
    const {
      company_name,
      owner_name,
      owner_email,
      company_email,
      plan,
      password,
      confirm_password,
    } = formData;

    if (!company_name.trim()) return "Company name is required";
    if (!owner_name.trim()) return "Owner name is required";
    if (!owner_email.trim()) return "Owner email is required";
    if (!company_email.trim()) return "Company email is required";
    if (!phone) return "Phone number is required";
    if (!password.trim()) return "Password is required";
    if (!confirm_password.trim()) return "Please confirm your password";
    if (password.length < 8) return "Password must be at least 8 characters";
    if (password !== confirm_password) return "Passwords do not match";

    if (!phone || phone.length < 10) {
      return "Please enter a valid phone number";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(owner_email)) return "Invalid owner email format";
    if (!emailRegex.test(company_email)) return "Invalid company email format";

    const validPlans = ["FREE", "PRO", "PREMIUM"];
    if (!validPlans.includes(plan)) return "Invalid plan selected";

    return null;
  };

  // Validate OTP
  const validateOtp = () => {
    const { owner_otp, company_otp, phone_otp } = otpData;
    if (!owner_otp || owner_otp.length !== 6)
      return "Owner email OTP must be 6 digits";
    if (!company_otp || company_otp.length !== 6)
      return "Company email OTP must be 6 digits";
    if (!phone_otp || phone_otp.length !== 6)
      return "Phone OTP must be 6 digits";
    return null;
  };

  // Handle create organization
  const handleCreateOrganization = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      const requestData = { ...formData };
      delete requestData.confirm_password;
      requestData.company_logo = logoBase64 || "";

      const response = await api.post(APIPATHS.createOrganization, requestData);

      if (response.success) {
        setStep(2);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError(response.message || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Create org error:", error);
      setError(error.message || "Failed to create organization");
    } finally {
      setLoading(false);
    }
  };

  // Handle verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const validationError = validateOtp();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      const verifyData = {
        ...formData,
        ...otpData,
      };
      delete verifyData.confirm_password;
      verifyData.company_logo = logoBase64 || "";

      const response = await api.post(APIPATHS.verifyOrganization, verifyData);

      if (response.success) {
        if (response.data?.token) {
          localStorage.setItem("authToken", response.data.token);
          localStorage.setItem("user", JSON.stringify(response.data.user));
        }
        navigate(STATICPATHS.login);
        setTimeout(() => {
          setFormData({
            company_name: "",
            owner_name: "",
            owner_email: "",
            company_email: "",
            plan: "FREE",
            owner_phone: "",
            password: "",
            confirm_password: "",
          });
          setPhone("");
          setLogoBase64("");
          setLogoPreview("");
          setOtpData({
            owner_otp: "",
            company_otp: "",
            phone_otp: "",
          });
          setStep(1);
        }, 3000);
      } else {
        setError(response.message || "OTP verification failed");
      }
    } catch (error) {
      console.error("Verify error:", error);
      setError(error.message || "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  // Handle back
  const handleBack = () => {
    setStep(1);
    setError("");
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setLoading(true);
    setError("");

    try {
      const requestData = { ...formData };
      delete requestData.confirm_password;
      requestData.company_logo = logoBase64 || "";

      const response = await api.post(APIPATHS.createOrganization, requestData);

      if (response.success) {
      } else {
        setError(response.message || "Failed to resend OTP");
      }
    } catch (error) {
      setError(error.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full bg-white h-full overflow-hidden min-h-[100dvh]">
      {/* Left Side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-black to-gray-800 p-12 flex-col justify-between items-center">
        <div className="w-full h-full flex flex-col justify-center items-center">
          <svg
            viewBox="0 0 500 500"
            className="w-full max-w-md"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="500" height="500" fill="none" />
            <circle cx="250" cy="250" r="200" fill="#1a1a1a" opacity="0.3" />
            <g transform="translate(120, 180)">
              <circle cx="30" cy="30" r="25" fill="#e5e7eb" />
              <rect
                x="5"
                y="55"
                width="50"
                height="60"
                rx="10"
                fill="#e5e7eb"
              />
              <rect
                x="-10"
                y="60"
                width="20"
                height="8"
                rx="4"
                fill="#d1d5db"
              />
              <rect x="40" y="60" width="20" height="8" rx="4" fill="#d1d5db" />
              <rect
                x="45"
                y="70"
                width="40"
                height="25"
                rx="3"
                fill="#374151"
              />
              <rect
                x="47"
                y="72"
                width="36"
                height="18"
                rx="2"
                fill="#4ade80"
                opacity="0.3"
              />
              <rect x="50" y="95" width="30" height="5" rx="2" fill="#374151" />
            </g>
            <g transform="translate(280, 150)">
              <circle cx="30" cy="30" r="25" fill="#e5e7eb" />
              <rect
                x="5"
                y="55"
                width="50"
                height="60"
                rx="10"
                fill="#e5e7eb"
              />
              <rect x="-5" y="60" width="15" height="8" rx="4" fill="#d1d5db" />
              <rect x="45" y="60" width="15" height="8" rx="4" fill="#d1d5db" />
              <rect
                x="50"
                y="65"
                width="30"
                height="35"
                rx="2"
                fill="#fbbf24"
                opacity="0.6"
              />
              <line
                x1="55"
                y1="75"
                x2="75"
                y2="75"
                stroke="#374151"
                strokeWidth="2"
              />
              <line
                x1="55"
                y1="82"
                x2="70"
                y2="82"
                stroke="#374151"
                strokeWidth="2"
              />
              <line
                x1="55"
                y1="89"
                x2="75"
                y2="89"
                stroke="#374151"
                strokeWidth="2"
              />
            </g>
            <g transform="translate(200, 260)">
              <circle cx="30" cy="25" r="22" fill="#e5e7eb" />
              <rect
                x="8"
                y="47"
                width="44"
                height="55"
                rx="10"
                fill="#e5e7eb"
              />
              <rect x="12" y="70" width="8" height="20" rx="2" fill="#4ade80" />
              <rect x="24" y="60" width="8" height="30" rx="2" fill="#fbbf24" />
              <rect x="36" y="75" width="8" height="15" rx="2" fill="#60a5fa" />
            </g>
            <line
              x1="165"
              y1="210"
              x2="230"
              y2="280"
              stroke="#4ade80"
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity="0.5"
            />
            <line
              x1="320"
              y1="180"
              x2="250"
              y2="280"
              stroke="#60a5fa"
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity="0.5"
            />
            <line
              x1="165"
              y1="210"
              x2="320"
              y2="180"
              stroke="#fbbf24"
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity="0.5"
            />
            <g transform="translate(340, 80)">
              <polygon points="15,0 0,30 15,25 30,30" fill="#4ade80" />
              <rect x="12" y="25" width="6" height="8" rx="2" fill="#fbbf24" />
              <circle cx="15" cy="10" r="3" fill="#60a5fa" opacity="0.5" />
            </g>
            <circle cx="380" cy="60" r="3" fill="#4ade80" opacity="0.6" />
            <circle cx="420" cy="90" r="2" fill="#fbbf24" opacity="0.6" />
            <circle cx="100" cy="100" r="2.5" fill="#60a5fa" opacity="0.6" />
            <circle cx="80" cy="70" r="2" fill="#4ade80" opacity="0.4" />
            <circle cx="430" cy="130" r="1.5" fill="#e5e7eb" opacity="0.4" />
            <circle cx="70" cy="130" r="1.5" fill="#e5e7eb" opacity="0.4" />
            <g transform="translate(150, 100)">
              <line
                x1="0"
                y1="-8"
                x2="0"
                y2="8"
                stroke="#fbbf24"
                strokeWidth="1.5"
                opacity="0.6"
              />
              <line
                x1="-8"
                y1="0"
                x2="8"
                y2="0"
                stroke="#fbbf24"
                strokeWidth="1.5"
                opacity="0.6"
              />
            </g>
            <g transform="translate(350, 180)">
              <line
                x1="0"
                y1="-6"
                x2="0"
                y2="6"
                stroke="#4ade80"
                strokeWidth="1.5"
                opacity="0.6"
              />
              <line
                x1="-6"
                y1="0"
                x2="6"
                y2="0"
                stroke="#4ade80"
                strokeWidth="1.5"
                opacity="0.6"
              />
            </g>
            <text
              x="250"
              y="430"
              textAnchor="middle"
              fill="#e5e7eb"
              fontSize="24"
              fontWeight="bold"
              letterSpacing="2"
            >
              WORKSPHERE
            </text>
            <text
              x="250"
              y="455"
              textAnchor="middle"
              fill="#9ca3af"
              fontSize="14"
            >
              Collaborate. Create. Grow.
            </text>
            <circle cx="50" cy="460" r="4" fill="#4ade80" opacity="0.3" />
            <circle cx="450" cy="460" r="4" fill="#60a5fa" opacity="0.3" />
            <circle cx="250" cy="470" r="3" fill="#fbbf24" opacity="0.3" />
          </svg>

          <div className="mt-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">
              Welcome to Worksphere
            </h2>
            <p className="text-gray-400 text-sm max-w-sm">
              Join thousands of teams already collaborating and growing together
            </p>
          </div>
        </div>

        <div className="text-gray-500 text-xs">
          © 2026 Worksphere. All rights reserved.
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 bg-white p-8 md:p-12 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-black mb-1 tracking-tight">
              Create Organization
            </h1>
            <p className="text-gray-500 text-sm">
              Set up your organization and start collaborating
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8 px-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-3 ${step === 1 ? "text-black" : "text-gray-400"}`}
              >
                <span
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all duration-300 ${
                    step === 1
                      ? "bg-black text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  1
                </span>
                <span className="text-sm font-medium hidden sm:inline">
                  Details
                </span>
              </div>
            </div>
            <div
              className={`flex-1 h-[2px] mx-4 max-w-[60px] transition-all duration-300 ${
                step >= 2 ? "bg-black" : "bg-gray-200"
              }`}
            />
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-3 ${step === 2 ? "text-black" : "text-gray-400"}`}
              >
                <span
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all duration-300 ${
                    step === 2
                      ? "bg-black text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  2
                </span>
                <span className="text-sm font-medium hidden sm:inline">
                  Verify OTP
                </span>
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="flex items-center gap-3 p-3.5 rounded-lg mb-4 bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Step 1: Create Organization */}
          {step === 1 && (
            <form onSubmit={handleCreateOrganization}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-700 text-sm font-medium">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    placeholder="Enter company name"
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-black text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all placeholder:text-gray-400"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-700 text-sm font-medium">
                    Owner Name *
                  </label>
                  <input
                    type="text"
                    name="owner_name"
                    value={formData.owner_name}
                    onChange={handleInputChange}
                    placeholder="Enter owner name"
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-black text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all placeholder:text-gray-400"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-700 text-sm font-medium">
                    Owner Email *
                  </label>
                  <input
                    type="email"
                    name="owner_email"
                    value={formData.owner_email}
                    onChange={handleInputChange}
                    placeholder="owner@email.com"
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-black text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all placeholder:text-gray-400"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-700 text-sm font-medium">
                    Company Email *
                  </label>
                  <input
                    type="email"
                    name="company_email"
                    value={formData.company_email}
                    onChange={handleInputChange}
                    placeholder="company@email.com"
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-black text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all placeholder:text-gray-400"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-700 text-sm font-medium">
                    Phone Number *
                  </label>
                  <PhoneInput
                    international
                    defaultCountry="IN"
                    placeholder="Enter phone number"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3.5 text-black text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-700 text-sm font-medium">
                    Plan *
                  </label>
                  <select
                    name="plan"
                    value={formData.plan}
                    onChange={handleInputChange}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-black text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all appearance-none cursor-pointer"
                    required
                  >
                    <option value="FREE">FREE</option>
                    <option value="PRO">PRO</option>
                    <option value="PREMIUM">PREMIUM</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-gray-700 text-sm font-medium">
                    Company Logo{" "}
                    <span className="text-gray-400 text-xs ml-1">
                      (Optional)
                    </span>
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer transition-all"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        PNG, JPG, GIF, WEBP, SVG (Max 2MB)
                      </p>
                    </div>
                    {logoPreview && (
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-14 h-14 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="text-red-500 hover:text-red-700 text-sm font-medium transition-all"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-700 text-sm font-medium">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Minimum 8 characters"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-black text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all placeholder:text-gray-400 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-all"
                    >
                      {showPassword ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-700 text-sm font-medium">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirm_password"
                      value={formData.confirm_password}
                      onChange={handleInputChange}
                      placeholder="Confirm your password"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-black text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all placeholder:text-gray-400 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-all"
                    >
                      {showConfirmPassword ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-black text-white font-semibold py-3 rounded-lg hover:bg-gray-800 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="inline-block animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>{" "}
                    Sending...
                  </>
                ) : (
                  "Send OTP"
                )}
              </button>
            </form>
          )}

          {/* Step 2: Verify OTP - THREE OTPs in SINGLE ROW */}
          {step === 2 && (
            <div>
              {/* Header */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-black">
                  Verify Your Email and Phone
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  We've sent OTPs to your registered email and phone
                </p>
              </div>

              <form onSubmit={handleVerifyOtp}>
                {/* THREE OTP FIELDS IN ONE ROW */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-gray-700 text-xs font-medium block mb-1">
                      Owner Email OTP ({formData.owner_email})
                    </label>
                    <input
                      type="text"
                      name="owner_otp"
                      value={otpData.owner_otp}
                      onChange={handleOtpChange}
                      placeholder="6-digit"
                      maxLength="6"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-black text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all placeholder:text-gray-400 text-center tracking-widest text-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-gray-700 text-xs font-medium block mb-1">
                      Company Email OTP ({formData.company_email})
                    </label>
                    <input
                      type="text"
                      name="company_otp"
                      value={otpData.company_otp}
                      onChange={handleOtpChange}
                      placeholder="6-digit"
                      maxLength="6"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-black text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all placeholder:text-gray-400 text-center tracking-widest text-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-gray-700 text-xs font-medium block mb-1">
                      Phone OTP ({formData.owner_phone})
                    </label>
                    <input
                      type="text"
                      name="phone_otp"
                      value={otpData.phone_otp}
                      onChange={handleOtpChange}
                      placeholder="6-digit"
                      maxLength="6"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-black text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all placeholder:text-gray-400 text-center tracking-widest text-lg"
                      required
                    />
                  </div>
                </div>

                {/* Resend and Edit options */}
                <div className="flex items-center justify-between text-sm mb-6">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={loading}
                    className="text-gray-500 hover:text-black transition-all disabled:opacity-50"
                  >
                    Didn't receive the code?{" "}
                    <span className="text-black font-medium hover:underline cursor-pointer">
                      Resend
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-gray-500 hover:text-black transition-all"
                  >
                    Wrong details?{" "}
                    <span className="text-black font-medium hover:underline cursor-pointer">
                      Edit
                    </span>
                  </button>
                </div>

                <div className="flex gap-4 ">
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={loading}
                    className="w-full bg-transparent border border-gray-300 text-gray-600 font-medium py-3 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                  >
                    ← Back to details
                  </button>
                  <button
                    type="submit"
                    disabled={
                      loading ||
                      !otpData.owner_otp ||
                      !otpData.company_otp ||
                      !otpData.phone_otp
                    }
                    className="w-full bg-black text-white font-semibold py-3 rounded-lg hover:bg-gray-800 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="inline-block animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>{" "}
                        Verifying...
                      </>
                    ) : (
                      "Verify & Create Organization"
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterOrganization;
