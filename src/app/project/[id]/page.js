"use client";
import { useEffect, useState, useContext, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import axiosInstance from "@/app/config/axios";
import {
  initializeSocket,
  receiveMessage,
  sendMessage,
} from "@/app/config/socket";
import { UserContext } from "@/app/context/user.context";
import Markdown from "markdown-to-jsx";

const ProjectPage = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const messageBox = useRef(null);
  const { user } = useContext(UserContext);
  const socketRef = useRef(null);
  const [currentFile, setCurrentFile] = useState(null);
  const [fileTree, setFileTree] = useState({});
  const [openFiles, setOpenFiles] = useState([]);

  // Fetch project and initialize socket
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const [projectRes, usersRes] = await Promise.all([
          axiosInstance.get(`/projects/get-project/${id}`),
          axiosInstance.get("/users/all"),
        ]);

        setProject(projectRes.data.project);
        setUsers(usersRes.data.users);

        // Initialize socket only once
        if (!socketRef.current) {
          socketRef.current = initializeSocket(projectRes.data.project._id);

          const cleanup = receiveMessage("project-message", (data) => {
            try {
              let messageContent = data.message;

              // Handle AI responses differently
              if (data.sender?._id === "ai") {
                // If it's a stringified JSON, parse it
                if (typeof messageContent === "string") {
                  try {
                    messageContent = JSON.parse(messageContent);
                  } catch (e) {
                    // Not JSON, keep as string
                  }
                }

                // If it's an object with files, update the file tree
                if (messageContent?.files) {
                  const newFileTree = {};
                  Object.entries(messageContent.files).forEach(
                    ([fileName, fileData]) => {
                      newFileTree[fileName] = {
                        content: fileData.file.contents,
                      };
                    }
                  );
                  setFileTree((prev) => ({ ...prev, ...newFileTree }));

                  // Set the first file as current and open it
                  const firstFile = Object.keys(newFileTree)[0];
                  if (firstFile) {
                    setCurrentFile(firstFile);
                    setOpenFiles((prev) =>
                      Array.from(new Set([...prev, firstFile]))
                    );
                  }
                }
              }

              // Handle regular messages
              if (typeof messageContent === "string") {
                if (messageContent.startsWith("```json")) {
                  messageContent = messageContent
                    .replace(/^```json|```$/g, "")
                    .trim();
                }

                if (
                  messageContent.trim().startsWith("{") ||
                  messageContent.trim().startsWith("[")
                ) {
                  try {
                    messageContent = JSON.parse(messageContent);
                  } catch (e) {
                    console.log("Message is not valid JSON, keeping as string");
                  }
                }
              }

              // Handle file tree updates
              if (messageContent?.fileTree) {
                setFileTree((prev) => ({
                  ...prev,
                  ...messageContent.fileTree,
                }));
              }

              // Update messages state
              setMessages((prev) => {
                const exists = prev.some(
                  (msg) =>
                    msg.timestamp === data.timestamp &&
                    msg.sender?._id === data.sender?._id
                );

                // Format AI response for display
                let displayMessage;
                if (data.sender?._id === "ai") {
                  if (messageContent?.text) {
                    displayMessage = messageContent.text;
                    if (messageContent?.files) {
                      displayMessage +=
                        "\n\nI've created the following files for you:\n" +
                        Object.keys(messageContent.files).join("\n");
                    }
                    if (messageContent?.instructions) {
                      displayMessage += "\n\n" + messageContent.instructions;
                    }
                  } else {
                    displayMessage =
                      typeof messageContent === "object"
                        ? JSON.stringify(messageContent, null, 2)
                        : messageContent;
                  }
                } else {
                  displayMessage = messageContent?.fileTree
                    ? "File structure updated"
                    : typeof messageContent === "object"
                    ? JSON.stringify(messageContent, null, 2)
                    : messageContent;
                }

                return exists
                  ? prev
                  : [
                      ...prev,
                      {
                        ...data,
                        message: displayMessage,
                      },
                    ];
              });
            } catch (err) {
              console.error("Error processing socket message:", err);
              if (!data.fileTree) {
                setMessages((prev) => [...prev, data]);
              }
            }
          });

          return () => cleanup();
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message || "Failed to load project");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      if (socketRef.current?.cleanup) {
        socketRef.current.cleanup();
        socketRef.current = null;
      }
    };
  }, [id]);

  // Auto-scroll messages
  useEffect(() => {
    if (messageBox.current) {
      messageBox.current.scrollTo({
        top: messageBox.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Handle file changes and sync with collaborators
  const handleFileChange = useCallback(
    (fileName, content) => {
      setFileTree((prev) => {
        const updated = {
          ...prev,
          [fileName]: { content },
        };

        if (socketRef.current && project?._id) {
          sendMessage("project-message", {
            message: JSON.stringify({ fileTree: updated }),
            sender: {
              _id: user._id,
              email: user.email,
            },
            projectId: project._id,
            timestamp: new Date().toISOString(),
          });
        }

        return updated;
      });
    },
    [project?._id, user]
  );

  // Add collaborator
  const handleAddCollaborator = async () => {
    if (!selectedUserId || !project?._id) return;

    try {
      await axiosInstance.put("/projects/add-user", {
        projectId: project._id,
        userId: selectedUserId, // Changed from users to userId
      });

      const newUser = users.find((u) => u._id === selectedUserId);
      setProject((prev) => ({
        ...prev,
        users: [...(prev?.users || []), newUser],
      }));

      setIsUserModalOpen(false);
      setSelectedUserId(null);
    } catch (err) {
      console.error("Error adding collaborator:", err);
      setError(err.message || "Failed to add collaborator");
    }
  };

  // Send message
  const send = useCallback(() => {
    if ((!message.trim() && !Object.keys(fileTree).length) || !project?._id)
      return;

    const messageContent = Object.keys(fileTree).length
      ? { fileTree }
      : message;

    const newMessage = {
      message:
        typeof messageContent === "object"
          ? JSON.stringify(messageContent, null, 2)
          : messageContent,
      sender: {
        _id: user._id,
        email: user.email,
      },
      projectId: project._id,
      timestamp: new Date().toISOString(),
    };

    sendMessage("project-message", newMessage);
    setMessage("");
  }, [message, project?._id, user, fileTree]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );

  return (
    <main className="h-screen flex">
      {/* Left Panel - Chat */}
      <section className="left relative flex flex-col h-full w-1/2 sm:w-1/3 bg-blue-400">
        <header className="flex justify-between items-center p-2 px-4 bg-blue-200">
          <button
            className="flex items-center gap-2 p-2 hover:bg-blue-300 rounded transition"
            onClick={() => setIsUserModalOpen(true)}
          >
            <i className="ri-add-fill"></i>
            <p className="text-sm font-medium">Add collaborator</p>
          </button>
          <button
            className="p-2 hover:bg-blue-300 rounded transition"
            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
          >
            <i className="ri-group-fill text-lg"></i>
          </button>
        </header>

        <div className="conversation-area flex flex-col flex-grow relative">
          <div
            ref={messageBox}
            className="message-box flex-grow overflow-y-auto p-2 space-y-1"
            style={{ maxHeight: "calc(100vh - 60px)" }}
          >
            {messages.map((msg, index) => (
              <div
                key={`${msg.timestamp}-${msg.sender?._id}-${index}`}
                className={`flex ${
                  msg.sender?._id === user?._id
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`${
                    msg.sender?._id === "ai" ? "w-full" : "max-w-56"
                  } flex flex-col ${
                    msg.sender?._id === user?._id ? "items-end" : "items-start"
                  }`}
                >
                  {msg.sender?._id !== user?._id && (
                    <div className="flex items-center gap-1 mb-1">
                      <span className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs">
                        {msg.sender?._id === "ai"
                          ? "AI"
                          : msg.sender?.name?.charAt(0)?.toUpperCase() ||
                            msg.sender?.email?.charAt(0)?.toUpperCase() ||
                            "U"}
                      </span>
                      <small className="opacity-65 text-xs">
                        {msg.sender?._id === "ai"
                          ? "AI Assistant"
                          : msg.sender?.name ||
                            msg.sender?.email?.split("@")[0] ||
                            "Unknown"}
                      </small>
                    </div>
                  )}
                  <div
                    className={`text-sm w-full ${
                      msg.sender?._id === user?._id
                        ? "bg-green-200"
                        : msg.sender?._id === "ai"
                        ? "bg-purple-100"
                        : "bg-white"
                    } text-black rounded px-3 py-2 shadow relative`}
                  >
                    {msg.sender?._id === "ai" ? (
                      <Markdown
                        options={{
                          overrides: {
                            code: {
                              component: ({ children, className }) => (
                                <div className="relative group">
                                  <button
                                    onClick={() =>
                                      navigator.clipboard.writeText(children)
                                    }
                                    className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-xs bg-gray-700 text-white rounded"
                                    title="Copy code"
                                  >
                                    <i className="ri-file-copy-line"></i>
                                  </button>
                                  <pre
                                    className={`${className} bg-gray-800 text-gray-100 p-2 rounded overflow-x-auto text-xs`}
                                  >
                                    <code>{children}</code>
                                  </pre>
                                </div>
                              ),
                            },
                            pre: {
                              component: ({ children }) => (
                                <div className="relative group my-2">
                                  <button
                                    onClick={() =>
                                      navigator.clipboard.writeText(
                                        children.props.children
                                      )
                                    }
                                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-xs bg-gray-700 text-white rounded"
                                    title="Copy code"
                                  >
                                    <i className="ri-file-copy-line"></i>
                                  </button>
                                  <pre className="bg-gray-800 text-gray-100 p-3 rounded overflow-x-auto">
                                    {children}
                                  </pre>
                                </div>
                              ),
                            },
                          },
                        }}
                      >
                        {msg.message}
                      </Markdown>
                    ) : (
                      msg.message
                    )}
                  </div>
                  <small className="opacity-45 text-xxs mt-0.5">
                    {msg.timestamp
                      ? new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "Now"}
                  </small>
                </div>
              </div>
            ))}
          </div>

          <div className="sticky bottom-0 left-0 right-0 w-full p-2 bg-blue-300">
            <div className="flex gap-2">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && send()}
                type="text"
                placeholder="Enter message"
                className="flex-grow p-2 px-4 border-none outline-none bg-amber-50 rounded"
              />
              <button
                className="p-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                onClick={send}
              >
                <i className="ri-send-plane-fill"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Side Panel - Collaborators */}
        <div
          className={`sidePanel flex flex-col gap-2 w-full h-full bg-gray-300 absolute top-0 transform transition-transform duration-300 ${
            isSidePanelOpen
              ? "translate-x-0 left-0"
              : "-translate-x-full left-0"
          }`}
        >
          <header className="flex justify-end p-2 px-3 bg-white shadow">
            <button
              onClick={() => setIsSidePanelOpen(false)}
              className="hover:text-red-500 transition"
            >
              <i className="ri-close-fill text-xl"></i>
            </button>
          </header>
          <div className="users flex flex-col gap-2 p-2">
            {project?.users?.map((user) => (
              <div
                key={user._id}
                className="user flex items-center gap-3 p-2 rounded hover:bg-gray-200 cursor-pointer transition"
              >
                <div className="w-10 h-10 rounded-sm flex items-center justify-center bg-gray-600 text-white">
                  <i className="ri-user-fill text-lg"></i>
                </div>
                <span className="text-sm font-semibold text-black">
                  {user.name || user.email}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Right Panel - Code Editor */}
      <section className="right bg-amber-100 flex-grow h-full flex">
        <div className="explorer h-full max-w-64 bg-amber-600 min-w-52">
          <div className="file-tree w-full">
            {Object.keys(fileTree).map((file) => (
              <button
                key={file}
                className={`tree-element py-2 flex items-center gap-2 w-full hover:bg-slate-300 cursor-pointer ${
                  currentFile === file ? "bg-slate-400" : "bg-slate-200"
                }`}
                onClick={() => {
                  setCurrentFile(file);
                  setOpenFiles((prev) => Array.from(new Set([...prev, file])));
                }}
              >
                <p className="font-semibold text-lg">{file}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="code-editor flex-grow">
          {currentFile ? (
            <div className="editor-container flex flex-col h-full w-full">
              <header className="editor-header flex justify-between items-center p-2 bg-gray-200">
                {openFiles.map((file) => (
                  <div
                    key={file}
                    className={`open-file cursor-pointer p-2 px-4 flex items-center gap-2 ${
                      currentFile === file
                        ? "bg-blue-300 font-bold"
                        : "bg-slate-50"
                    }`}
                  >
                    <span
                      className="text-lg flex-grow text-left"
                      onClick={() => setCurrentFile(file)}
                    >
                      {file}
                    </span>
                    <span
                      className="text-red-500 hover:text-red-700 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenFiles((prev) => prev.filter((f) => f !== file));
                        if (currentFile === file) {
                          setCurrentFile(
                            openFiles.find((f) => f !== file) || null
                          );
                        }
                      }}
                    >
                      <i className="ri-close-line"></i>
                    </span>
                  </div>
                ))}
              </header>

              <textarea
                className="editor flex-grow w-full p-4 bg-white border-none outline-none resize-none font-mono text-sm"
                value={fileTree[currentFile]?.content || ""}
                onChange={(e) => handleFileChange(currentFile, e.target.value)}
                spellCheck="false"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Select a file to edit</p>
            </div>
          )}
        </div>
      </section>

      {/* User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-[90%] max-w-sm max-h-[80vh] rounded-lg p-5 shadow-lg overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Select User</h2>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="hover:text-red-500 transition"
              >
                <i className="ri-close-fill text-xl"></i>
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {users
                .filter((u) => !project?.users?.some((pu) => pu._id === u._id))
                .map((user) => (
                  <div
                    key={user._id}
                    onClick={() => setSelectedUserId(user._id)}
                    className={`flex items-center gap-3 p-3 rounded cursor-pointer transition ${
                      selectedUserId === user._id
                        ? "bg-blue-500 text-white"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <i className="ri-user-fill text-black"></i>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">
                        {user.name || "Unnamed User"}
                      </p>
                      <p className="text-xs opacity-70">{user.email}</p>
                    </div>
                  </div>
                ))}
              <button
                disabled={!selectedUserId}
                onClick={handleAddCollaborator}
                className={`mt-2 p-2 rounded text-white font-medium transition ${
                  selectedUserId
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                Add Collaborator
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default ProjectPage;
