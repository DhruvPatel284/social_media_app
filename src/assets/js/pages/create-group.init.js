/*
  Create Group Chat page JS
*/
(function () {
    var cfg = window.__CREATE_GROUP_CONFIG__ || {};
    var apiBase = cfg.apiBase || "/user/chats/api";

    var selectedIds = {};
    var allUsers = [];

    var groupNameInput = document.getElementById("groupNameInput");
    var memberSearchInput = document.getElementById("memberSearchInput");
    var networkList = document.getElementById("networkList");
    var noNetworkMsg = document.getElementById("noNetworkMsg");
    var selectedCountBadge = document.getElementById("selectedCountBadge");
    var createGroupBtn = document.getElementById("createGroupBtn");

    function escapeHtml(str) {
        return (str == null ? "" : String(str))
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function updateBadge() {
        if (!selectedCountBadge) return;
        var n = Object.keys(selectedIds).length;
        selectedCountBadge.textContent = n === 1 ? "1 member selected" : n + " members selected";
    }

    function renderUserList(users, filter) {
        if (!networkList) return;
        var q = (filter || "").toLowerCase();
        var filtered = users.filter(function (u) { return !q || u.name.toLowerCase().indexOf(q) !== -1; });

        networkList.innerHTML = "";

        if (filtered.length === 0) {
            networkList.innerHTML = '<div class="text-center text-muted py-3 fs-13">No users found.</div>';
            return;
        }

        filtered.forEach(function (u) {
            var isChecked = !!selectedIds[u.id];
            var avatarHtml = u.profile_image
                ? '<img src="/uploads/users/' + escapeHtml(u.profile_image) + '" class="rounded-circle me-2" width="36" height="36" alt="">'
                : '<div class="avatar-xs me-2"><div class="avatar-title rounded-circle bg-soft-primary text-primary fs-14">' + escapeHtml(u.name.charAt(0).toUpperCase()) + '</div></div>';

            var item = document.createElement("label");
            item.className = "list-group-item list-group-item-action d-flex align-items-center gap-2 py-2 px-3" + (isChecked ? " active" : "");
            item.style.cursor = "pointer";
            item.innerHTML =
                '<input class="form-check-input flex-shrink-0 member-checkbox" type="checkbox" value="' + escapeHtml(u.id) + '" ' + (isChecked ? "checked" : "") + ' style="width:18px;height:18px;">' +
                avatarHtml +
                '<span class="fw-medium">' + escapeHtml(u.name) + '</span>';

            var cb = item.querySelector(".member-checkbox");
            (function (userId, labelEl) {
                cb.addEventListener("change", function (e) {
                    if (e.target.checked) { selectedIds[userId] = true; labelEl.classList.add("active"); }
                    else { delete selectedIds[userId]; labelEl.classList.remove("active"); }
                    updateBadge();
                });
            })(u.id, item);

            networkList.appendChild(item);
        });
    }

    function init(users) {
        allUsers = users || [];
        if (allUsers.length === 0) {
            if (noNetworkMsg) noNetworkMsg.classList.remove("d-none");
            if (networkList) networkList.style.display = "none";
        } else {
            if (noNetworkMsg) noNetworkMsg.classList.add("d-none");
            renderUserList(allUsers, "");
        }
    }

    if (memberSearchInput) {
        memberSearchInput.addEventListener("input", function () {
            renderUserList(allUsers, memberSearchInput.value);
        });
    }

    if (createGroupBtn) {
        createGroupBtn.addEventListener("click", function () {
            var name = (groupNameInput && groupNameInput.value || "").trim();
            if (!name) {
                if (groupNameInput) groupNameInput.classList.add("is-invalid");
                return;
            }
            if (groupNameInput) groupNameInput.classList.remove("is-invalid");

            var memberIds = Object.keys(selectedIds);

            createGroupBtn.disabled = true;
            createGroupBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Creating...';

            fetch(apiBase + "/group", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ name: name, memberIds: memberIds }),
            })
                .then(function (res) { return res.json().catch(function () { return {}; }).then(function (data) { return { res: res, data: data }; }); })
                .then(function (rd) {
                    if (!rd.res.ok || rd.data.success === false) throw new Error(rd.data.error || "Failed to create group");
                    window.location.href = "/user/chats";
                })
                .catch(function (err) {
                    createGroupBtn.disabled = false;
                    createGroupBtn.innerHTML = '<i class="ri-check-line me-1"></i> Create Group';
                    if (typeof Swal !== "undefined") Swal.fire("Error", (err && err.message) || "Failed to create group", "error");
                    else alert((err && err.message) || "Failed to create group");
                });
        });
    }

    // Use server-side pre-populated network for instant render
    if (cfg.initialNetwork) {
        init(cfg.initialNetwork);
    } else {
        fetch(apiBase + "/followers-following", { credentials: "same-origin" })
            .then(function (r) { return r.json(); })
            .then(function (data) { init(data.users || []); })
            .catch(function () { init([]); });
    }
})();
