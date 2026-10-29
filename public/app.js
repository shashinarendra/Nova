/* ═══════════════════════════════════════════════════════════════════════════
   Nova — AI Chat Assistant  •  Frontend Application
   ═══════════════════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  // ─── State ────────────────────────────────────────────────────────────────
  const state = {
    currentConversationId: null,
    conversations: [], // { id, title, createdAt }
    isStreaming: false,
  };

  // ─── DOM References ───────────────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const messageInput = $("#message-input");
  const sendBtn = $("#send-btn");
  const chatMessages = $("#chat-messages");
  const welcomeScreen = $("#welcome-screen");
  const newChatBtn = $("#new-chat-btn");
  const clearChatBtn = $("#clear-chat-btn");
  const sidebarToggle = $("#sidebar-toggle");
  const sidebar = $("#sidebar");
  const conversationList = $("#conversation-list");
  const contextCount = $("#context-count");
  const headerSubtitle = $("#header-subtitle");
  const toastContainer = $("#toast-container");

  // ─── Markdown Parser (lightweight) ────────────────────────────────────────
  function parseMarkdown(text) {
    if (!text) return "";

    let html = text
      // Escape HTML
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Code blocks (```...```)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre><code class="lang-${lang}">${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Headers
    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

    // Italic
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

    // Links
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );

    // Blockquotes
    html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");

    // Horizontal rule
    html = html.replace(/^---$/gm, "<hr>");

    // Unordered lists
    html = html.replace(/^[*\-] (.+)$/gm, "<li>$1</li>");
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

    // Paragraphs (lines separated by double newlines)
    html = html
      .split(/\n\n+/)
      .map((block) => {
        block = block.trim();
        if (!block) return "";
        if (
          block.startsWith("<h") ||
          block.startsWith("<pre") ||
          block.startsWith("<ul") ||
          block.startsWith("<ol") ||
          block.startsWith("<blockquote") ||
          block.startsWith("<hr")
        ) {
          return block;
        }
        return `<p>${block.replace(/\n/g, "<br>")}</p>`;
      })
      .join("");

    return html;
  }

  // ─── API Calls ────────────────────────────────────────────────────────────
  async function apiCall(endpoint, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(endpoint, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);

      if (err.name === "AbortError") {
        throw new Error(
          "Request timed out. The server might be under heavy load — please try again."
        );
      }

      if (err instanceof TypeError && err.message.includes("fetch")) {
        throw new Error(
          "Could not connect to the server. Please check your internet connection and try again."
        );
      }

      throw err;
    }
  }

  async function createConversation() {
    const data = await apiCall("/api/conversations", { method: "POST" });
    return data.conversationId;
  }

  async function sendMessage(message, conversationId) {
    return apiCall("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, conversationId }),
    });
  }

  async function deleteConversation(id) {
    return apiCall(`/api/conversations/${id}`, { method: "DELETE" });
  }

  // ─── Toast Notifications ──────────────────────────────────────────────────
  function showToast(message, type = "error") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const icon =
      type === "error"
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';

    toast.innerHTML = `${icon}<span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("toast-exit");
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  // ─── UI Helpers ───────────────────────────────────────────────────────────
  function appendMessage(role, content) {
    // Hide welcome screen on first message
    if (welcomeScreen) {
      welcomeScreen.style.display = "none";
    }

    const row = document.createElement("div");
    row.className = `message-row ${role}`;

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = role === "user" ? "You" : "N";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    if (role === "bot") {
      bubble.innerHTML = parseMarkdown(content);
    } else {
      // User messages: plain text, escape HTML
      const escaped = content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
      bubble.innerHTML = `<p>${escaped}</p>`;
    }

    row.appendChild(avatar);
    row.appendChild(bubble);
    chatMessages.appendChild(row);

    scrollToBottom();
    return row;
  }

  function appendTypingIndicator() {
    if (welcomeScreen) {
      welcomeScreen.style.display = "none";
    }

    const row = document.createElement("div");
    row.className = "message-row bot";
    row.id = "typing-indicator";

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = "N";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;

    row.appendChild(avatar);
    row.appendChild(bubble);
    chatMessages.appendChild(row);

    scrollToBottom();
  }

  function removeTypingIndicator() {
    const el = document.getElementById("typing-indicator");
    if (el) el.remove();
  }

  function appendError(message) {
    const errDiv = document.createElement("div");
    errDiv.className = "message-error";
    errDiv.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>${message}</span>`;
    chatMessages.appendChild(errDiv);
    scrollToBottom();
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  }

  function setLoading(loading) {
    state.isStreaming = loading;
    sendBtn.disabled = loading || !messageInput.value.trim();
    messageInput.disabled = loading;

    if (loading) {
      headerSubtitle.textContent = "Thinking…";
      headerSubtitle.style.color = "var(--accent-primary)";
    } else {
      headerSubtitle.textContent = "Powered by Gemini 3.8 Flash";
      headerSubtitle.style.color = "";
    }
  }

  function updateContextCount(count) {
    contextCount.textContent = count;
  }

  // ─── Conversation List (Sidebar) ──────────────────────────────────────────
  function saveConversations() {
    localStorage.setItem("nova_conversations", JSON.stringify(state.conversations));
  }

  function loadConversations() {
    try {
      const stored = localStorage.getItem("nova_conversations");
      state.conversations = stored ? JSON.parse(stored) : [];
    } catch {
      state.conversations = [];
    }
  }

  function addConversation(id, firstMessage) {
    const title =
      firstMessage.length > 40
        ? firstMessage.substring(0, 40) + "…"
        : firstMessage;

    state.conversations.unshift({
      id,
      title,
      createdAt: new Date().toISOString(),
    });

    // Keep max 30 conversations in sidebar
    if (state.conversations.length > 30) {
      state.conversations = state.conversations.slice(0, 30);
    }

    saveConversations();
    renderConversationList();
  }

  function renderConversationList() {
    conversationList.innerHTML = "";

    state.conversations.forEach((conv) => {
      const item = document.createElement("div");
      item.className = `conv-item ${conv.id === state.currentConversationId ? "active" : ""}`;

      item.innerHTML = `
        <span class="conv-icon">💬</span>
        <span class="conv-title">${escapeHtml(conv.title)}</span>
        <button class="conv-delete" title="Delete conversation" data-id="${conv.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      `;

      // Click to switch conversation (reload needed since history is server-side)
      item.addEventListener("click", (e) => {
        if (e.target.closest(".conv-delete")) return;
        // For simplicity, start new chat when switching
        // (history is server-side and we don't persist message UI)
        showToast("Conversation history is stored on the server for this session.", "success");
      });

      // Delete button
      const delBtn = item.querySelector(".conv-delete");
      delBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        try {
          await deleteConversation(conv.id);
          state.conversations = state.conversations.filter((c) => c.id !== conv.id);
          saveConversations();
          renderConversationList();

          if (conv.id === state.currentConversationId) {
            startNewChat();
          }
        } catch (err) {
          showToast("Failed to delete conversation.");
        }
      });

      conversationList.appendChild(item);
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // ─── Core Chat Logic ─────────────────────────────────────────────────────
  async function handleSend() {
    const message = messageInput.value.trim();
    if (!message || state.isStreaming) return;

    // Clear input
    messageInput.value = "";
    messageInput.style.height = "auto";
    sendBtn.disabled = true;

    // Create conversation if needed
    if (!state.currentConversationId) {
      try {
        state.currentConversationId = await createConversation();
        addConversation(state.currentConversationId, message);
      } catch (err) {
        appendError("Failed to create conversation: " + err.message);
        showToast(err.message);
        return;
      }
    }

    // Show user message
    appendMessage("user", message);
    setLoading(true);
    appendTypingIndicator();

    try {
      const data = await sendMessage(message, state.currentConversationId);
      removeTypingIndicator();
      appendMessage("bot", data.response);
      updateContextCount(data.historyLength);

      if (data.summaryCount > 0) {
        headerSubtitle.textContent = `Powered by Gemini 3.8 Flash · ${data.summaryCount} context summary`;
      }
    } catch (err) {
      removeTypingIndicator();
      appendError(err.message);
      showToast(err.message);
    } finally {
      setLoading(false);
      messageInput.focus();
    }
  }

  function startNewChat() {
    state.currentConversationId = null;
    chatMessages.innerHTML = "";
    updateContextCount(0);
    headerSubtitle.textContent = "Powered by Gemini 3.8 Flash";
    headerSubtitle.style.color = "";

    // Re-show welcome screen
    if (welcomeScreen) {
      const clone = welcomeScreen.cloneNode(true);
      clone.style.display = "";
      chatMessages.appendChild(clone);

      // Re-bind chip handlers
      clone.querySelectorAll(".chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          messageInput.value = chip.dataset.msg;
          handleSend();
        });
      });
    }

    renderConversationList();
    messageInput.focus();
  }

  // ─── Event Listeners ─────────────────────────────────────────────────────
  // Send button
  sendBtn.addEventListener("click", handleSend);

  // Enter to send, Shift+Enter for new line
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Auto-resize textarea
  messageInput.addEventListener("input", () => {
    messageInput.style.height = "auto";
    messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + "px";
    sendBtn.disabled = !messageInput.value.trim() || state.isStreaming;
  });

  // New chat
  newChatBtn.addEventListener("click", startNewChat);

  // Clear chat
  clearChatBtn.addEventListener("click", async () => {
    if (state.currentConversationId) {
      try {
        await deleteConversation(state.currentConversationId);
        state.conversations = state.conversations.filter(
          (c) => c.id !== state.currentConversationId
        );
        saveConversations();
      } catch {
        // Ignore delete errors
      }
    }
    startNewChat();
  });

  // Sidebar toggle (mobile)
  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
  });

  // Suggestion chips (initial welcome screen)
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      messageInput.value = chip.dataset.msg;
      handleSend();
    });
  });

  // ─── Initialize ───────────────────────────────────────────────────────────
  loadConversations();
  renderConversationList();
  messageInput.focus();

  // Health check
  (async () => {
    try {
      await apiCall("/api/health");
    } catch {
      showToast(
        "Cannot connect to the server. Please check your network or try refreshing the page."
      );
    }
  })();
})();
