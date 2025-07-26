import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import "./Dis.css";
import { useNavigate } from "react-router-dom";
import Loader from "./Loader";
import { imageDb } from "./firebase";
import "./Toggle.css";
import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
  deleteObject,
} from "firebase/storage";
import { v4 } from "uuid";
import { toast } from "react-toastify";
import ImgLoader from "./ImgLoader";

const Display = () => {
  const [userDetails, setUserDetails] = useState(null);
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState([]);
  const [fileName, setFileName] = useState("");
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage first
    const savedMode = localStorage.getItem("darkMode");
    if (savedMode !== null) {
      return JSON.parse(savedMode);
    }
    // If not in localStorage, check system preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  const navigate = useNavigate();
  const [isDivVisible, setIsDivVisible] = useState(false);
  const [showFirstDiv, setShowFirstDiv] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // grid or list

  // Storage management states
  const [totalStorageUsed, setTotalStorageUsed] = useState(0);
  const STORAGE_LIMIT = 50 * 1024 * 1024; // 50MB in bytes

  // Preview modal states
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    item: null,
  });

  useEffect(() => {
    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      // Only update if user hasn't manually set a preference
      const savedMode = localStorage.getItem("darkMode");
      if (savedMode === null) {
        setDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Update localStorage and document class when dark mode changes
  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
    // Add or remove dark mode class from document
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFirstDiv(false);
    }, 2900);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUserDetails(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        const docRef = doc(db, "Users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserDetails(docSnap.data());
          fetchFiles(user.uid);
        } else {
          console.log("User is logged out");
        }
      }
    });
  };

  const handleShowClick = () => {
    setIsDivVisible(true);
  };

  const handleHideClick = () => {
    setIsDivVisible(false);
    setFileName("");
    setPreviewUrl(null);
    setFile(null);
  };

  const getFileType = (file) => {
    const type = file.type;
    if (type.startsWith("image/")) return "image";
    if (type === "application/pdf") return "pdf";
    return "unknown";
  };

  // Helper function to format bytes
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Helper function to calculate total storage used
  const calculateTotalStorage = (files) => {
    return files.reduce((total, file) => total + (file.size || 0), 0);
  };

  // Preview functions
  const openPreview = (item) => {
    setPreviewModal({
      isOpen: true,
      item: item,
    });
  };

  const closePreview = () => {
    setPreviewModal({
      isOpen: false,
      item: null,
    });
  };

  // Touch handlers for double tap
  const [lastTap, setLastTap] = useState(0);
  const DOUBLE_TAP_DELAY = 300; // 300ms between taps

  const handleTouchStart = (item) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;

    if (tapLength < DOUBLE_TAP_DELAY && tapLength > 0) {
      openPreview(item);
    }
    setLastTap(currentTime);
  };

  const handleTouchEnd = () => {
    // No longer needed for double tap, but keeping for interface consistency
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Check file size first
      if (selectedFile.size > 4 * 1024 * 1024) {
        toast.error("File size exceeds 4MB limit", {
          position: "top-right",
        });
        return;
      }

      // Check if adding this file would exceed storage limit
      if (totalStorageUsed + selectedFile.size > STORAGE_LIMIT) {
        const remainingSpace = STORAGE_LIMIT - totalStorageUsed;
        toast.error(
          `Storage limit exceeded! You have ${formatBytes(
            remainingSpace
          )} remaining space out of ${formatBytes(STORAGE_LIMIT)}`,
          {
            position: "top-right",
            autoClose: 5000,
          }
        );
        return;
      }

      setFile(selectedFile);

      const fileType = getFileType(selectedFile);

      if (fileType === "image") {
        const objectUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(objectUrl);
      } else if (fileType === "pdf") {
        setPreviewUrl(null); // No preview for PDF initially
      }

      // Set filename without extension
      const name = selectedFile.name.split(".").slice(0, -1).join(".");
      setFileName(name);
    }
  };

  const handleUpload = async () => {
    if (!fileName.trim() || !file) {
      toast.error("Both file name and file are required!", {
        position: "top-right",
      });
      return;
    }

    const allowedFormats = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "application/pdf",
    ];

    if (!allowedFormats.includes(file.type)) {
      toast.error("Invalid file format. Please upload an image or PDF file.", {
        position: "top-right",
      });
      return;
    }

    // Final storage check before upload
    if (totalStorageUsed + file.size > STORAGE_LIMIT) {
      const remainingSpace = STORAGE_LIMIT - totalStorageUsed;
      toast.error(
        `Storage limit exceeded! You have ${formatBytes(
          remainingSpace
        )} remaining space out of ${formatBytes(STORAGE_LIMIT)}`,
        {
          position: "top-right",
          autoClose: 5000,
        }
      );
      return;
    }

    handleHideClick();
    const toastId = toast.loading("Uploading: 0%", {
      position: "bottom-right",
      style: {
        background: "#4F46E5",
        color: "white",
        fontWeight: "500",
        padding: "16px",
        borderRadius: "8px",
      },
    });

    try {
      const fileRef = ref(imageDb, `files/${auth.currentUser.uid}/${v4()}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          toast.update(toastId, {
            render: `Uploading: ${progress}%`,
            style: {
              background: "#4F46E5",
              color: "white",
              fontWeight: "500",
              padding: "16px",
              borderRadius: "8px",
            },
          });
        },
        (error) => {
          console.error("Error uploading:", error);
          toast.update(toastId, {
            render: "Upload failed: " + error.message,
            type: "error",
            isLoading: false,
            style: {
              background: "#DC2626",
              color: "white",
              fontWeight: "500",
              padding: "16px",
              borderRadius: "8px",
            },
          });
        },
        async () => {
          const url = await getDownloadURL(fileRef);
          await addDoc(collection(db, "Files"), {
            uid: auth.currentUser.uid,
            fileName: fileName.trim(),
            fileUrl: url,
            fileType: getFileType(file),
            fileSize: file.size, // Store file size in bytes
            timestamp: new Date().getTime(),
          });

          fetchFiles(auth.currentUser.uid);
          toast.update(toastId, {
            render: "Uploaded Successfully!",
            type: "success",
            isLoading: false,
            autoClose: 3000,
            style: {
              background: "#059669",
              color: "white",
              fontWeight: "500",
              padding: "16px",
              borderRadius: "8px",
            },
          });

          setFileName("");
          setFile(null);
          setPreviewUrl(null);
        }
      );
    } catch (error) {
      console.error("Error uploading:", error);
      toast.update(toastId, {
        render: "Upload failed: " + error.message,
        type: "error",
        isLoading: false,
      });
    }
  };

  const fetchFiles = async (uid) => {
    setLoading(true);
    try {
      const q = query(collection(db, "Files"), where("uid", "==", uid));
      const querySnapshot = await getDocs(q);
      const urls = [];
      querySnapshot.forEach((doc) => {
        urls.push({
          id: doc.id,
          url: doc.data().fileUrl,
          name: doc.data().fileName,
          type: doc.data().fileType || "image", // Default to image for backward compatibility
          size: doc.data().fileSize || 0, // Default to 0 for backward compatibility
          timestamp: doc.data().timestamp || 0,
        });
      });

      urls.sort((a, b) => b.timestamp - a.timestamp);
      setFileUrl(urls);

      // Calculate and update total storage used
      const totalUsed = calculateTotalStorage(urls);
      setTotalStorageUsed(totalUsed);
    } catch (error) {
      console.error("Error fetching files:", error);
      toast.error("Failed to load files", {
        position: "top-right",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (file) => {
    if (!file.url) {
      console.error("Invalid URL:", file.url);
      toast.error("Invalid URL. Please try again.", {
        position: "top-right",
      });
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
      return;
    }

    try {
      try {
        const fileRef = ref(imageDb, file.url);
        await deleteObject(fileRef);
      } catch (storageError) {
        console.error("Error deleting from storage:", storageError);
      }

      await deleteDoc(doc(db, "Files", file.id));
      const updatedFiles = fileUrl.filter((item) => item.id !== file.id);
      setFileUrl(updatedFiles);

      // Update total storage used after deletion
      const newTotalUsed = calculateTotalStorage(updatedFiles);
      setTotalStorageUsed(newTotalUsed);

      toast.success(
        `File deleted successfully. ${formatBytes(
          file.size
        )} storage space released.`,
        {
          position: "top-right",
        }
      );
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Error deleting file: " + error.message, {
        position: "top-right",
      });
    }
  };

  const handleDownload = async (url, name) => {
    toast.info("Download is starting...", {
      position: "top-right",
    });

    try {
      const response = await fetch(
        `https://doc-man.vercel.app/download?url=${encodeURIComponent(
          url
        )}&name=${encodeURIComponent(name)}`
      );
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = name || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();

      toast.success("Download Complete!", {
        position: "top-right",
      });
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Error downloading file: " + error.message, {
        position: "top-right",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast.success("Logged out successfully!", {
        position: "top-right",
      });
      localStorage.removeItem("user");
      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (error) {
      console.error(error.message);
      toast.error("Logout failed: " + error.message, {
        position: "top-right",
      });
    }
  };

  // Filter files based on search
  const filteredFiles = fileUrl.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [pdfPreviews, setPdfPreviews] = useState({});

  // PDF Preview Component
  const PDFPreview = ({ url, fileName }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    return (
      <div className="w-full h-full relative bg-gray-100 dark:bg-gray-700">
        {!error ? (
          <>
            <iframe
              src={`https://docs.google.com/gview?url=${encodeURIComponent(
                url
              )}&embedded=true`}
              className="w-full h-full border-0"
              title={fileName}
              onLoad={() => setLoading(false)}
              onError={() => {
                setError(true);
                setLoading(false);
              }}
              style={{ pointerEvents: "none" }}
            />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            )}
            <div className="absolute inset-0 bg-transparent cursor-pointer" />
          </>
        ) : (
          // Fallback to icon if preview fails
          <div className="w-full h-full flex items-center justify-center bg-red-50 dark:bg-red-900/20">
            <div className="text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-red-500 mx-auto mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                PDF Document
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFilePreview = (item) => {
    if (item.type === "pdf") {
      return <PDFPreview url={item.url} fileName={item.name} />;
    } else {
      return (
        <img
          src={item.url}
          alt={item.name}
          className="w-full h-full object-contain"
        />
      );
    }
  };

  // Preview Modal Component
  const PreviewModal = ({ isOpen, item, onClose }) => {
    if (!isOpen || !item) return null;

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div
            className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
            onClick={onClose}
          ></div>

          <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
            &#8203;
          </span>

          <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  {/* {item.name} */}
                  {window.innerWidth <= 768 && item.name.length > 55
                    ? `${item.name.slice(0, 55)}...`
                    : item.name}
                </h3>
                <button
                  onClick={onClose}
                  className="bg-gray-100 dark:bg-gray-700 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 focus:outline-none p-2"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="w-full h-96 sm:h-[500px] bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                {renderFilePreview(item)}
              </div>

              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="capitalize">{item.type} file</span> •{" "}
                  {formatBytes(item.size)}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleDownload(item.url, item.name)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Storage usage percentage for progress bar
  const storagePercentage = (totalStorageUsed / STORAGE_LIMIT) * 100;

  return (
    <div
      className={`min-h-screen ${darkMode ? "dark bg-gray-900" : "bg-gray-50"}`}
    >
      {userDetails ? (
        <>
          <header className="bg-white dark:bg-gray-800 shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex justify-between items-center h-10">
                <div className="flex items-center flex-shrink-0">
                  <div className="flex-shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 text-white p-1.5 bg-indigo-600 rounded-lg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                      />
                    </svg>
                  </div>
                  <div className="hidden sm:block ml-2 text-lg font-bold text-gray-900 dark:text-white">
                    Document Manager
                  </div>
                  <div className="ml-2 sm:hidden flex items-center">
                    <span className="text-base font-medium text-gray-900 dark:text-gray-100">
                      Hi,{" "}
                    </span>

                    <span className="text-base font-bold text-gray-900 dark:text-white ml-1">
                      {userDetails.name.length > 10
                        ? `${userDetails.name.slice(0, 10)}...`
                        : userDetails.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-4">
                  <div className="hidden sm:block">
                    <span className="text-gray-700 dark:text-gray-300 text-sm">
                      Welcome back,{" "}
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {userDetails.name}
                      </span>
                    </span>
                  </div>

                  <label className="theme-switch hidden sm:block">
                    <input
                      type="checkbox"
                      className="theme-switch__checkbox"
                      checked={darkMode}
                      onChange={(e) => setDarkMode(e.target.checked)}
                    />
                    <div className="theme-switch__container">
                      <div className="theme-switch__clouds"></div>
                      <div className="theme-switch__stars-container">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 144 55"
                          fill="none"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M135.831 3.00688C135.055 3.85027 134.111 4.29946 133 4.35447C134.111 4.40947 135.055 4.85867 135.831 5.71123C136.607 6.55462 136.996 7.56303 136.996 8.72727C136.996 7.95722 137.172 7.25134 137.525 6.59129C137.886 5.93124 138.372 5.39954 138.98 5.00535C139.598 4.60199 140.268 4.39114 141 4.35447C139.88 4.2903 138.936 3.85027 138.16 3.00688C137.384 2.16348 136.996 1.16425 136.996 0C136.996 1.16425 136.607 2.16348 135.831 3.00688ZM31 23.3545C32.1114 23.2995 33.0551 22.8503 33.8313 22.0069C34.6075 21.1635 34.9956 20.1642 34.9956 19C34.9956 20.1642 35.3837 21.1635 36.1599 22.0069C36.9361 22.8503 37.8798 23.2903 39 23.3545C38.2679 23.3911 37.5976 23.602 36.9802 24.0053C36.3716 24.3995 35.8864 24.9312 35.5248 25.5913C35.172 26.2513 34.9956 26.9572 34.9956 27.7273C34.9956 26.563 34.6075 25.5546 33.8313 24.7112C33.0551 23.8587 32.1114 23.4095 31 23.3545ZM0 36.3545C1.11136 36.2995 2.05513 35.8503 2.83131 35.0069C3.6075 34.1635 3.99559 33.1642 3.99559 32C3.99559 33.1642 4.38368 34.1635 5.15987 35.0069C5.93605 35.8503 6.87982 36.2903 8 36.3545C7.26792 36.3911 6.59757 36.602 5.98015 37.0053C5.37155 37.3995 4.88644 37.9312 4.52481 38.5913C4.172 39.2513 3.99559 39.9572 3.99559 40.7273C3.99559 39.563 3.6075 38.5546 2.83131 37.7112C2.05513 36.8587 1.11136 36.4095 0 36.3545ZM56.8313 24.0069C56.0551 24.8503 55.1114 25.2995 54 25.3545C55.1114 25.4095 56.0551 25.8587 56.8313 26.7112C57.6075 27.5546 57.9956 28.563 57.9956 29.7273C57.9956 28.9572 58.172 28.2513 58.5248 27.5913C58.8864 26.9312 59.3716 26.3995 59.9802 26.0053C60.5976 25.602 61.2679 25.3911 62 25.3545C60.8798 25.2903 59.9361 24.8503 59.1599 24.0069C58.3837 23.1635 57.9956 22.1642 57.9956 21C57.9956 22.1642 57.6075 23.1635 56.8313 24.0069ZM81 25.3545C82.1114 25.2995 83.0551 24.8503 83.8313 24.0069C84.6075 23.1635 84.9956 22.1642 84.9956 21C84.9956 22.1642 85.3837 23.1635 86.1599 24.0069C86.9361 24.8503 87.8798 25.2903 89 25.3545C88.2679 25.3911 87.5976 25.602 86.9802 26.0053C86.3716 26.3995 85.8864 26.9312 85.5248 27.5913C85.172 28.2513 84.9956 28.9572 84.9956 29.7273C84.9956 28.563 84.6075 27.5546 83.8313 26.7112C83.0551 25.8587 82.1114 25.4095 81 25.3545Z"
                            fill="currentColor"
                          />
                        </svg>
                      </div>
                      <div className="theme-switch__circle-container">
                        <div className="theme-switch__sun-moon-container">
                          <div className="theme-switch__moon">
                            <div className="theme-switch__spot"></div>
                            <div className="theme-switch__spot"></div>
                            <div className="theme-switch__spot"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </label>

                  <button
                    onClick={handleShowClick}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    <span>Upload</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center px-2 sm:px-3 py-1.5 border border-red-200 text-sm font-medium rounded-md text-red-600 bg-red-50 hover:bg-red-600 hover:text-white hover:border-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 sm:mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Storage Usage Display */}
            <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Storage Usage
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatBytes(totalStorageUsed)} / {formatBytes(STORAGE_LIMIT)}{" "}
                  ({storagePercentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    storagePercentage >= 90
                      ? "bg-red-500"
                      : storagePercentage >= 75
                      ? "bg-yellow-500"
                      : "bg-indigo-600"
                  }`}
                  style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                ></div>
              </div>
              {storagePercentage >= 90 && (
                <p className="text-sm text-red-500 dark:text-red-400 mt-2">
                  ⚠️ Storage almost full! Consider deleting some files to free
                  up space.
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0">
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-400 dark:text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="w-full flex justify-between items-center">
                <div>
                  <label className="theme-switch md:hidden">
                    <input
                      type="checkbox"
                      className="theme-switch__checkbox"
                      checked={darkMode}
                      onChange={(e) => setDarkMode(e.target.checked)}
                    />
                    <div className="theme-switch__container">
                      <div className="theme-switch__clouds"></div>
                      <div className="theme-switch__stars-container">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 144 55"
                          fill="none"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M135.831 3.00688C135.055 3.85027 134.111 4.29946 133 4.35447C134.111 4.40947 135.055 4.85867 135.831 5.71123C136.607 6.55462 136.996 7.56303 136.996 8.72727C136.996 7.95722 137.172 7.25134 137.525 6.59129C137.886 5.93124 138.372 5.39954 138.98 5.00535C139.598 4.60199 140.268 4.39114 141 4.35447C139.88 4.2903 138.936 3.85027 138.16 3.00688C137.384 2.16348 136.996 1.16425 136.996 0C136.996 1.16425 136.607 2.16348 135.831 3.00688ZM31 23.3545C32.1114 23.2995 33.0551 22.8503 33.8313 22.0069C34.6075 21.1635 34.9956 20.1642 34.9956 19C34.9956 20.1642 35.3837 21.1635 36.1599 22.0069C36.9361 22.8503 37.8798 23.2903 39 23.3545C38.2679 23.3911 37.5976 23.602 36.9802 24.0053C36.3716 24.3995 35.8864 24.9312 35.5248 25.5913C35.172 26.2513 34.9956 26.9572 34.9956 27.7273C34.9956 26.563 34.6075 25.5546 33.8313 24.7112C33.0551 23.8587 32.1114 23.4095 31 23.3545ZM0 36.3545C1.11136 36.2995 2.05513 35.8503 2.83131 35.0069C3.6075 34.1635 3.99559 33.1642 3.99559 32C3.99559 33.1642 4.38368 34.1635 5.15987 35.0069C5.93605 35.8503 6.87982 36.2903 8 36.3545C7.26792 36.3911 6.59757 36.602 5.98015 37.0053C5.37155 37.3995 4.88644 37.9312 4.52481 38.5913C4.172 39.2513 3.99559 39.9572 3.99559 40.7273C3.99559 39.563 3.6075 38.5546 2.83131 37.7112C2.05513 36.8587 1.11136 36.4095 0 36.3545ZM56.8313 24.0069C56.0551 24.8503 55.1114 25.2995 54 25.3545C55.1114 25.4095 56.0551 25.8587 56.8313 26.7112C57.6075 27.5546 57.9956 28.563 57.9956 29.7273C57.9956 28.9572 58.172 28.2513 58.5248 27.5913C58.8864 26.9312 59.3716 26.3995 59.9802 26.0053C60.5976 25.602 61.2679 25.3911 62 25.3545C60.8798 25.2903 59.9361 24.8503 59.1599 24.0069C58.3837 23.1635 57.9956 22.1642 57.9956 21C57.9956 22.1642 57.6075 23.1635 56.8313 24.0069ZM81 25.3545C82.1114 25.2995 83.0551 24.8503 83.8313 24.0069C84.6075 23.1635 84.9956 22.1642 84.9956 21C84.9956 22.1642 85.3837 23.1635 86.1599 24.0069C86.9361 24.8503 87.8798 25.2903 89 25.3545C88.2679 25.3911 87.5976 25.602 86.9802 26.0053C86.3716 26.3995 85.8864 26.9312 85.5248 27.5913C85.172 28.2513 84.9956 28.9572 84.9956 29.7273C84.9956 28.563 84.6075 27.5546 83.8313 26.7112C83.0551 25.8587 82.1114 25.4095 81 25.3545Z"
                            fill="currentColor"
                          />
                        </svg>
                      </div>
                      <div className="theme-switch__circle-container">
                        <div className="theme-switch__sun-moon-container">
                          <div className="theme-switch__moon">
                            <div className="theme-switch__spot"></div>
                            <div className="theme-switch__spot"></div>
                            <div className="theme-switch__spot"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === "grid"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                    title="Grid View"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === "list"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                    title="List View"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <ImgLoader />
              </div>
            ) : (
              <>
                {filteredFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg shadow p-8">
                    <p className="text-gray-500 dark:text-gray-400 mt-4">
                      No files found
                    </p>
                    <button
                      onClick={handleShowClick}
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Add New
                    </button>
                  </div>
                ) : (
                  <div
                    className={`${
                      viewMode === "grid"
                        ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                        : "flex flex-col space-y-4"
                    }`}
                  >
                    {filteredFiles.map((item, index) =>
                      viewMode === "grid" ? (
                        // Grid view
                        <div
                          key={index}
                          className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow duration-300"
                          onTouchStart={() => handleTouchStart(item)}
                          onTouchEnd={handleTouchEnd}
                          onTouchCancel={handleTouchEnd}
                        >
                          <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-700 rounded-t-lg group">
                            {renderFilePreview(item)}
                            {/* Preview button overlay - only show on desktop */}
                            <button
                              onClick={() => openPreview(item)}
                              className="hidden md:flex absolute top-2 right-2 items-center justify-center w-8 h-8 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-full opacity-0 opacity-100 transition-opacity duration-200"
                              title="Preview"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </button>
                          </div>
                          <div className="p-4">
                            <h3
                              className="text-lg font-medium text-gray-900 dark:text-white truncate"
                              title={item.name}
                            >
                              {item.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                              {item.type} file • {formatBytes(item.size)}
                            </p>
                            <div className="mt-4 flex justify-between">
                              {/* Download button */}
                              <button
                                onClick={() =>
                                  handleDownload(item.url, item.name)
                                }
                                className="inline-flex items-center px-3 py-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 mr-2"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                  />
                                </svg>
                                Download
                              </button>

                              {/* Delete button */}
                              <button
                                onClick={() => handleDelete(item)}
                                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 mr-2"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // List view
                        <div
                          key={index}
                          className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col sm:flex-row sm:items-center hover:shadow-md transition-shadow duration-300"
                          onTouchStart={() => handleTouchStart(item)}
                          onTouchEnd={handleTouchEnd}
                          onTouchCancel={handleTouchEnd}
                        >
                          <div className="relative w-full sm:w-20 h-20 mb-4 sm:mb-0 sm:mr-4 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0 group">
                            {renderFilePreview(item)}
                            {/* Preview button overlay - only show on desktop */}
                            <button
                              onClick={() => openPreview(item)}
                              className="hidden md:flex absolute top-1 right-1 items-center justify-center w-6 h-6 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              title="Preview"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3 w-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </button>
                          </div>
                          <div className="flex-grow">
                            <h3
                              className="text-lg font-medium text-gray-900 dark:text-white"
                              title={item.name}
                            >
                              {item.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                              {item.type} file • {formatBytes(item.size)}
                            </p>
                          </div>
                          <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
                            <button
                              onClick={() =>
                                handleDownload(item.url, item.name)
                              }
                              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 mr-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                />
                              </svg>
                              Download
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 mr-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </>
            )}
          </main>

          {/* Preview Modal */}
          <PreviewModal
            isOpen={previewModal.isOpen}
            item={previewModal.item}
            onClose={closePreview}
          />

          <footer className="sticky-footer bg-white dark:bg-gray-800 mt-10 border-t border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                &copy; {new Date().getFullYear()} Document Manager. All rights
                reserved.
              </p>
            </div>
          </footer>

          {isDivVisible && (
            <div className="fixed inset-0 overflow-y-auto z-50">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div
                  className="fixed inset-0 transition-opacity"
                  aria-hidden="true"
                >
                  <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
                </div>

                <span
                  className="hidden sm:inline-block sm:align-middle sm:h-screen"
                  aria-hidden="true"
                >
                  &#8203;
                </span>

                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                  <div className="absolute top-0 right-0 pt-4 pr-4">
                    <button
                      onClick={handleHideClick}
                      className="bg-white dark:bg-gray-800 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
                    >
                      <span className="sr-only">Close</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900 sm:mx-0 sm:h-10 sm:w-10">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-indigo-600 dark:text-indigo-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                        Upload File
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          File should be an image (.jpg, .jpeg, .png, .gif,
                          .webp, .svg) or PDF format.
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Available space:{" "}
                          {formatBytes(STORAGE_LIMIT - totalStorageUsed)} /{" "}
                          {formatBytes(STORAGE_LIMIT)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5">
                    {/* File preview */}
                    {file && (
                      <div className="mb-4 flex justify-center">
                        <div className="w-full h-64 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                          {file.type.startsWith("image/") ? (
                            // Image preview
                            previewUrl && (
                              <img
                                src={previewUrl}
                                alt="Preview"
                                className="w-full h-full object-contain"
                              />
                            )
                          ) : file.type === "application/pdf" ? (
                            // PDF preview
                            previewUrl ? (
                              <iframe
                                src={previewUrl}
                                className="w-full h-full border-0"
                                title="PDF Preview"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="text-center">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-16 w-16 text-red-500 mx-auto mb-2"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                    />
                                  </svg>
                                  <p className="text-sm text-gray-600 dark:text-gray-300">
                                    Loading PDF preview...
                                  </p>
                                </div>
                              </div>
                            )
                          ) : null}
                        </div>
                      </div>
                    )}

                    {/* Show selected file size */}
                    {file && (
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Selected file:{" "}
                          <span className="font-medium">{file.name}</span> (
                          {formatBytes(file.size)})
                        </p>
                        {totalStorageUsed + file.size > STORAGE_LIMIT && (
                          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                            ⚠️ This file exceeds your available storage space!
                          </p>
                        )}
                      </div>
                    )}

                    {/* File upload */}
                    <label
                      htmlFor="file-upload"
                      className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                    >
                      <div className="space-y-1 text-center">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                          aria-hidden="true"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>

                        <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                          <span className="relative bg-white dark:bg-gray-800 rounded-md font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
                            Upload a file
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          PNG, JPG, GIF, WEBP, SVG, PDF up to 4MB
                        </p>

                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf"
                          onChange={handleFileChange}
                        />
                      </div>
                    </label>

                    <div className="mt-4 flex justify-center space-x-3">
                      <button
                        onClick={handleUpload}
                        className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={
                          !file ||
                          totalStorageUsed + (file?.size || 0) > STORAGE_LIMIT
                        }
                      >
                        Upload
                      </button>
                      <button
                        onClick={handleHideClick}
                        className="inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <Loader />
        </div>
      )}
    </div>
  );
};

export default Display;
