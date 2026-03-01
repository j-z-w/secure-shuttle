"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  createDisputeMessage,
  createDisputeUploadUrl,
  listDisputeMessages,
} from "@/app/lib/api";
import type { DisputeAttachment, DisputeMessage } from "@/app/lib/types";

const POLL_MS = 1_500;

type ChatBoxProps = {
  publicId?: string;
  isDisputed?: boolean;
  payerUserId?: string | null;
  payeeUserId?: string | null;
};

function formatRole(role: string): string {
  const normalized = role.toLowerCase();
  if (normalized === "admin") return "Admin";
  if (normalized === "sender") return "Sender";
  if (normalized === "recipient") return "Recipient";
  return role || "User";
}

function resolveDisplayRole(
  msg: DisputeMessage,
  payerUserId?: string | null,
  payeeUserId?: string | null
): string {
  if (payerUserId && msg.sender_user_id === payerUserId) return "Sender";
  if (payeeUserId && msg.sender_user_id === payeeUserId) return "Recipient";
  return formatRole(msg.sender_role || "participant");
}

function isImage(contentType?: string | null): boolean {
  return !!contentType && contentType.startsWith("image/");
}

function isVideo(contentType?: string | null): boolean {
  return !!contentType && contentType.startsWith("video/");
}

export default function ChatBox({
  publicId: publicIdProp,
  isDisputed = false,
  payerUserId,
  payeeUserId,
}: ChatBoxProps) {
  const params = useParams();
  const { isLoaded, isSignedIn, user } = useUser();
  const actorUserId = user?.id ?? "";
  const routeParam = params?.id;
  const routePublicId =
    typeof routeParam === "string" ? routeParam : Array.isArray(routeParam) ? routeParam[0] : "";
  const publicId = (publicIdProp || routePublicId || "").trim();

  const [isOpen, setIsOpen] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(isDisputed);
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const loadInFlightRef = useRef(false);
  const probeInFlightRef = useRef(false);

  const canUseChat = Boolean(publicId) && chatEnabled && isLoaded && isSignedIn;

  const loadMessages = useCallback(async (silent = false) => {
    if (!canUseChat) return;
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    if (!silent) {
      setLoading(true);
    }
    try {
      const data = await listDisputeMessages(publicId);
      setMessages(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dispute chat.");
    } finally {
      loadInFlightRef.current = false;
      if (!silent) {
        setLoading(false);
      }
    }
  }, [canUseChat, publicId]);

  useEffect(() => {
    if (isDisputed) {
      setChatEnabled(true);
      setIsOpen(true);
    }
  }, [isDisputed]);

  useEffect(() => {
    if (!publicId || chatEnabled || !isLoaded || !isSignedIn) return;

    let cancelled = false;
    const probe = async () => {
      if (probeInFlightRef.current) return;
      probeInFlightRef.current = true;
      try {
        const data = await listDisputeMessages(publicId);
        if (cancelled) return;
        setMessages(data);
        setChatEnabled(true);
        setIsOpen(true);
        setError(null);
      } catch {
        // Ignore probe errors until dispute chat becomes available.
      } finally {
        probeInFlightRef.current = false;
      }
    };

    void probe();
    const timer = window.setInterval(() => {
      void probe();
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [chatEnabled, isLoaded, isSignedIn, publicId]);

  useEffect(() => {
    if (!canUseChat || !isOpen) return;
    void loadMessages();
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (sending || uploading) return;
      void loadMessages(true);
    }, POLL_MS);
    const onFocus = () => {
      void loadMessages(true);
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [canUseChat, isOpen, loadMessages, sending, uploading]);

  useEffect(() => {
    if (!isOpen || !canUseChat) return;
    const listEl = messageListRef.current;
    if (!listEl) return;
    // Keep auto-scroll scoped to chat pane; avoid scrolling the main page.
    listEl.scrollTop = listEl.scrollHeight;
  }, [canUseChat, isOpen, messages]);

  const selectedFileLabel = useMemo(() => {
    if (pendingFiles.length === 0) return "";
    if (pendingFiles.length === 1) return pendingFiles[0].name;
    return `${pendingFiles.length} files selected`;
  }, [pendingFiles]);

  async function uploadPendingFiles(): Promise<DisputeAttachment[]> {
    if (pendingFiles.length === 0) return [];
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        pendingFiles.map(async (file) => {
        const uploadInfo = await createDisputeUploadUrl(publicId);
        const uploadRes = await fetch(uploadInfo.upload_url, {
          method: "POST",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }

        const body = (await uploadRes.json().catch(() => ({}))) as {
          storageId?: string;
          storage_id?: string;
        };
        const storageId = body.storageId ?? body.storage_id;
        if (!storageId) {
          throw new Error(`Upload response missing storage id for ${file.name}`);
        }

        return {
          storage_id: storageId,
          file_name: file.name,
          content_type: file.type || "application/octet-stream",
          size_bytes: file.size,
        };
      })
      );
      return uploaded;
    } finally {
      setUploading(false);
    }
  }

  async function sendMessage() {
    if (!canUseChat || sending) return;
    if (!actorUserId) {
      setError("Sign in is required to send dispute messages.");
      return;
    }
    setSending(true);
    try {
      const attachments = await uploadPendingFiles();
      const body = input.trim();
      if (!body && attachments.length === 0) {
        setError("Message body or media attachment is required.");
        return;
      }

      const created = await createDisputeMessage(publicId, {
        body: body || undefined,
        attachments,
      });
      setMessages((prev) => [...prev, created]);
      setInput("");
      setPendingFiles([]);
      setError(null);
      void loadMessages(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div className="w-96 h-[34rem] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-slate-900 flex justify-between items-center">
            <span className="text-white font-semibold text-sm">Dispute Chat</span>
            <button onClick={() => setIsOpen(false)} className="text-white cursor-pointer">
              x
            </button>
          </div>

          {!canUseChat ? (
            <div className="flex-1 p-4 text-sm text-gray-600">
              {!isLoaded || !isSignedIn
                ? "Sign in to access dispute chat."
                : "Chat becomes available after a dispute is opened."}
            </div>
          ) : (
            <>
              <div
                ref={messageListRef}
                className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 bg-slate-100/60"
              >
                {loading && messages.length === 0 ? (
                  <p className="text-sm text-gray-500">Loading messages...</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-gray-500">No messages yet.</p>
                ) : (
                  messages.map((msg) => {
                    const mine = !!actorUserId && msg.sender_user_id === actorUserId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-2xl border p-3 shadow-sm ${
                            mine
                              ? "bg-blue-600 text-white border-blue-600 rounded-br-md"
                              : "bg-white text-gray-900 border-gray-200 rounded-bl-md"
                          }`}
                        >
                          <div
                            className={`flex items-center gap-2 text-[11px] ${
                              mine ? "text-blue-100" : "text-gray-500"
                            }`}
                          >
                            <span className="font-semibold">
                              {mine
                                ? `You - ${resolveDisplayRole(msg, payerUserId, payeeUserId)}`
                                : resolveDisplayRole(msg, payerUserId, payeeUserId)}
                            </span>
                            <span>-</span>
                            <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                          </div>
                          {msg.body ? (
                            <p className={`text-sm mt-1 whitespace-pre-wrap ${mine ? "text-white" : "text-gray-900"}`}>
                              {msg.body}
                            </p>
                          ) : null}
                          {msg.attachments?.length ? (
                            <div className="mt-2 space-y-2">
                              {msg.attachments.map((attachment, idx) => {
                                if (!attachment.storage_url) {
                                  return (
                                    <p
                                      key={`${msg.id}-missing-${idx}`}
                                      className={`text-xs ${mine ? "text-blue-100" : "text-gray-500"}`}
                                    >
                                      {attachment.file_name || "Attachment"} (processing)
                                    </p>
                                  );
                                }
                                if (isImage(attachment.content_type)) {
                                  return (
                                    <a
                                      key={`${msg.id}-img-${idx}`}
                                      href={attachment.storage_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="block"
                                    >
                                      <img
                                        src={attachment.storage_url}
                                        alt={attachment.file_name || "attachment"}
                                        className={`max-h-56 rounded border ${
                                          mine ? "border-blue-400/60" : "border-gray-200"
                                        }`}
                                      />
                                    </a>
                                  );
                                }
                                if (isVideo(attachment.content_type)) {
                                  return (
                                    <video
                                      key={`${msg.id}-video-${idx}`}
                                      src={attachment.storage_url}
                                      controls
                                      className={`max-h-56 w-full rounded border ${
                                        mine ? "border-blue-400/60" : "border-gray-200"
                                      }`}
                                    />
                                  );
                                }
                                return (
                                  <a
                                    key={`${msg.id}-file-${idx}`}
                                    href={attachment.storage_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`text-xs underline break-all ${
                                      mine ? "text-blue-100" : "text-blue-700"
                                    }`}
                                  >
                                    {attachment.file_name || "Attachment"}
                                  </a>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-3 border-t bg-white flex flex-col gap-2">
                {error ? <p className="text-xs text-red-600">{error}</p> : null}
                {selectedFileLabel ? (
                  <p className="text-xs text-gray-600 truncate">{selectedFileLabel}</p>
                ) : null}
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-black outline-none"
                    disabled={sending || uploading}
                  />
                  <label className="bg-gray-100 border border-gray-300 text-gray-700 px-2 py-2 rounded-lg text-xs cursor-pointer">
                    Media
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => setPendingFiles(Array.from(e.target.files || []))}
                      disabled={sending || uploading}
                    />
                  </label>
                  <button
                    onClick={() => void sendMessage()}
                    className="bg-slate-900 text-white px-3 py-2 rounded-lg text-sm cursor-pointer disabled:opacity-60"
                    disabled={sending || uploading}
                  >
                    {sending ? "..." : uploading ? "Up..." : "Send"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => setIsOpen((p) => !p)}
        className="w-12 h-12 bg-blue-600 rounded-full text-white text-xl shadow-lg cursor-pointer"
      >
        {isOpen ? "x" : "C"}
      </button>
    </div>
  );
}

