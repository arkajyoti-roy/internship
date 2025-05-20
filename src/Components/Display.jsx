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

import {
  getDownloadURL,
  ref,
  uploadBytes,
  deleteObject,
} from "firebase/storage";
import { v4 } from "uuid";
import { toast } from "react-toastify";
import ImgLoader from "./ImgLoader";
import NoImg from "./NoImg";
// import NewAdd from "./NewAdd";

const Display = () => {
  const [userDetails, setUserDetails] = useState(null);
  const [img, setImg] = useState(null);
  const [imgUrl, setImgUrl] = useState([]);
  const [imageName, setImageName] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const navigate = useNavigate();
  const [isDivVisible, setIsDivVisible] = useState(false);
  const [showFirstDiv, setShowFirstDiv] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // grid or list

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
          fetchImages(user.uid);
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
    setImageName("");
    setPreviewUrl(null);
    setImg(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImg(file);

      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      const fileName = file.name.split(".").slice(0, -1).join(".");
      setImageName(fileName);
    }
  };

  const handleUpload = async () => {
    if (!imageName.trim() || !img) {
      toast.error("Both image name and image file are required!", {
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
    ];

    if (!allowedFormats.includes(img.type)) {
      toast.error(
        "Invalid file format. Please upload an image in .jpg, .jpeg, .png, .gif, .webp, or .svg format.",
        {
          position: "top-right",
        }
      );
      return;
    }

    handleHideClick();
    toast.info("Uploading...", {
      position: "top-right",
    });

    try {
      const imgRef = ref(imageDb, `iimps/${auth.currentUser.uid}/${v4()}`);
      await uploadBytes(imgRef, img);
      const url = await getDownloadURL(imgRef);
      await addDoc(collection(db, "Images"), {
        uid: auth.currentUser.uid,
        imageName: imageName.trim(),
        imageUrl: url,
        timestamp: new Date().getTime(),
      });

      fetchImages(auth.currentUser.uid);
      toast.success("Uploaded Successfully!", {
        position: "top-right",
      });

      setImageName("");
      setImg(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error("Error uploading:", error);
      toast.error("Upload failed: " + error.message, {
        position: "top-right",
      });
    }
  };

  const fetchImages = async (uid) => {
    setLoading(true);
    try {
      const q = query(collection(db, "Images"), where("uid", "==", uid));
      const querySnapshot = await getDocs(q);
      const urls = [];
      querySnapshot.forEach((doc) => {
        urls.push({
          id: doc.id,
          url: doc.data().imageUrl,
          name: doc.data().imageName,
          timestamp: doc.data().timestamp || 0,
        });
      });

      urls.sort((a, b) => b.timestamp - a.timestamp);
      setImgUrl(urls);
    } catch (error) {
      console.error("Error fetching images:", error);
      toast.error("Failed to load images", {
        position: "top-right",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (image) => {
    if (!image.url) {
      console.error("Invalid URL:", image.url);
      toast.error("Invalid URL. Please try again.", {
        position: "top-right",
      });
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${image.name}"?`)) {
      return;
    }

    try {
      try {
        const imgRef = ref(imageDb, image.url);
        await deleteObject(imgRef);
      } catch (storageError) {
        console.error("Error deleting from storage:", storageError);
      }

      await deleteDoc(doc(db, "Images", image.id));
      setImgUrl(imgUrl.filter((item) => item.id !== image.id));

      toast.success("File deleted successfully", {
        position: "top-right",
      });
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

  // Filter images based on search
  const filteredImages = imgUrl.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {userDetails ? (
        <>
          <header className="bg-white shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-10 w-10 text-white p-2 bg-indigo-600 rounded-lg"
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
                  <div className="ml-3 text-xl font-bold text-gray-900">
                    Document Manager
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="hidden md:block">
                    <span className="text-gray-700 font-medium">
                      Welcome,{" "}
                      <span className="font-bold text-indigo-600">
                        {userDetails.name}
                      </span>
                    </span>
                  </div>

                  <button
                    onClick={handleShowClick}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
                    Upload
                  </button>

                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0">
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-400"
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">View:</span>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-md ${
                    viewMode === "grid"
                      ? "bg-indigo-100 text-indigo-600"
                      : "bg-white text-gray-500"
                  }`}
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
                  className={`p-2 rounded-md ${
                    viewMode === "list"
                      ? "bg-indigo-100 text-indigo-600"
                      : "bg-white text-gray-500"
                  }`}
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

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <ImgLoader />
              </div>
            ) : (
              <>
                {filteredImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg shadow p-8">
                    <NoImg />
                    <p className="text-gray-500 mt-4">No images found</p>
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
                    {filteredImages.map((item, index) =>
                      viewMode === "grid" ? (
                        // Grid view
                        <div
                          key={index}
                          className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow duration-300"
                        >
                          <div className="h-48 overflow-hidden bg-gray-100">
                            <img
                              src={item.url}
                              alt={item.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="p-4">
                            <h3
                              className="text-lg font-medium text-gray-900 truncate"
                              title={item.name}
                            >
                              {item.name}
                            </h3>
                            <div className="mt-4 flex justify-between">
                              <button
                                onClick={() =>
                                  handleDownload(item.url, item.name)
                                }
                                className="inline-flex items-center px-3 py-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 mr-1"
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
                                className="inline-flex items-center px-3 py-1 text-sm font-medium text-red-600 hover:text-red-500"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 mr-1"
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
                          className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row sm:items-center hover:shadow-md transition-shadow duration-300"
                        >
                          <div className="w-full sm:w-20 h-20 mb-4 sm:mb-0 sm:mr-4 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                            <img
                              src={item.url}
                              alt={item.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="flex-grow">
                            <h3
                              className="text-lg font-medium text-gray-900"
                              title={item.name}
                            >
                              {item.name}
                            </h3>
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

          <footer className="bg-white mt-10 border-t border-gray-200">
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
              <p className="text-center text-sm text-gray-500">
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
                  <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                <span
                  className="hidden sm:inline-block sm:align-middle sm:h-screen"
                  aria-hidden="true"
                >
                  &#8203;
                </span>

                <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                  <div className="absolute top-0 right-0 pt-4 pr-4">
                    <button
                      onClick={handleHideClick}
                      className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
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
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-indigo-600"
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
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Upload Image
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          File should be in .jpg, .jpeg, .png, .gif, .webp, or
                          .svg format.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5">
                    {/* File preview */}
                    {previewUrl && (
                      <div className="mb-4 flex justify-center">
                        <div className="w-full h-40 bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>
                    )}

                    {/* File upload */}
                    <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
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
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                          >
                            <span>Upload a file</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              className="sr-only"
                              onChange={handleFileChange}
                              accept=".jpg,.jpeg,.png,.gif,.webp,.svg"
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, GIF, WEBP, SVG up to 10MB
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-center">
                      <button
                        onClick={handleUpload}
                        className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Upload
                      </button>
                      <button
                        onClick={handleHideClick}
                        className="ml-2 inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
        <div className="flex items-center justify-center min-h-screen">
          <Loader />
        </div>
      )}
    </div>
  );
};
export default Display;
