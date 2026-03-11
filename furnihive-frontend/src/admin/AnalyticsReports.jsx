// src/admin/AnalyticsReports.jsx
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from "recharts";
import { useState, useRef, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function AnalyticsReports() {
  const [isGenerating, setIsGenerating] = useState(false);
  const reportRef = useRef(null);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    const id = Date.now();
    setNotification({ id, message, type });
    setTimeout(() => {
      setNotification(prev => prev?.id === id ? null : prev);
    }, 3000);
  };

  // Add notification styles to head
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes fadeOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
      .notification-enter {
        animation: slideIn 0.3s ease-out;
      }
      .notification-exit {
        animation: fadeOut 0.3s ease-out;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Enhanced mock data with more realistic trends
  const revenueTrend = [
    { month: 'Jan', revenue: 45000, orders: 245, users: 1200 },
    { month: 'Feb', revenue: 52000, orders: 280, users: 1350 },
    { month: 'Mar', revenue: 48000, orders: 260, users: 1420 },
    { month: 'Apr', revenue: 61000, orders: 320, users: 1580 },
    { month: 'May', revenue: 58000, orders: 310, users: 1650 },
    { month: 'Jun', revenue: 657000, orders: 3545, users: 3562 },
  ];

  const categoryPerformance = [
    { category: 'Living Room', revenue: 125000, orders: 680, growth: 12.5 },
    { category: 'Bedroom', revenue: 98000, orders: 520, growth: 8.3 },
    { category: 'Office', revenue: 87000, orders: 450, growth: 15.2 },
    { category: 'Outdoor', revenue: 76000, orders: 380, growth: -2.1 },
    { category: 'Dining', revenue: 65000, orders: 320, growth: 5.8 },
    { category: 'Storage', revenue: 54000, orders: 280, growth: 9.4 },
  ];

  const userSegmentation = [
    { segment: 'New Users', value: 35, color: '#ea580c' },
    { segment: 'Active Buyers', value: 40, color: '#fbbf24' },
    { segment: 'Inactive', value: 15, color: '#f59e0b' },
    { segment: 'Premium', value: 10, color: '#d97706' },
  ];

  const sellerMetrics = [
    { rank: 1, name: 'Modern Living Co.', sales: 245, revenue: 89000, rating: 4.9, growth: 15.2, products: 120 },
    { rank: 2, name: 'Comfort Furniture', sales: 198, revenue: 72000, rating: 4.8, growth: 12.8, products: 95 },
    { rank: 3, name: 'Elite Interiors', sales: 176, revenue: 64000, rating: 4.7, growth: 8.5, products: 88 },
    { rank: 4, name: 'Home Haven', sales: 154, revenue: 56000, rating: 4.6, growth: 6.2, products: 76 },
    { rank: 5, name: 'Urban Style', sales: 132, revenue: 48000, rating: 4.5, growth: 4.1, products: 64 },
  ];

  const platformHealth = [
    { metric: 'Server Uptime', value: 99.9, target: 99.5, status: 'excellent' },
    { metric: 'Page Load Time', value: 1.2, target: 2.0, status: 'excellent' },
    { metric: 'Error Rate', value: 0.1, target: 0.5, status: 'excellent' },
    { metric: 'API Response', value: 150, target: 200, status: 'good' },
  ];

  const COLORS = ['#ea580c', '#fbbf24', '#f59e0b', '#d97706', '#92400e', '#78350f'];

  return (
    <div className="space-y-5">
      {/* Custom Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 min-w-[300px] ${
            notification.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <span className={`text-lg ${notification.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {notification.type === 'success' ? '✓' : '⚠'}
            </span>
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header with Export Options */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--brown-700)]">Analytics & Reports</h2>
          <p className="text-sm text-[var(--brown-700)]/70">
            Core insights for your platform performance.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={generateAdminPDF}
            disabled={isGenerating}
            className="text-sm px-3 py-1.5 bg-[var(--orange-600)] text-white rounded-lg hover:brightness-95 disabled:opacity-50 transition-colors"
          >
            {isGenerating ? 'Generating...' : 'PDF Report'}
          </button>
        </div>
      </div>

      {/* Report Content - Printable */}
      <div ref={reportRef} className="space-y-5" id="admin-report-content">

      {/* Enhanced KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Revenue</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">₱657,000</div>
          <div className="text-xs mt-1 text-green-600">+12.5%</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Orders</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">3,545</div>
          <div className="text-xs mt-1 text-green-600">+8.3%</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Active Users</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">3,562</div>
          <div className="text-xs mt-1 text-green-600">+15.2%</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Avg. Order Value</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">₱185</div>
          <div className="text-xs mt-1 text-red-600">2.1%</div>
        </div>
      </section>

      {/* Platform Metrics (progress bars) */}
      <section className="bg-white border border-[var(--line-amber)] rounded-xl shadow-card p-4">
        <div className="font-semibold text-[var(--brown-700)] mb-3">Platform Metrics</div>
        <div className="space-y-4">
          {[
            { label: "New User Registrations", value: 47, target: 100, delta: "+12%" },
            { label: "Orders Completed", value: 89, target: 100, delta: "+8%" },
            { label: "Seller Engagement", value: 72, target: 100, delta: "+5%" },
          ].map((m) => {
            const pct = Math.max(0, Math.min(100, Math.round((m.value / m.target) * 100)));
            return (
              <div key={m.label}>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--orange-600)] inline-block" />
                    <span className="text-[var(--brown-700)]">{m.label}</span>
                  </div>
                  <div className="text-[var(--brown-700)]/60">{m.delta}</div>
                </div>
                <div className="mt-2 h-2.5 rounded-full bg-[var(--amber-400)]/20 border border-[var(--line-amber)]">
                  <div
                    className="h-full rounded-full bg-[var(--orange-600)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-1 text-right text-xs text-[var(--brown-700)]/60">
                  {pct}% of target
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Revenue & Orders Trend Chart */}
      <section className="bg-white border border-[var(--line-amber)] rounded-xl shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-[var(--brown-700)] text-lg">Revenue & Orders Trend</h3>
            <p className="text-sm text-[var(--brown-700)]/70">Monthly performance overview</p>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-xs border border-[var(--line-amber)] rounded-full hover:bg-[var(--cream-50)]">6M</button>
            <button className="px-3 py-1 text-xs bg-[var(--orange-600)] text-white rounded-full">1Y</button>
            <button className="px-3 py-1 text-xs border border-[var(--line-amber)] rounded-full hover:bg-[var(--cream-50)]">ALL</button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={revenueTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1c680" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              stroke="#92400e"
            />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 12 }}
              stroke="#92400e"
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              stroke="#92400e"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fffbeb',
                border: '1px solid #f59e0b',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="revenue" 
              fill="#fed7aa" 
              stroke="#ea580c" 
              strokeWidth={2}
              name="Revenue (₱)"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="orders" 
              stroke="#fbbf24" 
              strokeWidth={3}
              dot={{ fill: '#fbbf24', r: 4 }}
              name="Orders"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="users" 
              stroke="#10b981" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#10b981', r: 3 }}
              name="Active Users"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </section>

      {/* Category Performance Chart */}
      <section className="bg-white border border-[var(--line-amber)] rounded-xl shadow-card p-6">
        <div className="font-semibold text-[var(--brown-700)] mb-4">Category Performance</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={categoryPerformance}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1c680" />
            <XAxis 
              dataKey="category" 
              tick={{ fontSize: 11 }}
              stroke="#92400e"
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#92400e"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fffbeb',
                border: '1px solid #f59e0b',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar dataKey="revenue" fill="#ea580c" name="Revenue (₱)" />
            <Bar dataKey="orders" fill="#fbbf24" name="Orders" />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* User Segmentation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-[var(--line-amber)] rounded-xl shadow-card p-6">
          <div className="font-semibold text-[var(--brown-700)] mb-4">User Segmentation</div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={userSegmentation}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.segment}: ${entry.value}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {userSegmentation.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </section>

        {/* Platform Health Metrics */}
        <section className="bg-white border border-[var(--line-amber)] rounded-xl shadow-card p-6">
          <div className="font-semibold text-[var(--brown-700)] mb-4">Platform Health</div>
          <div className="space-y-4">
            {platformHealth.map((metric) => (
              <div key={metric.metric} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--brown-700)]">{metric.metric}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    metric.status === 'excellent' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {metric.status}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      metric.status === 'excellent' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${Math.min((metric.value / metric.target) * 100, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-gray-600">
                  Current: {metric.value} | Target: {metric.target}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Enhanced Top Performing Sellers */}
      <section className="bg-white border border-[var(--line-amber)] rounded-xl shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-[var(--brown-700)]">Top Performing Sellers</div>
          <button className="text-sm text-[var(--orange-600)] hover:underline">View All →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line-amber)]">
                <th className="text-left py-2 px-3 font-semibold text-[var(--brown-700)]">Rank</th>
                <th className="text-left py-2 px-3 font-semibold text-[var(--brown-700)]">Seller</th>
                <th className="text-center py-2 px-3 font-semibold text-[var(--brown-700)]">Sales</th>
                <th className="text-center py-2 px-3 font-semibold text-[var(--brown-700)]">Revenue</th>
                <th className="text-center py-2 px-3 font-semibold text-[var(--brown-700)]">Products</th>
                <th className="text-center py-2 px-3 font-semibold text-[var(--brown-700)]">Rating</th>
                <th className="text-center py-2 px-3 font-semibold text-[var(--brown-700)]">Growth</th>
              </tr>
            </thead>
            <tbody>
              {sellerMetrics.map((seller) => (
                <tr key={seller.rank} className="border-b border-[var(--line-amber)]/50 hover:bg-[var(--cream-50)]">
                  <td className="py-3 px-3">
                    <span className="h-8 w-8 grid place-items-center rounded-full bg-[var(--amber-400)]/30 border border-[var(--line-amber)] text-sm font-semibold">
                      #{seller.rank}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-[var(--brown-700)]">{seller.name}</div>
                  </td>
                  <td className="py-3 px-3 text-center">{seller.sales}</td>
                  <td className="py-3 px-3 text-center font-semibold">₱{seller.revenue.toLocaleString()}</td>
                  <td className="py-3 px-3 text-center">{seller.products}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--amber-400)]/20 border border-[var(--line-amber)] text-xs">
                      ⭐ {seller.rating}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`text-xs font-semibold ${
                      seller.growth > 10 ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {seller.growth > 0 ? '+' : ''}{seller.growth}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      </div>
    </div>
  );

  // Generate PDF function for admin reports
  async function generateAdminPDF() {
    setIsGenerating(true);
    try {
      const element = document.getElementById('admin-report-content');
      
      if (!element) {
        showNotification('Report content not found. Please try again.', 'error');
        return;
      }

      console.log('Starting admin PDF generation...');
      
      // Wait a moment for any charts to render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Clone the element for PDF generation to avoid modifying the original
      const clonedElement = element.cloneNode(true);
      
      // Create a professional report container
      const reportContainer = document.createElement('div');
      reportContainer.style.width = '800px';
      reportContainer.style.padding = '40px';
      reportContainer.style.backgroundColor = '#ffffff';
      reportContainer.style.fontFamily = 'Arial, sans-serif';
      reportContainer.style.color = '#1a1a1a';
      
      // Add report header
      const header = document.createElement('div');
      header.style.textAlign = 'center';
      header.style.marginBottom = '30px';
      header.style.borderBottom = '2px solid #ea580c';
      header.style.paddingBottom = '20px';
      header.innerHTML = `
        <h1 style="font-size: 28px; font-weight: bold; color: #92400e; margin: 0 0 10px 0;">Platform Analytics Report</h1>
        <p style="font-size: 14px; color: #666; margin: 0;">Generated on ${new Date().toLocaleDateString()}</p>
        <p style="font-size: 12px; color: #999; margin: 5px 0 0 0;">Furnihive Admin Dashboard</p>
      `;
      reportContainer.appendChild(header);
      
      // Clean and style the cloned content
      const allElements = clonedElement.querySelectorAll('*');
      allElements.forEach(el => {
        el.removeAttribute('class');
        
        if (el.tagName === 'SECTION') {
          el.style.pageBreakInside = 'avoid';
          el.style.breakInside = 'avoid';
          el.style.marginBottom = '30px';
          el.style.padding = '20px';
          el.style.border = '1px solid #e5e5e5';
          el.style.borderRadius = '8px';
          el.style.backgroundColor = '#fafafa';
        }
        
        if (el.tagName === 'H3' || el.tagName === 'H2') {
          el.style.fontSize = '18px';
          el.style.fontWeight = 'bold';
          el.style.color = '#92400e';
          el.style.marginBottom = '15px';
          el.style.marginTop = '0';
        }
        
        if (el.tagName === 'DIV' && el.querySelector('canvas, svg')) {
          el.style.textAlign = 'center';
          el.style.margin = '20px 0';
          el.style.padding = '15px';
          el.style.backgroundColor = '#ffffff';
          el.style.border = '1px solid #e5e5e5';
          el.style.borderRadius = '6px';
          el.style.maxWidth = '100%';
          el.style.overflow = 'hidden';
          el.style.pageBreakInside = 'avoid';
          el.style.breakInside = 'avoid';
          
          // Ensure chart is responsive and clean
          const chart = el.querySelector('canvas, svg');
          if (chart) {
            chart.style.maxWidth = '100%';
            chart.style.height = 'auto';
            chart.style.display = 'block';
            chart.style.margin = '0 auto';
          }
        }
      });
      
      // Style KPI cards - ensure left alignment for all text
      const kpiCards = clonedElement.querySelectorAll('.grid > div, section > div > div');
      kpiCards.forEach(card => {
        if (card.children.length > 0) {
          card.style.padding = '15px';
          card.style.border = '1px solid #e5e5e5';
          card.style.borderRadius = '6px';
          card.style.backgroundColor = '#ffffff';
          card.style.marginBottom = '10px';
          card.style.textAlign = 'left';
        }
      });

      // Ensure all text in KPI cards is left-aligned (not centered)
      const allDivs = clonedElement.querySelectorAll('div');
      allDivs.forEach(div => {
        div.style.textAlign = 'left';
      });
      
      // Style tables
      const tables = clonedElement.querySelectorAll('table');
      tables.forEach(table => {
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginTop = '15px';
        table.style.fontSize = '12px';
      });
      
      const headers = clonedElement.querySelectorAll('th');
      headers.forEach(th => {
        th.style.backgroundColor = '#f5f5f5';
        th.style.padding = '10px';
        th.style.textAlign = 'left';
        th.style.borderBottom = '2px solid #ddd';
        th.style.fontWeight = 'bold';
      });
      
      const cells = clonedElement.querySelectorAll('td');
      cells.forEach(td => {
        td.style.padding = '10px';
        td.style.borderBottom = '1px solid #eee';
      });
      
      reportContainer.appendChild(clonedElement);
      
      // Add footer
      const footer = document.createElement('div');
      footer.style.textAlign = 'center';
      footer.style.marginTop = '40px';
      footer.style.paddingTop = '20px';
      footer.style.borderTop = '1px solid #e5e5e5';
      footer.style.fontSize = '10px';
      footer.style.color = '#999';
      footer.innerHTML = `
        <p>© ${new Date().getFullYear()} Furnihive. All rights reserved.</p>
        <p>This report is confidential and for internal use only.</p>
      `;
      reportContainer.appendChild(footer);
      
      // Append to body temporarily to measure
      reportContainer.style.position = 'absolute';
      reportContainer.style.left = '-9999px';
      reportContainer.style.top = '-9999px';
      document.body.appendChild(reportContainer);
      
      // Calculate and apply smart page breaks
      const PIXELS_PER_MM = 3.779527559;
      const PAGE_HEIGHT_WITH_MARGINS_PX = 297 * PIXELS_PER_MM; // ~1123px
      
      // Get all sections in the report
      const sections = Array.from(reportContainer.querySelectorAll('section, .grid'));
      let currentPageEnd = PAGE_HEIGHT_WITH_MARGINS_PX;
      
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const sectionTop = rect.top - reportContainer.getBoundingClientRect().top;
        const sectionHeight = rect.height;
        const sectionBottom = sectionTop + sectionHeight;
        
        // Check if this section would be cut across pages
        if (sectionTop < currentPageEnd && sectionBottom > currentPageEnd) {
          // This section would be cut - push it to next page
          const spaceNeeded = currentPageEnd - sectionTop;
          section.style.marginTop = `${spaceNeeded + 20}px`;
          currentPageEnd += PAGE_HEIGHT_WITH_MARGINS_PX;
        }
        
        // If section is entirely on next page(s)
        while (sectionTop >= currentPageEnd) {
          currentPageEnd += PAGE_HEIGHT_WITH_MARGINS_PX;
        }
      });
      
      try {
        const canvas = await html2canvas(reportContainer, {
          scale: 1.5,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
          width: 800,
          height: reportContainer.scrollHeight
        });
        
        console.log('Canvas created successfully, dimensions:', canvas.width, 'x', canvas.height);
        
        if (canvas.width === 0 || canvas.height === 0) {
          throw new Error('Canvas has zero dimensions');
        }
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        // Calculate dimensions to fit within A4 margins
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 15;
        const imgWidth = pageWidth - (margin * 2);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        // Add first page
        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - (margin * 2));

        // Add additional pages if needed
        while (heightLeft > 0) {
          position = -(imgHeight - (pageHeight - (margin * 2)) + (pageHeight - (margin * 2)) - heightLeft);
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
          heightLeft -= (pageHeight - (margin * 2));
        }

        pdf.setProperties({
          title: `Admin Analytics Report - ${new Date().toLocaleDateString()}`,
          subject: 'Furnihive Platform Analytics',
          author: 'Furnihive Admin',
          keywords: 'admin, analytics, platform, report',
          creator: 'Furnihive Analytics System'
        });

        const fileName = `Furnihive-Admin-Report-${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
        
        console.log('Admin PDF saved successfully:', fileName);
        showNotification('PDF generated successfully!', 'success');
      } finally {
        // Remove report container
        document.body.removeChild(reportContainer);
      }
    } catch (error) {
      console.error('Error generating admin PDF:', error);
      showNotification(`Failed to generate PDF: ${error.message || 'Unknown error'}. Please try again.`, 'error');
    } finally {
      setIsGenerating(false);
    }
  }
}
