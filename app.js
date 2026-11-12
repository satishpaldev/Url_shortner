let links = [];
let filter = 'all';
let ascending = false;
let toastTimer;
const body = document.querySelector('#links-body');

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function renderLinks() {
  const query = document.querySelector('#search-input').value.trim().toLowerCase();
  const visible = links.filter((link) => {
    const matchesQuery = `${link.slug} ${link.url}`.toLowerCase().includes(query);
    return matchesQuery && (filter === 'all' || link.status.toLowerCase() === filter);
  });
  const sorted = [...visible].sort((a, b) => ascending ? a.clicks - b.clicks : b.clicks - a.clicks);
  body.innerHTML = sorted.map((link) => `<tr>
    <td><div class="short-link"><span class="link-glyph">↗</span><a class="short-url" href="${escapeHtml(link.shortUrl)}" target="_blank" rel="noopener">${escapeHtml(link.shortUrl)}</a><button class="copy-btn" data-copy="${escapeHtml(link.shortUrl)}" aria-label="Copy short link"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg></button></div></td>
    <td><div class="destination" title="${escapeHtml(link.url)}">${escapeHtml(link.url.replace(/^https?:\/\//, ''))}</div></td>
    <td class="click-cell">${link.clicks.toLocaleString()}</td><td>${escapeHtml(link.created)}</td>
    <td><span class="status ${link.status.toLowerCase()}">${link.status}</span></td><td><button class="row-menu" aria-label="More actions">···</button></td>
  </tr>`).join('');
  document.querySelector('#empty-state').hidden = sorted.length !== 0;
  document.querySelector('#table-count').textContent = links.length;
  document.querySelector('#link-count').textContent = links.length;
  document.querySelector('#results-label').textContent = `Showing ${sorted.length} link${sorted.length === 1 ? '' : 's'}`;
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  document.querySelector('#toast-message').textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const helper = document.createElement('textarea');
    helper.value = value;
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.append(helper);
    helper.select();
    document.execCommand('copy');
    helper.remove();
  }
  showToast('Short link copied to clipboard');
}

document.querySelector('#shorten-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = document.querySelector('#long-url');
  let parsed;
  try { parsed = new URL(input.value); } catch { input.focus(); return; }
  if (!['http:', 'https:'].includes(parsed.protocol)) { input.setCustomValidity('Please use an http or https URL.'); input.reportValidity(); return; }
  input.setCustomValidity('');
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const response = await fetch('/api/shorten', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: parsed.href }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not create the short link.');
    links.unshift(data);
    input.value = '';
    document.querySelector('#search-input').value = '';
    filter = 'all';
    document.querySelector('#filter-btn').innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 7h16M7 12h10m-7 5h4"/></svg>All links<span class="filter-chevron">⌄</span>';
    renderLinks();
    showToast(`Short link ready: ${data.shortUrl}`);
  } catch (error) {
    showToast(error.message || 'Could not reach the server. Start it with node server.js.');
  } finally { button.disabled = false; }
});

document.querySelector('#search-input').addEventListener('input', renderLinks);
body.addEventListener('click', (event) => {
  const button = event.target.closest('[data-copy]');
  if (button) copyText(button.dataset.copy);
});
document.querySelector('#filter-btn').addEventListener('click', (event) => {
  filter = filter === 'all' ? 'active' : filter === 'active' ? 'paused' : 'all';
  const button = event.currentTarget;
  button.innerHTML = `<svg viewBox="0 0 24 24"><path d="M4 7h16M7 12h10m-7 5h4"/></svg>${filter[0].toUpperCase() + filter.slice(1)} links<span class="filter-chevron">⌄</span>`;
  renderLinks();
});
document.querySelector('#sort-btn').addEventListener('click', () => {
  ascending = !ascending;
  renderLinks();
  showToast(ascending ? 'Sorted by clicks: low to high' : 'Sorted by clicks: high to low');
});
document.querySelector('#export-btn').addEventListener('click', () => {
  const rows = [['Short link', 'Destination', 'Clicks', 'Created', 'Status'], ...links.map((link) => [link.shortUrl, link.url, link.clicks, link.created, link.status])];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const file = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = file; anchor.download = 'shortly-links.csv'; anchor.click(); URL.revokeObjectURL(file);
  showToast('Your links have been exported');
});
document.querySelector('#upgrade-btn').addEventListener('click', () => showToast('Pro plans are coming soon'));
document.querySelector('#mobile-menu').addEventListener('click', () => document.querySelector('#sidebar').classList.toggle('open'));
document.querySelectorAll('.nav-item[href^="#"]').forEach((item) => item.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach((nav) => nav.classList.remove('active'));
  item.classList.add('active');
  if (window.innerWidth <= 850) document.querySelector('#sidebar').classList.remove('open');
}));
fetch('/api/links').then((response) => { if (!response.ok) throw new Error('Server unavailable'); return response.json(); }).then((savedLinks) => { links = savedLinks; renderLinks(); }).catch(() => {
  renderLinks();
  showToast('Start the server with: node server.js');
});
