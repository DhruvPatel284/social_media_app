document.addEventListener('DOMContentLoaded', () => {
  const dataTable = new DataTable('#table-id', {
    processing: true,
    serverSide: true,

    ajax: async function (data, callback, settings) {
      const params = {
        search: data.search?.value,
        limit: data.length,
        page: Math.ceil((data.start + 1) / data.length),
      };

      if (data.order.length) {
        const order = data.order[0];
        const columnName = data.columns[order.column].data;
        params.sortBy = `${columnName}:${order.dir.toUpperCase()}`;
      }

      const query = new URLSearchParams(params).toString();

      try {
        const response = await fetch(`/endpoint?${query}`, {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });
        const result = await response.json();

        result.data = result.data
          ? result.data.map((d, i) => {
              d.row_index = i + 1 + (params.page - 1) * params.limit;
              return d;
            })
          : [];

        callback({
          data: result.data,
          recordsTotal: result.meta.totalItems,
          recordsFiltered: result.meta.totalItems,
        });
      } catch (error) {
        console.error('Fetch error:', error);
        callback({
          data: [],
          recordsTotal: 0,
          recordsFiltered: 0,
        });
      }
    },

    columns: [
      {
        title: 'NO.',
        data: 'row_index',
        orderable: false,
      },
      // your columns here
      { data: 'name', title: 'CUSTOMER NAME' },

      // action column
      {
        data: null,
        title: 'ACTION',
        orderable: false,
        render: function (data, type, row) {
          return `
          <a href="/leads/${row.id}"
            class="btn btn-link p-0 me-1 text-primary"
            title="View Lead Details">
            <i class="ri-eye-line"></i>
          </a>
          `;
        },
      },
    ],

    columnDefs: [
      // this is for ellipsis render at specific columns
      {
        targets: 0,
        render: DataTable.render.ellipsis(50),
      },
    ],
  });
});
