document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const queryForm = document.getElementById('query-form');
  const queryInput = document.getElementById('query-input');
  const submitBtn = document.getElementById('submit-btn');
  const submitBtnText = document.getElementById('submit-btn-text');
  const submitBtnSpinner = document.getElementById('submit-btn-spinner');
  
  const sqlSection = document.getElementById('sql-section');
  const sqlCodeContainer = document.getElementById('sql-code');
  const queryTypeBadge = document.getElementById('query-type-badge');
  const copySqlBtn = document.getElementById('copy-sql-btn');
  
  const securityBanner = document.getElementById('security-banner');
  const bannerTitle = document.getElementById('banner-title');
  const bannerDesc = document.getElementById('banner-desc');
  const bannerActions = document.getElementById('banner-actions');
  const confirmBtn = document.getElementById('confirm-write-btn');
  const cancelBtn = document.getElementById('cancel-write-btn');
  
  const tableWrapper = document.getElementById('table-wrapper');
  const jsonView = document.getElementById('json-view');
  const tableToolbar = document.getElementById('table-toolbar');
  const rowCountBadge = document.getElementById('row-count-badge');
  const latencyBadge = document.getElementById('latency-badge');
  const exportCsvBtn = document.getElementById('export-csv-btn');
  const exportJsonBtn = document.getElementById('export-json-btn');
  
  const tabTableBtn = document.getElementById('tab-table');
  const tabJsonBtn = document.getElementById('tab-json');
  
  const statProducts = document.getElementById('stat-products');
  const statLowStock = document.getElementById('stat-low-stock');
  const statSuppliers = document.getElementById('stat-suppliers');
  const statShipments = document.getElementById('stat-shipments');
  const dbStatusText = document.getElementById('db-status-text');
  
  let currentResults = [];
  let currentPendingSql = null;
  let activeTab = 'table';

  // Load Database Stats
  async function loadStats() {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'connected') {
          statProducts.textContent = data.total_products;
          statLowStock.textContent = data.low_stock;
          statSuppliers.textContent = data.total_suppliers;
          statShipments.textContent = data.recent_shipments;
          dbStatusText.textContent = 'PostgreSQL Connected';
        }
      }
    } catch (e) {
      console.warn('Failed to load stats', e);
      dbStatusText.textContent = 'Database Offline';
    }
  }

  loadStats();

  // Preset Chips
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const query = chip.getAttribute('data-query');
      if (query) {
        queryInput.value = query;
        queryForm.dispatchEvent(new Event('submit'));
      }
    });
  });

  // Table Accordion Toggle
  document.querySelectorAll('.table-header').forEach(header => {
    header.addEventListener('click', () => {
      const parent = header.closest('.table-item');
      parent.classList.toggle('open');
    });
  });

  // Tab switching
  tabTableBtn.addEventListener('click', () => switchTab('table'));
  tabJsonBtn.addEventListener('click', () => switchTab('json'));

  function switchTab(tab) {
    activeTab = tab;
    if (tab === 'table') {
      tabTableBtn.classList.add('active');
      tabJsonBtn.classList.remove('active');
      tableWrapper.style.display = 'block';
      jsonView.style.display = 'none';
    } else {
      tabJsonBtn.classList.add('active');
      tabTableBtn.classList.remove('active');
      tableWrapper.style.display = 'none';
      jsonView.style.display = 'block';
    }
  }

  // Handle Query Submission
  queryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = queryInput.value.trim();
    if (!question) return;

    setLoading(true);
    resetOutputs();

    const startTime = performance.now();

    try {
      const res = await fetch('/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });

      const data = await res.json();
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      latencyBadge.textContent = `${latency}ms`;

      if (!res.ok) {
        throw new Error(data.detail || 'An error occurred during query generation.');
      }

      handleAskResponse(data);
    } catch (err) {
      showErrorState(err.message);
    } finally {
      setLoading(false);
    }
  });

  function handleAskResponse(data) {
    sqlSection.style.display = 'flex';
    sqlCodeContainer.textContent = data.sql || '-- No SQL generated';
    currentPendingSql = data.sql;

    if (data.blocked) {
      // DDL Blocked
      queryTypeBadge.className = 'badge-tag badge-blocked';
      queryTypeBadge.textContent = `BLOCKED (${data.keyword || 'DDL'})`;
      
      securityBanner.className = 'security-banner blocked';
      securityBanner.style.display = 'flex';
      bannerTitle.textContent = 'Schema-Modifying Operation Blocked';
      bannerDesc.textContent = data.message || 'DDL statements like DROP, ALTER, and TRUNCATE are blocked for database integrity.';
      bannerActions.style.display = 'none';
      
      showEmptyState('Security Policy Enforced', 'Query was prevented from executing.');
      return;
    }

    if (data.requires_confirmation) {
      // DML Write needs user confirmation
      queryTypeBadge.className = 'badge-tag badge-write';
      queryTypeBadge.textContent = `WRITE (${data.keyword || 'DML'})`;
      
      securityBanner.className = 'security-banner write';
      securityBanner.style.display = 'flex';
      bannerTitle.textContent = 'Write Operation Confirmation Required';
      bannerDesc.textContent = data.message || `This query modifies data in your database. Click below to approve execution.`;
      bannerActions.style.display = 'flex';

      showEmptyState('Awaiting Confirmation', 'Click "Confirm & Execute" to apply this change.');
      return;
    }

    // Read Query (SELECT)
    queryTypeBadge.className = 'badge-tag badge-read';
    queryTypeBadge.textContent = 'READ (SELECT)';
    securityBanner.style.display = 'none';

    renderResults(data.results || []);
  }

  // Execute Write Query on Confirmation
  confirmBtn.addEventListener('click', async () => {
    if (!currentPendingSql) return;

    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Executing...';

    const startTime = performance.now();

    try {
      const res = await fetch('/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: currentPendingSql })
      });

      const data = await res.json();
      const endTime = performance.now();
      latencyBadge.textContent = `${Math.round(endTime - startTime)}ms`;

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to execute query.');
      }

      showToast('Write query executed successfully!');
      securityBanner.style.display = 'none';
      renderResults(data.results || []);
      loadStats(); // refresh warehouse counters
    } catch (err) {
      showToast(`Execution error: ${err.message}`);
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirm & Execute';
    }
  });

  cancelBtn.addEventListener('click', () => {
    securityBanner.style.display = 'none';
    showToast('Write query execution cancelled.');
    showEmptyState('Execution Cancelled', 'No modifications were made to the database.');
  });

  // Render Table & JSON
  function renderResults(results) {
    currentResults = results;
    jsonView.textContent = JSON.stringify(results, null, 2);

    if (!results || results.length === 0) {
      rowCountBadge.textContent = '0 rows';
      tableToolbar.style.display = 'none';
      tableWrapper.innerHTML = `
        <div class="empty-state">
          <svg class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <div class="empty-title">Query returned 0 rows</div>
          <div class="empty-subtitle">The query executed successfully without errors.</div>
        </div>
      `;
      return;
    }

    rowCountBadge.textContent = `${results.length} row${results.length === 1 ? '' : 's'}`;
    tableToolbar.style.display = 'flex';

    const columns = Object.keys(results[0]);

    let html = '<table class="data-table"><thead><tr>';
    columns.forEach(col => {
      html += `<th>${escapeHtml(col)}</th>`;
    });
    html += '</tr></thead><tbody>';

    results.forEach(row => {
      html += '<tr>';
      columns.forEach(col => {
        const val = row[col];
        html += `<td>${val === null ? '<span style="color: var(--text-muted);">null</span>' : escapeHtml(String(val))}</td>`;
      });
      html += '</tr>';
    });

    html += '</tbody></table>';
    tableWrapper.innerHTML = html;
  }

  function showEmptyState(title, subtitle) {
    rowCountBadge.textContent = '0 rows';
    tableToolbar.style.display = 'none';
    tableWrapper.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <div class="empty-title">${escapeHtml(title)}</div>
        <div class="empty-subtitle">${escapeHtml(subtitle)}</div>
      </div>
    `;
  }

  function showErrorState(message) {
    sqlSection.style.display = 'none';
    securityBanner.style.display = 'none';
    rowCountBadge.textContent = 'Error';
    tableToolbar.style.display = 'none';
    tableWrapper.innerHTML = `
      <div class="empty-state" style="color: var(--accent-rose);">
        <svg class="empty-icon" style="color: var(--accent-rose);" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <div class="empty-title" style="color: var(--accent-rose);">Execution Failed</div>
        <div class="empty-subtitle">${escapeHtml(message)}</div>
      </div>
    `;
  }

  function resetOutputs() {
    sqlSection.style.display = 'none';
    securityBanner.style.display = 'none';
    tableToolbar.style.display = 'none';
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    if (isLoading) {
      submitBtnText.style.display = 'none';
      submitBtnSpinner.style.display = 'block';
    } else {
      submitBtnText.style.display = 'block';
      submitBtnSpinner.style.display = 'none';
    }
  }

  // Copy SQL button
  copySqlBtn.addEventListener('click', () => {
    if (sqlCodeContainer.textContent) {
      navigator.clipboard.writeText(sqlCodeContainer.textContent);
      showToast('SQL query copied to clipboard!');
    }
  });

  // Export CSV
  exportCsvBtn.addEventListener('click', () => {
    if (!currentResults || currentResults.length === 0) return;
    const headers = Object.keys(currentResults[0]);
    const rows = currentResults.map(row => 
      headers.map(h => JSON.stringify(row[h] ?? '')).join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadFile(csvContent, 'inventory_query_results.csv', 'text/csv');
  });

  // Export JSON
  exportJsonBtn.addEventListener('click', () => {
    if (!currentResults || currentResults.length === 0) return;
    downloadFile(JSON.stringify(currentResults, null, 2), 'inventory_query_results.json', 'application/json');
  });

  function downloadFile(content, fileName, contentType) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(`Downloaded ${fileName}`);
  }

  // Toast Notifications
  function showToast(msg) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color: var(--accent-cyan)">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <span>${escapeHtml(msg)}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }
});
