/*
  user-chat.init.js  →  Real-time chat with Socket.io
  Works for both sidebar (group/direct) and direct-only modes.
*/
(function () {
  var cfg = window.__CHAT_CONFIG__ || {};
  var apiBase = cfg.apiBase || '/user/chats/api';
  var selfUserId = cfg.selfUserId || null;

  // ─── DOM refs ─────────────────────────────────────────────────────────────
  var userListEl = document.getElementById('userList');
  var groupListEl = document.getElementById('groupList');
  var convoEl = document.getElementById('users-conversation');
  var loaderEl = document.getElementById('elmLoader');
  var chatForm = document.getElementById('chatinput-form');
  var chatInput = document.getElementById('chat-input');
  var chatInputFb = document.querySelector('.chat-input-feedback');
  var chatSearchEl = document.getElementById('chatSearchInput');
  var attachBtn = document.getElementById('attach-file-btn');
  var fileInput = document.getElementById('chat-file-input');
  var typingEl = document.getElementById('typing-indicator');

  var currentChatId = cfg.chatId ? Number(cfg.chatId) : null;
  var currentChatType = null;
  var chatIndex = [];

  // ─── Socket.io ────────────────────────────────────────────────────────────
  var socket = null;
  var typingTimer = null;
  var isTyping = false;

  function connectSocket() {
    if (!selfUserId) return;
    socket = io('/chat', {
      auth: { userId: selfUserId },
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socket.on('connect', function () {
      console.log('[socket] connected:', socket.id);
      // Re-join the current room after reconnect
      if (currentChatId) emitJoinRoom(currentChatId);
    });

    socket.on('newMessage', function (msg) {
      // Append only — avoid full reload on every message
      appendMessage(msg);
      // Update sidebar last-message preview
      updateSidebarPreview(msg);
    });

    socket.on('typing', function (data) {
      if (Number(data.chatId) !== Number(currentChatId)) return;
      showTyping(data.senderName || 'Someone');
    });

    socket.on('stopTyping', function (data) {
      if (Number(data.chatId) !== Number(currentChatId)) return;
      hideTyping();
    });

    socket.on('error', function (data) {
      console.warn('[socket] error:', data.message);
    });

    socket.on('disconnect', function () {
      console.log('[socket] disconnected');
    });
  }

  function emitJoinRoom(chatId, previousChatId) {
    if (!socket || !socket.connected) return;
    socket.emit('joinRoom', { chatId: chatId, previousChatId: previousChatId || undefined });
  }

  // ─── Typing indicator ─────────────────────────────────────────────────────
  function showTyping(name) {
    if (typingEl) {
      typingEl.textContent = name + ' is typing…';
      typingEl.style.display = 'block';
    }
  }
  function hideTyping() {
    if (typingEl) typingEl.style.display = 'none';
  }

  if (chatInput) {
    chatInput.addEventListener('input', function () {
      if (!currentChatId || !socket || !socket.connected) return;
      if (!isTyping) {
        isTyping = true;
        socket.emit('typing', { chatId: currentChatId, senderName: cfg.selfUserName || 'Someone' });
      }
      clearTimeout(typingTimer);
      typingTimer = setTimeout(function () {
        isTyping = false;
        socket.emit('stopTyping', { chatId: currentChatId });
      }, 1500);
    });
  }

  // ─── Utilities ────────────────────────────────────────────────────────────
  function esc(str) {
    return (str == null ? '' : String(str))
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function fmtTime(d) {
    var dt = new Date(d);
    return isNaN(dt.getTime()) ? '' : dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  function fmtSize(b) {
    if (!b) return '';
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }
  function fetchJson(url, opts) {
    return fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' }, opts || {}))
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (!r.ok || d.success === false) throw new Error(d.error || 'Request failed');
          return d;
        });
      });
  }

  // ─── Header ───────────────────────────────────────────────────────────────
  function setHeader(chat) {
    if (!chat) return;
    var imgEl = document.querySelector('.user-chat-topbar .chat-header-img');
    var subEl = document.getElementById('chat-header-sub');
    if (chat.type === 'group') {
      document.querySelectorAll('.username').forEach(function (el) { el.textContent = chat.groupName || 'Group'; });
      if (imgEl) imgEl.style.display = 'none';
      if (subEl) subEl.textContent = 'Group Chat';
    } else {
      var u = chat.otherUser;
      var img = (u && u.profile_image) ? '/uploads/users/' + esc(u.profile_image) : '/assets/images/users/user-dummy-img.jpg';
      document.querySelectorAll('.username').forEach(function (el) { el.textContent = (u && u.name) || 'Chat'; });
      if (imgEl) { imgEl.src = img; imgEl.style.display = ''; }
      if (subEl) subEl.textContent = '';
    }
  }

  // ─── Sidebar preview helper ───────────────────────────────────────────────
  function lastMsgSnippet(lm) {
    if (!lm) return '';
    var t = lm.messageType || 'text';
    if (t === 'image') return '📷 Image';
    if (t === 'video') return '🎥 Video';
    if (t === 'file') return '📎 File';
    return lm.content || '';
  }

  function updateSidebarPreview(msg) {
    var li = document.querySelector('[data-chat-id="' + msg.chatId + '"]');
    if (!li) return;
    var preview = li.closest('li') && li.closest('li').querySelector('small.text-muted');
    if (preview) preview.textContent = lastMsgSnippet(msg);
  }

  // ─── Render list ──────────────────────────────────────────────────────────
  function renderChatList(items) {
    var directs = (items || []).filter(function (c) { return c.type === 'direct' && c.otherUser; });
    var groups = (items || []).filter(function (c) { return c.type === 'group'; });

    if (userListEl) {
      userListEl.innerHTML = '';
      directs.forEach(function (c) {
        var active = currentChatId && Number(currentChatId) === Number(c.chatId);
        var badge = c.unreadCount > 0 ? '<div class="ms-auto"><span class="badge bg-dark-subtle text-body rounded p-1">' + c.unreadCount + '</span></div>' : '';
        var avatar = c.otherUser.profile_image
          ? '<img src="/uploads/users/' + esc(c.otherUser.profile_image) + '" class="rounded-circle img-fluid userprofile" alt=""><span class="user-status"></span>'
          : '<img src="/assets/images/users/user-dummy-img.jpg" class="rounded-circle img-fluid userprofile" alt=""><span class="user-status"></span>';
        userListEl.insertAdjacentHTML('beforeend',
          '<li data-name="direct-message" class="' + (active ? 'active' : '') + '">' +
          '<a href="javascript:void(0);" data-chat-id="' + c.chatId + '" data-chat-type="direct">' +
          '<div class="d-flex align-items-center">' +
          '<div class="flex-shrink-0 chat-user-img align-self-center me-2 ms-0"><div class="avatar-xxs">' + avatar + '</div></div>' +
          '<div class="flex-grow-1 overflow-hidden"><p class="text-truncate mb-0">' + esc(c.otherUser.name) + '</p>' +
          '<small class="text-muted text-truncate d-block">' + esc(lastMsgSnippet(c.lastMessage)) + '</small></div>' +
          badge + '</div></a></li>');
      });
      attachListHandlers(userListEl);
    }

    if (groupListEl) {
      groupListEl.innerHTML = '';
      groups.forEach(function (c) {
        var active = currentChatId && Number(currentChatId) === Number(c.chatId);
        var badge = c.unreadCount > 0 ? '<div class="ms-auto"><span class="badge bg-dark-subtle text-body rounded p-1">' + c.unreadCount + '</span></div>' : '';
        groupListEl.insertAdjacentHTML('beforeend',
          '<li data-name="group-chat" class="' + (active ? 'active' : '') + '">' +
          '<a href="javascript:void(0);" data-chat-id="' + c.chatId + '" data-chat-type="group">' +
          '<div class="d-flex align-items-center">' +
          '<div class="flex-shrink-0 chat-user-img align-self-center me-2 ms-0"><div class="avatar-xxs">' +
          '<div class="avatar-title rounded-circle bg-soft-primary text-primary fs-11"><i class="ri-group-line"></i></div></div></div>' +
          '<div class="flex-grow-1 overflow-hidden"><p class="text-truncate mb-0">' + esc(c.groupName || 'Group') + '</p>' +
          '<small class="text-muted text-truncate d-block">' + esc(lastMsgSnippet(c.lastMessage)) + '</small></div>' +
          badge + '</div></a></li>');
      });
      attachListHandlers(groupListEl);
    }

    if (!currentChatId && directs.length > 0) {
      openChat(directs[0].chatId, 'direct', directs[0]);
    }
  }

  function attachListHandlers(listEl) {
    listEl.querySelectorAll('a[data-chat-id]').forEach(function (a) {
      a.addEventListener('click', function () {
        var newChatId = Number(a.getAttribute('data-chat-id'));
        var newType = a.getAttribute('data-chat-type');
        var chat = chatIndex.find(function (x) { return Number(x.chatId) === newChatId; });
        openChat(newChatId, newType, chat);
        document.querySelectorAll('.chat-user-list li').forEach(function (li) { li.classList.remove('active'); });
        if (a.closest('li')) a.closest('li').classList.add('active');
      });
    });
  }

  function openChat(chatId, chatType, chat) {
    var prev = currentChatId;
    currentChatId = chatId;
    currentChatType = chatType;
    setHeader(chat);
    hideTyping();
    emitJoinRoom(chatId, prev !== chatId ? prev : undefined);
    loadMessages(chatId).then(function () { return loadChatList(); });
  }

  // ─── Message content ──────────────────────────────────────────────────────
  function renderContent(m) {
    if (m.isDeleted) return '<p class="mb-0 ctext-content fst-italic text-muted">This message was deleted</p>';
    var t = m.messageType || 'text';
    if (t === 'image') {
      var src = '/uploads/chats/' + esc(m.content);
      return '<a href="' + src + '" class="chat-img-link" data-glightbox="type: image" target="_blank">' +
        '<img src="' + src + '" alt="' + esc(m.fileName || 'image') + '" class="img-fluid rounded chat-img-preview" style="max-width:240px;max-height:200px;cursor:pointer;"/></a>' +
        (m.fileName ? '<p class="mb-0 mt-1 text-muted" style="font-size:11px;">' + esc(m.fileName) + (m.fileSize ? ' · ' + fmtSize(m.fileSize) : '') + '</p>' : '');
    }
    if (t === 'video') {
      var vsrc = '/uploads/chats/' + esc(m.content);
      return '<video controls class="chat-video-preview rounded" style="max-width:280px;max-height:200px;"><source src="' + vsrc + '"/>Your browser does not support video.</video>' +
        (m.fileName ? '<p class="mb-0 mt-1 text-muted" style="font-size:11px;">' + esc(m.fileName) + (m.fileSize ? ' · ' + fmtSize(m.fileSize) : '') + '</p>' : '');
    }
    if (t === 'file') {
      var furl = '/uploads/chats/' + esc(m.content);
      var fname = m.fileName || m.content || 'Download file';
      return '<div class="d-flex align-items-center gap-2 p-2 rounded border bg-light">' +
        '<i class="ri-file-line fs-24 text-primary flex-shrink-0"></i>' +
        '<div class="overflow-hidden"><a href="' + furl + '" download="' + esc(fname) + '" class="text-body fw-medium text-truncate d-block">' + esc(fname) + '</a>' +
        (m.fileSize ? '<span class="text-muted">' + fmtSize(m.fileSize) + '</span>' : '') + '</div>' +
        '<a href="' + furl + '" download="' + esc(fname) + '" class="btn btn-sm btn-soft-primary ms-auto flex-shrink-0" title="Download"><i class="ri-download-2-line"></i></a></div>';
    }
    return '<p class="mb-0 ctext-content">' + esc(m.content || '') + '</p>';
  }

  function buildMessageHtml(m) {
    var right = String(m.senderId) === String(selfUserId);
    var align = right ? 'right' : 'left';
    var avatar = !right
      ? '<div class="chat-avatar"><img src="' + (m.senderProfileImage ? '/uploads/users/' + esc(m.senderProfileImage) : '/assets/images/users/user-dummy-img.jpg') + '" alt=""></div>'
      : '';
    var sender = !right && currentChatType === 'group' && m.senderName
      ? '<div class="mb-1"><small class="fw-semibold text-primary">' + esc(m.senderName) + '</small></div>' : '';
    var content = renderContent(m);
    var drop = '';
    if (right && !m.isDeleted) {
      var canCopy = !m.messageType || m.messageType === 'text';
      drop = '<div class="dropdown align-self-start message-box-drop">' +
        '<a class="dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown"><i class="ri-more-2-fill"></i></a>' +
        '<div class="dropdown-menu">' +
        (canCopy ? '<a class="dropdown-item copy-message" href="#" data-msg="' + esc(m.content || '') + '"><i class="ri-file-copy-line me-2 text-muted align-bottom"></i>Copy</a>' : '') +
        '<a class="dropdown-item delete-message" href="#" data-message-id="' + m.id + '"><i class="ri-delete-bin-5-line me-2 text-muted align-bottom"></i>Delete</a>' +
        '</div></div>';
    }
    return '<li class="chat-list ' + align + '" id="msg-' + m.id + '">' +
      '<div class="conversation-list">' + avatar +
      '<div class="user-chat-content">' + sender +
      '<div class="ctext-wrap"><div class="ctext-wrap-content">' + content + '</div>' + drop + '</div>' +
      '<div class="conversation-name"><small class="text-muted time">' + esc(fmtTime(m.createdAt)) + '</small></div>' +
      '</div></div></li>';
  }

  // ─── Append a single message (real-time) ──────────────────────────────────
  function appendMessage(m) {
    if (!convoEl) return;
    // Avoid duplicate if already rendered
    if (document.getElementById('msg-' + m.id)) return;
    convoEl.insertAdjacentHTML('beforeend', buildMessageHtml(m));
    wireMessageActions(document.getElementById('msg-' + m.id));
    initLightbox();
    scrollToBottom();
  }

  // ─── Render all messages ──────────────────────────────────────────────────
  function renderMessages(messages) {
    if (!convoEl) return;
    convoEl.innerHTML = '';
    (messages || []).forEach(function (m) {
      convoEl.insertAdjacentHTML('beforeend', buildMessageHtml(m));
      wireMessageActions(document.getElementById('msg-' + m.id));
    });
    initLightbox();
    scrollToBottom();
  }

  function wireMessageActions(row) {
    if (!row) return;
    var copy = row.querySelector('.copy-message');
    if (copy) {
      copy.addEventListener('click', function (e) {
        e.preventDefault();
        if (navigator.clipboard) navigator.clipboard.writeText(copy.getAttribute('data-msg') || '');
      });
    }
    var del = row.querySelector('.delete-message');
    if (del) {
      del.addEventListener('click', function (e) {
        e.preventDefault();
        var id = Number(del.getAttribute('data-message-id'));
        if (!currentChatId || !id) return;
        fetchJson(apiBase + '/' + currentChatId + '/messages/' + id + '/delete', { method: 'POST' })
          .then(function () {
            var ct = row.querySelector('.ctext-wrap-content');
            if (ct) ct.innerHTML = '<p class="mb-0 ctext-content fst-italic text-muted">This message was deleted</p>';
          })
          .catch(function (err) { console.error(err); });
      });
    }
  }

  function initLightbox() {
    try { if (typeof GLightbox !== 'undefined') GLightbox({ selector: '.chat-img-link' }); } catch (e) { }
  }

  function scrollToBottom() {
    try {
      var w = document.querySelector('#chat-conversation .simplebar-content-wrapper');
      if (w) { w.scrollTo({ top: w.scrollHeight, behavior: 'smooth' }); return; }
    } catch (e) { }
    var c = document.getElementById('chat-conversation');
    if (c) c.scrollTop = c.scrollHeight;
  }

  // ─── Data loading ─────────────────────────────────────────────────────────
  function loadChatList() {
    if (!userListEl && !groupListEl) return Promise.resolve();
    return fetchJson(apiBase + '/list').then(function (d) {
      chatIndex = d.chats || [];
      renderChatList(chatIndex);
    });
  }

  function loadMessages(chatId) {
    if (!convoEl) return Promise.resolve();
    if (loaderEl) loaderEl.style.display = 'block';
    return fetchJson(apiBase + '/' + chatId + '/messages').then(function (d) {
      if (loaderEl) loaderEl.style.display = 'none';
      renderMessages(d.messages || []);
    });
  }

  // ─── Send text via Socket ────────────────────────────────────────────────
  if (chatForm) {
    chatForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = (chatInput && chatInput.value || '').trim();
      if (!text) {
        if (chatInputFb) { chatInputFb.classList.add('show'); setTimeout(function () { chatInputFb.classList.remove('show'); }, 2000); }
        return;
      }
      if (!currentChatId) return;

      // Send via Socket if connected; fall back to HTTP if socket not ready
      if (socket && socket.connected) {
        socket.emit('sendMessage', { chatId: currentChatId, content: text });
        if (chatInput) chatInput.value = '';
        // Also stop typing indicator
        clearTimeout(typingTimer);
        isTyping = false;
        socket.emit('stopTyping', { chatId: currentChatId });
      } else {
        // Fallback: HTTP POST
        fetchJson(apiBase + '/' + currentChatId + '/messages', { method: 'POST', body: JSON.stringify({ content: text }) })
          .then(function () { if (chatInput) chatInput.value = ''; return loadMessages(currentChatId); })
          .then(function () { return loadChatList(); })
          .catch(function (err) {
            if (typeof Swal !== 'undefined') Swal.fire('Error', err.message || 'Failed to send', 'warning');
          });
      }
    });
  }

  // ─── File attachment ──────────────────────────────────────────────────────
  if (attachBtn) {
    attachBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (!currentChatId) {
        if (typeof Swal !== 'undefined') Swal.fire('No chat selected', 'Please select a chat first.', 'info');
        return;
      }
      var fi = document.getElementById('chat-file-input');
      if (fi) { fi.value = ''; fi.click(); }
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', function () { doUpload(this); });
  }
  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'chat-file-input' && e.target !== fileInput) doUpload(e.target);
  });

  function doUpload(inputEl) {
    var file = inputEl.files && inputEl.files[0];
    if (!file || !currentChatId) return;
    var formData = new FormData();
    formData.append('file', file);

    // Optimistic "sending" row
    var tempId = 'temp-' + Date.now();
    if (convoEl) {
      convoEl.insertAdjacentHTML('beforeend',
        '<li class="chat-list right" id="' + tempId + '">' +
        '<div class="conversation-list"><div class="user-chat-content">' +
        '<div class="ctext-wrap"><div class="ctext-wrap-content">' +
        '<p class="mb-0 text-muted fst-italic"><i class="ri-upload-cloud-line me-1"></i>Sending ' + esc(file.name) + '…</p>' +
        '</div></div></div></div></li>');
      scrollToBottom();
    }

    fetch(apiBase + '/' + currentChatId + '/messages/file', {
      method: 'POST',
      credentials: 'same-origin',
      body: formData,
    })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok || d.success === false) throw new Error(d.error || 'Upload failed'); return d; }); })
      .then(function (data) {
        var tmp = document.getElementById(tempId);
        if (tmp) tmp.parentNode.removeChild(tmp);
        inputEl.value = '';
        // The gateway will broadcast the message to other members.
        // For the uploader's own view: append the returned message directly.
        if (data.message) appendMessage(data.message);
      })
      .catch(function (err) {
        var tmp = document.getElementById(tempId);
        if (tmp) tmp.parentNode.removeChild(tmp);
        console.error('File send error:', err);
        if (typeof Swal !== 'undefined') Swal.fire('Upload failed', err.message || 'Could not send the file.', 'error');
      });
  }

  // ─── Search ───────────────────────────────────────────────────────────────
  if (chatSearchEl) {
    chatSearchEl.addEventListener('input', function () {
      var q = (chatSearchEl.value || '').toLowerCase();
      document.querySelectorAll('.chat-user-list li').forEach(function (li) {
        var name = (li.querySelector('.text-truncate') || {}).textContent || '';
        li.style.display = name.toLowerCase().indexOf(q) !== -1 ? '' : 'none';
      });
    });
  }

  // ─── Group info panel ─────────────────────────────────────────────────────
  function loadGroupMembers(chatId) {
    return fetchJson(apiBase + '/group/' + chatId + '/members').then(function (data) {
      var isCreator = data.creatorId === selfUserId;
      var panel = document.getElementById('groupInfoPanel');
      var directPanel = document.getElementById('directInfoPanel');
      var title = document.getElementById('groupInfoTitle');
      var nameEl = document.querySelector('.group-canvas-name');
      var countEl = document.getElementById('memberCountLabel');
      var membersList = document.getElementById('groupMembersList');
      var addSection = document.getElementById('addMemberSection');
      var addSelect = document.getElementById('addMemberSelect');
      if (panel) panel.classList.remove('d-none');
      if (directPanel) directPanel.classList.add('d-none');
      if (title) title.textContent = data.name || 'Group Info';
      if (nameEl) nameEl.textContent = data.name || 'Group';
      if (countEl) countEl.textContent = (data.members && data.members.length) || 0;
      if (membersList) {
        membersList.innerHTML = '';
        (data.members || []).forEach(function (m) {
          var isMe = m.id === selfUserId;
          var isCr = m.id === data.creatorId;
          var rmBtn = isCreator && !isMe
            ? '<button class="btn btn-sm btn-ghost-danger remove-member-btn ms-auto" data-user-id="' + m.id + '" title="Remove"><i class="ri-user-unfollow-line"></i></button>' : '';
          var badge = isCr ? '<span class="badge bg-warning-subtle text-warning ms-1 fs-10">Admin</span>' : '';
          var av = m.profile_image
            ? '<img src="/uploads/users/' + esc(m.profile_image) + '" class="rounded-circle avatar-xs" alt="">'
            : '<div class="avatar-xs"><div class="avatar-title rounded-circle bg-soft-secondary text-secondary fs-12">' + esc((m.name || '?').charAt(0).toUpperCase()) + '</div></div>';
          membersList.insertAdjacentHTML('beforeend',
            '<li class="d-flex align-items-center mb-3">' +
            '<div class="flex-shrink-0 me-2">' + av + '</div>' +
            '<div class="flex-grow-1 overflow-hidden"><p class="text-truncate mb-0 fw-medium">' + esc(m.name || 'Unknown') + badge + (isMe ? ' <span class="text-muted fs-11">(You)</span>' : '') + '</p></div>' +
            rmBtn + '</li>');
        });
        membersList.querySelectorAll('.remove-member-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            fetchJson(apiBase + '/group/' + chatId + '/members/remove', { method: 'POST', body: JSON.stringify({ userId: btn.getAttribute('data-user-id') }) })
              .then(function () { return loadGroupMembers(chatId); })
              .catch(function (err) { if (typeof Swal !== 'undefined') Swal.fire('Error', err.message, 'error'); });
          });
        });
      }
      if (addSection) {
        if (isCreator) {
          addSection.classList.remove('d-none');
          var ids = {};
          (data.members || []).forEach(function (m) { ids[m.id] = true; });
          return fetchJson(apiBase + '/followers-following').then(function (net) {
            var eligible = (net.users || []).filter(function (u) { return !ids[u.id]; });
            if (addSelect) {
              addSelect.innerHTML = '<option value="">Select a person…</option>';
              eligible.forEach(function (u) {
                var o = document.createElement('option'); o.value = u.id; o.textContent = u.name; addSelect.appendChild(o);
              });
            }
          });
        } else { addSection.classList.add('d-none'); }
      }
    }).catch(function (err) { console.error('loadGroupMembers:', err); });
  }

  function loadDirectInfo(chat) {
    var panel = document.getElementById('groupInfoPanel');
    var dp = document.getElementById('directInfoPanel');
    var title = document.getElementById('groupInfoTitle');
    var imgEl = document.getElementById('directInfoImg');
    if (panel) panel.classList.add('d-none');
    if (dp) dp.classList.remove('d-none');
    if (title) title.textContent = 'Profile';
    var u = chat && chat.otherUser;
    if (imgEl) imgEl.src = (u && u.profile_image) ? '/uploads/users/' + u.profile_image : '/assets/images/users/user-dummy-img.jpg';
    document.querySelectorAll('#directInfoPanel .username').forEach(function (el) { el.textContent = (u && u.name) || 'Unknown'; });
  }

  var infoBtn = document.getElementById('infoCanvasBtn');
  if (infoBtn) {
    infoBtn.addEventListener('click', function () {
      if (!currentChatId) return;
      var chat = chatIndex.find(function (c) { return Number(c.chatId) === currentChatId; });
      if (currentChatType === 'group') loadGroupMembers(currentChatId);
      else loadDirectInfo(chat);
    });
  }

  var addMemberBtn = document.getElementById('addMemberBtn');
  if (addMemberBtn) {
    addMemberBtn.addEventListener('click', function () {
      var sel = document.getElementById('addMemberSelect');
      var uid = sel && sel.value;
      if (!uid || !currentChatId) return;
      fetchJson(apiBase + '/group/' + currentChatId + '/members/add', { method: 'POST', body: JSON.stringify({ userId: uid }) })
        .then(function () { return loadGroupMembers(currentChatId); })
        .catch(function (err) { if (typeof Swal !== 'undefined') Swal.fire('Error', err.message, 'error'); });
    });
  }

  // ─── Emoji ────────────────────────────────────────────────────────────────
  try {
    if (window.FgEmojiPicker && document.querySelector('.chat-input')) {
      new FgEmojiPicker({ trigger: ['.emoji-btn'], removeOnSelection: false, closeButton: true, position: ['top', 'right'], preFetch: true, dir: '/assets/libs/fg-emoji-picker', insertInto: document.querySelector('.chat-input') });
    }
  } catch (e) { }

  // ─── Boot ─────────────────────────────────────────────────────────────────
  connectSocket();

  function ensureDirect() {
    if (cfg.mode !== 'direct' || currentChatId || !cfg.otherUserId) return Promise.resolve();
    return fetchJson(apiBase + '/direct', { method: 'POST', body: JSON.stringify({ otherUserId: cfg.otherUserId }) })
      .then(function (d) { currentChatId = d.chatId; currentChatType = 'direct'; });
  }

  ensureDirect()
    .then(function () {
      if (cfg.mode === 'direct' && currentChatId) {
        setHeader({ type: 'direct', otherUser: { name: cfg.otherUserName, profile_image: null } });
        emitJoinRoom(currentChatId);
        return loadMessages(currentChatId);
      }
      return loadChatList();
    })
    .catch(function (e) { console.error(e); });
})();
