import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../components/contexts/AuthContext.jsx";
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
  ResponsiveContainer
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * NOTE: Everything reads from local state for now (mock data).
 * When you wire the backend, replace the mock with your fetcher
 * and keep the render code as-is.
 */

const peso = (n) =>
  `₱${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function SellerAnalytics() {
  const navigate = useNavigate();

  const { user } = useAuth();
  const sellerId = user?.id;

  // Snapshot metrics derived from real order_items data
  const [snapshot, setSnapshot] = useState({
    revenue: 0,
    revenueChangePct: 0,
    orders: 0,
    ordersChangePct: 0,
  });

  // Sales overview (for now we only compute Average Order Value)
  const [salesOverview, setSalesOverview] = useState({
    aov: 0,
  });

  // Top products by units sold and revenue for this seller
  const [topProducts, setTopProducts] = useState([]);

  // Payout summary: gross sales with payouts, net earnings and pending payouts
  const [payoutsSummary, setPayoutsSummary] = useState({
    grossTotal: 0,
    netTotal: 0,
    pendingNet: 0,
  });

  // Payout history rows for this seller
  const [payoutHistory, setPayoutHistory] = useState([]);

  // Chart data
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);

  // Report filters
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [reportType, setReportType] = useState('summary');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const reportRef = useRef(null);

  // Date range filter: 7d | 30d | all
  const [range, setRange] = useState("30d");

  // Load analytics data from order_items for this seller
  useEffect(() => {
    if (!sellerId) return;
    let cancelled = false;

    (async () => {
      try {
        // Compute from-date based on selected range
        let fromISO = null;
        if (range === "7d" || range === "30d") {
          const days = range === "7d" ? 7 : 30;
          const d = new Date();
          d.setDate(d.getDate() - days);
          fromISO = d.toISOString();
        }

        let query = supabase
          .from("order_items")
          .select("order_id, qty, unit_price, product_id, title, created_at")
          .eq("seller_id", sellerId);

        if (fromISO) {
          query = query.gte("created_at", fromISO);
        }

        const { data: items, error } = await query;

        if (cancelled || error || !items) {
          if (!cancelled) {
            setSnapshot({
              revenue: 0,
              revenueChangePct: 0,
              orders: 0,
              ordersChangePct: 0,
            });
            setSalesOverview({ aov: 0 });
            setTopProducts([]);
          }
          return;
        }

        const orderIds = new Set();
        let totalSales = 0;
        const byProduct = new Map();

        items.forEach((row) => {
          if (row?.order_id) orderIds.add(row.order_id);

          const qty = Number(row?.qty || 0) || 0;
          const price = Number(row?.unit_price || 0) || 0;
          totalSales += qty * price;

          if (!row?.product_id) return;
          const key = row.product_id;
          if (!byProduct.has(key)) {
            byProduct.set(key, {
              productId: key,
              title: row.title || "Product",
              units: 0,
              revenue: 0,
            });
          }
          const entry = byProduct.get(key);
          entry.units += qty;
          entry.revenue += qty * price;
        });

        const totalOrders = orderIds.size;
        const aov = totalOrders ? totalSales / totalOrders : 0;

        const topList = Array.from(byProduct.values())
          .filter((p) => p.units > 0)
          .sort((a, b) => b.units - a.units)
          .slice(0, 10)
          .map((p, idx) => ({
            rank: idx + 1,
            title: p.title,
            units: p.units,
            revenue: p.revenue,
          }));

        if (!cancelled) {
          setSnapshot({
            revenue: totalSales,
            revenueChangePct: 0,
            orders: totalOrders,
            ordersChangePct: 0,
          });
          setSalesOverview({ aov });
          setTopProducts(topList);

          // Generate trend data
          const trendData = generateTrendData(items, range);
          setRevenueTrend(trendData);
          setCategoryData(generateCategoryData(items));
          setMonthlyData(generateMonthlyData(items));
        }
      } catch {
        if (!cancelled) {
          setSnapshot({
            revenue: 0,
            revenueChangePct: 0,
            orders: 0,
            ordersChangePct: 0,
          });
          setSalesOverview({ aov: 0 });
          setTopProducts([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sellerId, range]);

  // Load payout summary (net earnings + pending payouts) from seller_payouts for this seller
  useEffect(() => {
    if (!sellerId) return;
    let cancelled = false;

    (async () => {
      try {
        // Compute from-date based on selected range
        let fromISO = null;
        if (range === "7d" || range === "30d") {
          const days = range === "7d" ? 7 : 30;
          const d = new Date();
          d.setDate(d.getDate() - days);
          fromISO = d.toISOString();
        }

        let query = supabase
          .from("seller_payouts")
          .select("id, order_id, gross_amount, net_amount, status, created_at")
          .eq("seller_id", sellerId);

        if (fromISO) {
          query = query.gte("created_at", fromISO);
        }

        const { data: payoutRows, error } = await query;

        if (cancelled || error || !payoutRows) {
          if (!cancelled) {
            setPayoutsSummary({ grossTotal: 0, netTotal: 0, pendingNet: 0 });
            setPayoutHistory([]);
          }
          return;
        }

        let grossTotal = 0;
        let netTotal = 0; // seller earnings (83% of gross)
        let pendingNet = 0; // pending payout (83% of gross for pending rows)

        const history = payoutRows
          .slice()
          .sort((a, b) => {
            const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
            const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
            return tb - ta;
          });

        history.forEach((row) => {
          const gross = Number(row?.gross_amount || 0) || 0;
          const payout = gross * 0.83; // 83% amount to pay to seller

          grossTotal += gross;
          netTotal += payout;

          const st = String(row?.status || "").toLowerCase();
          if (st === "pending") {
            pendingNet += payout;
          }
        });

        if (!cancelled) {
          setPayoutsSummary({ grossTotal, netTotal, pendingNet });
          setPayoutHistory(history);
        }
      } catch {
        if (!cancelled) {
          setPayoutsSummary({ grossTotal: 0, netTotal: 0, pendingNet: 0 });
          setPayoutHistory([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sellerId, range]);

  // Simple CSV export with filters
  const exportCSV = () => {
    const filteredData = filterDataForExport();
    const rows = [
      ["Sales Report - " + new Date().toLocaleDateString()],
      ["Filter Period:", dateRange.start, "to", dateRange.end],
      ["Report Type:", reportType],
      [],
      ["Metric", "Value"],
      ["Total Sales (with payouts)", peso(payoutsSummary.grossTotal)],
      ["Total Orders", snapshot.orders],
      ["Net Earnings (paid + pending)", peso(payoutsSummary.netTotal)],
      ["Pending Payouts", peso(payoutsSummary.pendingNet)],
      ["Average Order Value", peso(salesOverview.aov)],
      [],
      ["Top Products", "Units", "Revenue"],
      ...filteredData.topProducts.map((p) => [p.title, p.units, peso(p.revenue)]),
      [],
      ["Payout History"],
      ["Date", "Order", "Status", "Net Amount"],
      ...filteredData.payoutHistory.map((row) => [
        new Date(row.created_at).toLocaleDateString(),
        row.order_id ? `ORD-${String(row.order_id).slice(0, 8).toUpperCase()}` : "—",
        row.status || "pending",
        peso(row.net_amount)
      ])
    ];

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics_${new Date().toISOString().slice(0, 10)}_filtered.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter data for export based on current filters
  function filterDataForExport() {
    let filteredTopProducts = [...topProducts];
    let filteredPayoutHistory = [...payoutHistory];

    // Filter by amount range
    if (minAmount) {
      const min = parseFloat(minAmount);
      filteredTopProducts = filteredTopProducts.filter(p => p.revenue >= min);
      filteredPayoutHistory = filteredPayoutHistory.filter(p => p.net_amount >= min);
    }
    
    if (maxAmount) {
      const max = parseFloat(maxAmount);
      filteredTopProducts = filteredTopProducts.filter(p => p.revenue <= max);
      filteredPayoutHistory = filteredPayoutHistory.filter(p => p.net_amount <= max);
    }

    // Filter by date range
    if (dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      
      filteredPayoutHistory = filteredPayoutHistory.filter(p => {
        const orderDate = new Date(p.created_at);
        return orderDate >= startDate && orderDate <= endDate;
      });
    }

    return {
      topProducts: filteredTopProducts,
      payoutHistory: filteredPayoutHistory
    };
  }

  // Custom notification system
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    console.log('Showing notification:', message, type);
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Apply filters function
  function applyFilters() {
    // Filter logic would go here
    console.log('Applying filters:', { dateRange, reportType, minAmount, maxAmount });
    // Trigger data refresh with new filters
  }

  // Generate PDF function
  async function generatePDF() {
    setIsGenerating(true);
    try {
      const element = document.getElementById('report-content');
      
      if (!element) {
        showNotification('Report content not found. Please try again.', 'error');
        return;
      }

      console.log('Starting PDF generation...');
      
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
        <h1 style="font-size: 28px; font-weight: bold; color: #92400e; margin: 0 0 10px 0;">Sales Analytics Report</h1>
        <p style="font-size: 14px; color: #666; margin: 0;">Generated on ${new Date().toLocaleDateString()}</p>
        <p style="font-size: 12px; color: #999; margin: 5px 0 0 0;">Furnihive Platform</p>
      `;
      reportContainer.appendChild(header);
      
      // Clean and style the cloned content
      const allElements = clonedElement.querySelectorAll('*');
      allElements.forEach(el => {
        // Remove Tailwind classes but keep structure
        el.removeAttribute('class');
        
        // Apply professional PDF styling with page break prevention
        if (el.tagName === 'SECTION') {
          el.style.pageBreakInside = 'avoid';
          el.style.breakInside = 'avoid';
          el.style.marginBottom = '30px';
          el.style.padding = '20px';
          el.style.border = '1px solid #e5e5e5';
          el.style.borderRadius = '8px';
          el.style.backgroundColor = '#fafafa';
        }
        
        if (el.tagName === 'H3') {
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
      
      // Append to body temporarily to measure
      reportContainer.style.position = 'absolute';
      reportContainer.style.left = '-9999px';
      reportContainer.style.top = '-9999px';
      document.body.appendChild(reportContainer);
      
      // Wait for charts to render
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Section-based PDF generation to prevent cutting
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      const contentHeight = pageHeight - (margin * 2);
      const contentWidthPx = contentWidth * 3.779527559; // Convert mm to px
      
      // Get sections to render on each page
      const allSections = Array.from(reportContainer.querySelectorAll('section, .grid'));
      const reportHeader = reportContainer.querySelector('div:first-child');
      
      // Group sections by page
      const page1Sections = [];
      const page2Sections = [];
      const page3Sections = [];
      
      allSections.forEach(section => {
        const text = section.textContent || '';
        if (text.includes('Payout Summary')) {
          page3Sections.push(section);
        } else if (text.includes('Sales by Category') || text.includes('Monthly Comparison')) {
          page2Sections.push(section);
        } else {
          page1Sections.push(section);
        }
      });
      
      // Helper function to render sections to a page
      async function renderPageToPDF(sectionsToRender, pageNum, totalPages) {
        if (pageNum > 1) {
          pdf.addPage();
        }
        
        // Create temporary container for this page's content
        const pageContainer = document.createElement('div');
        pageContainer.style.width = '800px';
        pageContainer.style.backgroundColor = '#ffffff';
        pageContainer.style.padding = '0';
        pageContainer.style.fontFamily = 'Arial, sans-serif';
        
        // Add header to first page only
        if (pageNum === 1 && reportHeader) {
          const headerClone = reportHeader.cloneNode(true);
          pageContainer.appendChild(headerClone);
        }
        
        // Add sections
        sectionsToRender.forEach(section => {
          const sectionClone = section.cloneNode(true);
          // Clean styling
          const allEls = sectionClone.querySelectorAll('*');
          allEls.forEach(el => {
            el.removeAttribute('class');
            if (el.style) {
              el.style.pageBreakInside = 'avoid';
              el.style.breakInside = 'avoid';
            }
          });
          pageContainer.appendChild(sectionClone);
        });
        
        // Position off-screen and capture
        pageContainer.style.position = 'absolute';
        pageContainer.style.left = '-9999px';
        pageContainer.style.top = '-9999px';
        document.body.appendChild(pageContainer);
        
        // Wait for any charts to render in the clone
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Capture the page
        const canvas = await html2canvas(pageContainer, {
          scale: 1.5,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
          width: 800,
          height: pageContainer.scrollHeight
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgHeight = (canvas.height * contentWidth) / canvas.width;
        
        pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, imgHeight);
        
        // Clean up
        document.body.removeChild(pageContainer);
      }
      
      try {
        // Render each page
        await renderPageToPDF(page1Sections, 1, 3);
        await renderPageToPDF(page2Sections, 2, 3);
        await renderPageToPDF(page3Sections, 3, 3);
        
        pdf.setProperties({
          title: `Sales Report - ${new Date().toLocaleDateString()}`,
          subject: 'Furnihive Sales Analytics',
          author: 'Furnihive Platform',
          keywords: 'sales, report, analytics',
          creator: 'Furnihive Analytics System'
        });

        const fileName = `Furnihive-Sales-Report-${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
        
        console.log('PDF saved successfully:', fileName);
        showNotification('PDF generated successfully!', 'success');
      } finally {
        document.body.removeChild(reportContainer);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      showNotification(`Failed to generate PDF: ${error.message || 'Unknown error'}. Please try again.`, 'error');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/seller")}
            className="rounded-lg border border-[var(--line-amber)] bg-white w-9 h-9 grid place-items-center hover:bg-[var(--cream-50)]"
            title="Back to Dashboard"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-semibold text-[var(--brown-700)]">
              Analytics & Reports
            </h1>
            <p className="text-xs text-gray-600">
              Track your business performance
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="text-sm px-3 py-1.5 border border-[var(--line-amber)] rounded-lg text-[var(--brown-700)] hover:bg-[var(--cream-50)] transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={generatePDF}
            disabled={isGenerating}
            className="text-sm px-3 py-1.5 bg-[var(--orange-600)] text-white rounded-lg hover:brightness-95 disabled:opacity-50 transition-colors"
          >
            {isGenerating ? 'Generating...' : 'PDF Report'}
          </button>
        </div>
      </div>

      {/* Report Filters */}
      <div className="p-4 border border-[var(--line-amber)] rounded-xl bg-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--brown-700)]">Report Filters</h3>
          <button
            onClick={applyFilters}
            className="text-xs px-3 py-1.5 bg-[var(--orange-600)] text-white rounded-md hover:brightness-95 transition-colors"
          >
            Apply Filters
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--orange-500)] focus:border-[var(--orange-500)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--orange-500)] focus:border-[var(--orange-500)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--orange-500)] focus:border-[var(--orange-500)]"
            >
              <option value="summary">Summary</option>
              <option value="detailed">Detailed</option>
              <option value="financial">Financial</option>
              <option value="products">Products</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Min Amount</label>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="0"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--orange-500)] focus:border-[var(--orange-500)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Max Amount</label>
            <input
              type="number"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              placeholder="No limit"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--orange-500)] focus:border-[var(--orange-500)]"
            />
          </div>
        </div>
      </div>
      <div ref={reportRef} className="space-y-6" id="report-content">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Sales</span>
            <span className="text-lg text-green-600"></span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{peso(payoutsSummary.grossTotal)}</div>
          {snapshot.revenueChangePct !== 0 && (
            <div className={`text-xs mt-1 ${snapshot.revenueChangePct > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {snapshot.revenueChangePct > 0 ? '' : ''} {Math.abs(snapshot.revenueChangePct)}%
            </div>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Net Earnings</span>
            <span className="text-lg text-green-600"></span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{peso(payoutsSummary.netTotal)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Orders</span>
            <span className="text-lg text-blue-600"></span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{snapshot.orders}</div>
          {snapshot.ordersChangePct !== 0 && (
            <div className={`text-xs mt-1 ${snapshot.ordersChangePct > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {snapshot.ordersChangePct > 0 ? '' : ''} {Math.abs(snapshot.ordersChangePct)}%
            </div>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Pending Payouts</span>
            <span className="text-lg text-orange-600"></span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{peso(payoutsSummary.pendingNet)}</div>
        </div>
      </div>

      {/* Top performing products */}
      <section className="rounded-2xl border border-[var(--line-amber)] bg-white">
        <div className="px-5 py-4 border-b border-[var(--line-amber)]">
          <h3 className="font-semibold text-[var(--brown-700)]">
            Top Performing Products
          </h3>
          <p className="text-xs text-gray-600">
            Your best-selling products this month
          </p>
        </div>

        <ul className="divide-y divide-[var(--line-amber)]/70">
          {topProducts.map((p) => (
            <li key={p.rank} className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-7 w-7 grid place-items-center rounded-full bg-[var(--amber-50)] border border-[var(--line-amber)] text-[var(--orange-700)] text-sm">
                  #{p.rank}
                </span>
                <div>
                  <div className="font-medium text-[var(--brown-700)] text-sm">
                    {p.title}
                  </div>
                  <div className="text-xs text-gray-600">{p.units} units sold</div>
                </div>
              </div>
              <div className="text-sm font-semibold">{peso(p.revenue)}</div>
            </li>
          ))}
        </ul>
      </section>

      {/* Sales Trend Chart */}
      <section className="rounded-2xl border border-[var(--line-amber)] bg-white">
        <div className="px-5 py-4 border-b border-[var(--line-amber)]">
          <h3 className="font-semibold text-[var(--brown-700)]">
            Sales Trend
          </h3>
          <p className="text-xs text-gray-600">
            Revenue and orders over time
          </p>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1c680" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                stroke="#92400e"
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
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#ea580c" 
                fill="#fed7aa" 
                strokeWidth={2}
                name="Revenue"
              />
              <Line 
                type="monotone" 
                dataKey="orders" 
                stroke="#fbbf24" 
                strokeWidth={2}
                dot={{ fill: '#fbbf24' }}
                name="Orders"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Category Performance */}
      <section className="rounded-2xl border border-[var(--line-amber)] bg-white">
        <div className="px-5 py-4 border-b border-[var(--line-amber)]">
          <h3 className="font-semibold text-[var(--brown-700)]">
            Sales by Category
          </h3>
          <p className="text-xs text-gray-600">
            Revenue distribution across product categories
          </p>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.category}: ${entry.percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="revenue"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Monthly Comparison */}
      <section className="rounded-2xl border border-[var(--line-amber)] bg-white">
        <div className="px-5 py-4 border-b border-[var(--line-amber)]">
          <h3 className="font-semibold text-[var(--brown-700)]">
            Monthly Comparison
          </h3>
          <p className="text-xs text-gray-600">
            Revenue and order comparison by month
          </p>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1c680" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                stroke="#92400e"
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
              <Bar dataKey="revenue" fill="#ea580c" name="Revenue" />
              <Bar dataKey="orders" fill="#fbbf24" name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Payout summary + history */}
      <section className="rounded-2xl border border-[var(--line-amber)] bg-white">
        <div className="px-5 py-4 border-b border-[var(--line-amber)]" style={{ paddingTop: '20px', paddingBottom: '20px' }}>
          <h3 className="font-semibold text-[var(--brown-700)]" style={{ fontSize: '20px', marginBottom: '12px', marginTop: '0' }}>Payout Summary</h3>
          <p style={{ fontSize: '13px', color: '#666666', lineHeight: '1.5', margin: '0' }}>
            Overview of your earnings and pending payouts for the selected period.
          </p>
        </div>

        <div className="p-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ padding: '16px', border: '1px solid #e5e5e5', borderRadius: '8px', backgroundColor: '#fffbeb' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#666666', textTransform: 'uppercase', marginBottom: '8px' }}>
              Net Earnings
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e', marginBottom: '8px' }}>{peso(payoutsSummary.netTotal)}</div>
            <p style={{ fontSize: '12px', color: '#666666', lineHeight: '1.4' }}>
              Your earnings after the 5% Furnihive commission deduction.
            </p>
          </div>

          <div style={{ padding: '16px', border: '1px solid #e5e5e5', borderRadius: '8px', backgroundColor: '#fff7ed' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#666666', textTransform: 'uppercase', marginBottom: '8px' }}>
              Pending Payouts
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e', marginBottom: '8px' }}>{peso(payoutsSummary.pendingNet)}</div>
            <p style={{ fontSize: '12px', color: '#666666', lineHeight: '1.4' }}>
              Amount from completed orders awaiting payout.
            </p>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#666666', textTransform: 'uppercase', marginBottom: '12px' }}>
            Payout History
          </div>
          <div style={{ border: '1px solid #e5e5e5', borderRadius: '8px', overflow: 'hidden' }}>
            <table className="w-full" style={{ fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#fff7ed', borderBottom: '1px solid #e5e5e5' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#92400e' }}>Date</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#92400e' }}>Order</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#92400e' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', color: '#92400e' }}>Net Amount</th>
                </tr>
              </thead>
              <tbody>
                {payoutHistory.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#666666' }}>
                      No payouts recorded for this period yet.
                    </td>
                  </tr>
                )}
                {payoutHistory.map((row) => {
                  const labelStatus = String(row.status || "").toLowerCase();
                  return (
                    <tr key={row.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '10px 12px', color: '#333333' }}>
                        {row.created_at
                          ? new Date(row.created_at).toLocaleString("en-PH", {
                              year: "numeric",
                              month: "short",
                              day: "2-digit",
                            })
                          : ""}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#333333' }}>
                        {row.order_id ? `ORD-${String(row.order_id).slice(0, 8).toUpperCase()}` : "—"}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '9999px', border: '1px solid #f1c680', fontSize: '10px', textTransform: 'capitalize', backgroundColor: 'white' }}>
                          {labelStatus || "pending"}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', color: '#92400e' }}>
                        {peso(row.net_amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}

// Helper functions for generating chart data
const COLORS = ['#ea580c', '#fbbf24', '#f59e0b', '#d97706', '#92400e', '#78350f', '#451a03', '#1c1917'];

function generateTrendData(items, range) {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const data = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const dayItems = items.filter(item => {
      const itemDate = new Date(item.created_at);
      return itemDate.toDateString() === date.toDateString();
    });
    
    const revenue = dayItems.reduce((sum, item) => sum + (item.qty * item.unit_price), 0);
    const orders = new Set(dayItems.map(item => item.order_id)).size;
    
    data.push({
      date: dateStr,
      revenue: revenue,
      orders: orders
    });
  }
  
  return data;
}

function generateCategoryData(items) {
  const categoryMap = new Map();
  
  items.forEach(item => {
    const category = item.category || 'Uncategorized';
    const revenue = item.qty * item.unit_price;
    
    if (!categoryMap.has(category)) {
      categoryMap.set(category, 0);
    }
    categoryMap.set(category, categoryMap.get(category) + revenue);
  });
  
  const total = Array.from(categoryMap.values()).reduce((sum, val) => sum + val, 0);
  
  return Array.from(categoryMap.entries()).map(([category, revenue]) => ({
    category,
    revenue,
    percentage: Math.round((revenue / total) * 100)
  }));
}

function generateMonthlyData(items) {
  const monthlyMap = new Map();
  
  items.forEach(item => {
    const date = new Date(item.created_at);
    const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    
    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, { revenue: 0, orders: new Set() });
    }
    
    const monthData = monthlyMap.get(monthKey);
    monthData.revenue += item.qty * item.unit_price;
    monthData.orders.add(item.order_id);
  });
  
  return Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      revenue: data.revenue,
      orders: data.orders.size
    }))
    .slice(-6); // Last 6 months
}

/* --- Small UI helpers --- */

function KPI({ label, value, delta, icon, accent = "", iconColor = "" }) {
  return (
    <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">{label}</div>
        <span className={`text-xl ${iconColor}`}>{icon}</span>
      </div>
      <div className="mt-1 text-2xl font-extrabold text-[var(--brown-700)]">
        {value}
      </div>
    </div>
  );
}

function OverviewCard({ label, value, change, changePositive = true }) {
  return (
    <div className="rounded-xl border border-[var(--line-amber)] bg-[var(--amber-50)]/40 p-4">
      <div className="text-sm text-gray-700">{label}</div>
      <div className="mt-1 text-2xl font-bold text-[var(--brown-700)]">{value}</div>
      <div
        className={`text-xs ${
          changePositive ? "text-emerald-600" : "text-red-600"
        }`}
      >
        {change.startsWith("+") ? change : `+${change}`}
      </div>
    </div>
  );
}
