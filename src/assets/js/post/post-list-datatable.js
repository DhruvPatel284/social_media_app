$(document).ready(function () {
  $('#post-table').DataTable({
    processing: true,
    serverSide: false,
    ajax: {
      url: '/admin/posts',
      type: 'GET',
      data: { limit: 100 },
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      dataSrc: function (json) {
        const items = json.data ? json.data : [];
        return items.map(function (post) {
          post.likeCount    = (post.likedBy   && post.likedBy.length)   ? post.likedBy.length   : (post.likeCount    ?? 0);
          post.commentCount = (post.comments  && post.comments.length)  ? post.comments.length  : (post.commentCount ?? 0);
          return post;
        });
      },
    },
    paging: true,
    lengthChange: true,
    lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
    pageLength: 10,
    columns: [
      {
        title: 'ID',
        data: 'id',
        width: '60px',
        // Force string type so the sort arrow sits on the RIGHT
        type: 'string',
        className: 'dt-left'
      },
      {
        title: 'Author',
        data: 'user',
        render: function (user) {
          if (!user) return '<span class="text-muted">—</span>';
          return `<span class="fw-semibold">${user.name}</span><br>
                  <small class="text-muted">${user.email}</small>`;
        },
      },
      {
        title: 'Content',
        data: 'content',
        render: function (content) {
          if (!content) return '<span class="text-muted">—</span>';
          const truncated = content.length > 80 ? content.slice(0, 80) + '…' : content;
          return `<span title="${content.replace(/"/g, '&quot;')}">${truncated}</span>`;
        },
      },
      {
        title: '<i class="ri-heart-line me-1"></i>Likes',
        data: 'likeCount',
        width: '80px',
        // Numeric column — force string type so arrow is on the RIGHT
        type: 'string',
        className: 'dt-left',
        render: function (count) {
          return `<span class="badge bg-danger-subtle text-danger">${count ?? 0}</span>`;
        },
      },
      {
        title: '<i class="ri-chat-3-line me-1"></i>Comments',
        data: 'commentCount',
        width: '100px',
        type: 'string',
        className: 'dt-left',
        render: function (count) {
          return `<span class="badge bg-info-subtle text-info">${count ?? 0}</span>`;
        },
      },
      {
        title: 'Status',
        data: 'Reviewed',
        width: '110px',
        render: function (reviewed) {
          if (reviewed) {
            return `<span class="badge bg-success">
                      <i class="ri-shield-check-line me-1"></i>Reviewed
                    </span>`;
          }
          return `<span class="badge bg-danger">
                    <i class="ri-shield-cross-line me-1"></i>Not Reviewed
                  </span>`;
        },
      },
      {
        title: 'Posted',
        data: 'createdAt',
        width: '110px',
        type: 'string',
        render: function (date) {
          if (!date) return '—';
          return new Date(date).toLocaleDateString();
        },
      },
      {
        title: 'Actions',
        data: null,
        orderable: false,
        width: '80px',
        render: function (data, type, row) {
          return `
            <a href="/admin/posts/${row.id}" class="btn btn-sm btn-soft-primary">
              <i class="ri-eye-fill align-middle"></i> View
            </a>
          `;
        },
      },
    ],
    order: [[0, 'desc']],
    language: {
      processing: '<span class="spinner-border spinner-border-sm me-2"></span> Loading...',
      emptyTable: 'No posts found.',
    },
  });
});