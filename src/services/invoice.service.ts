/**
 * Invoice Service for Litmus Platform
 * Handles GST calculations, number-to-words conversion, structured invoice data generation,
 * and high-definition printable HTML document rendering.
 */

export interface InvoiceCompanyDetails {
  legalName: string;
  brandName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  gstin: string;
  pan: string;
  fssaiNumber: string;
  supportEmail: string;
  supportPhone: string;
  website: string;
}

export const COMPANY_DETAILS: InvoiceCompanyDetails = {
  legalName: "Sunbeam Digitals & Laboratory Solutions Pvt. Ltd.",
  brandName: "Litmus Food Testing Platform",
  addressLine1: "Biotech Hub, Building 4, Electronic City Phase 1",
  addressLine2: "Hosur Main Road, Bengaluru",
  city: "Bengaluru",
  state: "Karnataka (Code: 29)",
  pincode: "560100",
  country: "India",
  gstin: "29AAACL8899F1Z5",
  pan: "AAACL8899F",
  fssaiNumber: "10022043000189",
  supportEmail: "billing@litmuslabs.in",
  supportPhone: "+91 (080) 4567-8900",
  website: "https://litmuslabs.in"
};

/**
 * Converts a number to Indian Currency words (e.g. 5490 -> "Rupees Five Thousand Four Hundred and Ninety Only")
 */
export function numberToWordsINR(num: number): string {
  if (!num || num === 0) return "Rupees Zero Only";

  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(n: number): string {
    let str = "";
    if (n > 99) {
      str += a[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
    } else if (n > 0) {
      str += a[n];
    }
    return str.trim();
  }

  const rounded = Math.round(num);
  let crore = Math.floor(rounded / 10000000);
  let remainder = rounded % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  let thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;
  let hundredAndBelow = remainder;

  let words = "";
  if (crore > 0) words += inWords(crore) + " Crore ";
  if (lakh > 0) words += inWords(lakh) + " Lakh ";
  if (thousand > 0) words += inWords(thousand) + " Thousand ";
  if (hundredAndBelow > 0) words += inWords(hundredAndBelow);

  return `Rupees ${words.trim()} Only`;
}

/**
 * Auto-generates a standardized invoice number
 */
export function generateInvoiceNumber(bookingId: string, bookingDate?: Date): string {
  const year = bookingDate ? new Date(bookingDate).getFullYear() : new Date().getFullYear();
  const suffix = bookingId.toString().slice(-6).toUpperCase();
  return `LIT-INV-${year}-${suffix}`;
}

export interface InvoiceItem {
  slNo: number;
  description: string;
  itemType: "TEST" | "PACKAGE";
  sacCode: string; // 998346 for Technical Testing and Analysis
  sampleCount: number;
  sampleDetailsText: string;
  quantity: number;
  grossAmount: number;
  taxableAmount: number;
  cgstRate: number; // 9%
  cgstAmount: number;
  sgstRate: number; // 9%
  sgstAmount: number;
  totalAmount: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  bookingId: string;
  bookingDate: string;
  paymentStatus: string;
  paymentMethod: string;
  transactionId: string;
  company: InvoiceCompanyDetails;
  customer: {
    name: string;
    email: string;
    phone: string;
    companyName: string;
    fssaiNumber: string;
    address: string;
    state: string;
  };
  fulfillmentLab: {
    labName: string;
    nablNumber: string;
    city: string;
    state: string;
  };
  items: InvoiceItem[];
  taxSummary: {
    taxableSubtotal: number;
    cgstTotal: number;
    sgstTotal: number;
    totalGst: number;
    grandTotal: number;
    amountInWords: string;
  };
  notes: string[];
}

/**
 * Builds structured invoice data with itemized SAC and GST breakdown
 */
export function buildInvoiceData(booking: any, payment?: any): InvoiceData {
  const invoiceNum = booking.invoiceNumber || generateInvoiceNumber(booking._id, booking.bookingDate || booking.createdAt);
  const invDate = booking.invoiceDate || booking.createdAt || new Date();
  
  const user = booking.userId || {};
  const customerName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.name || "Valued Customer";
  
  const lab = booking.labId || {};
  const labName = lab.labName || (booking.metadata?.isLitmusDirect ? "Litmus Central Partner Facility" : "Litmus Smart Allocation Center");
  const nablNumber = lab.nablAccreditationNumber || (lab.isNablAccredited ? "NABL/ISO-17025" : "Accredited Network");
  const labCity = lab.location?.city || "Bengaluru";

  // Calculate items with standard 18% GST (9% CGST + 9% SGST)
  // Assuming totalAmount in booking is GST inclusive
  const items: InvoiceItem[] = (booking.items || []).map((item: any, index: number) => {
    const gross = Number(item.price) || 0;
    // Back-calculate taxable value from inclusive 18% GST: Taxable = Gross / 1.18
    const taxable = Math.round((gross / 1.18) * 100) / 100;
    const gstTotal = Math.round((gross - taxable) * 100) / 100;
    const cgst = Math.round((gstTotal / 2) * 100) / 100;
    const sgst = Math.round((gstTotal - cgst) * 100) / 100;

    let title = "Analytical Lab Testing";
    if (item.testId?.testName) title = item.testId.testName;
    else if (item.packageId?.name) title = item.packageId.name;
    else if (item.itemType === "PACKAGE") title = "Diagnostic Package";

    const samplesList = (item.samples || []).map((s: any) => {
      const parts = [s.productName];
      if (s.batchNumber) parts.push(`Batch: ${s.batchNumber}`);
      if (s.sku) parts.push(`SKU: ${s.sku}`);
      return parts.join(" | ");
    }).filter(Boolean);

    return {
      slNo: index + 1,
      description: title,
      itemType: item.itemType || "TEST",
      sacCode: "998346", // SAC for Technical testing & analysis services
      sampleCount: item.samples?.length || 1,
      sampleDetailsText: samplesList.join("; ") || "Standard Matrix Sample",
      quantity: 1,
      grossAmount: gross,
      taxableAmount: taxable,
      cgstRate: 9,
      cgstAmount: cgst,
      sgstRate: 9,
      sgstAmount: sgst,
      totalAmount: gross,
    };
  });

  const grandTotal = Number(booking.totalAmount) || items.reduce((sum, it) => sum + it.grossAmount, 0);
  const taxableSubtotal = items.reduce((sum, it) => sum + it.taxableAmount, 0);
  const cgstTotal = items.reduce((sum, it) => sum + it.cgstAmount, 0);
  const sgstTotal = items.reduce((sum, it) => sum + it.sgstAmount, 0);
  const totalGst = Math.round((cgstTotal + sgstTotal) * 100) / 100;

  const address = user.address?.street 
    ? `${user.address.street}, ${user.address.city || ""}, ${user.address.state || ""} ${user.address.zipCode || ""}`.trim()
    : "Registered Customer Address";

  return {
    invoiceNumber: invoiceNum,
    invoiceDate: new Date(invDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    bookingId: `BKG-${booking._id.toString().slice(-6).toUpperCase()}`,
    bookingDate: new Date(booking.bookingDate || booking.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    paymentStatus: booking.paymentStatus || (payment?.status === "SUCCESS" ? "SUCCESS" : "PENDING"),
    paymentMethod: payment?.method || "ONLINE (Razorpay)",
    transactionId: payment?.transactionId || `TXN-${booking._id.toString().slice(-8).toUpperCase()}`,
    company: COMPANY_DETAILS,
    customer: {
      name: customerName,
      email: user.email || "N/A",
      phone: user.phone || "N/A",
      companyName: user.companyName || "Individual / Enterprise Client",
      fssaiNumber: user.fssaiNumber || "N/A",
      address,
      state: user.address?.state || "Karnataka (29)",
    },
    fulfillmentLab: {
      labName,
      nablNumber,
      city: labCity,
      state: "India",
    },
    items,
    taxSummary: {
      taxableSubtotal,
      cgstTotal,
      sgstTotal,
      totalGst,
      grandTotal,
      amountInWords: numberToWordsINR(grandTotal),
    },
    notes: [
      "This is a system-generated Tax Invoice under Section 31 of the CGST Act, 2017.",
      "Service Category: Technical Testing and Analysis of Food, Agricultural & Water Matrix (SAC: 998346).",
      "Authorized digital transaction — electronic seal verified upon payment capture.",
      "For questions regarding this invoice or sample testing certificates, please contact billing@litmuslabs.in."
    ]
  };
}

/**
 * Generates an ultra-crisp, printable HTML Tax Invoice document
 */
export function generateInvoiceHtml(data: InvoiceData): string {
  const isPaid = data.paymentStatus === "SUCCESS" || data.paymentStatus === "PAID";

  const itemRows = data.items.map((it) => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: center; color: #475569;">${it.slNo}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">
        <div style="font-weight: 600; color: #0f172a;">${it.description}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${it.sampleDetailsText}</div>
      </td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: center; font-family: monospace; color: #334155;">${it.sacCode}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; font-weight: 500;">₹${it.taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; color: #475569;">
        ₹${it.cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} <span style="font-size: 10px; color: #94a3b8;">(9%)</span>
      </td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; color: #475569;">
        ₹${it.sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} <span style="font-size: 10px; color: #94a3b8;">(9%)</span>
      </td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; font-weight: 700; color: #0f172a;">₹${it.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice - ${data.invoiceNumber}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      padding: 32px 16px;
      -webkit-font-smoothing: antialiased;
    }
    .invoice-card {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
      padding: 36px 40px;
      position: relative;
      overflow: hidden;
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 80px;
      font-weight: 900;
      letter-spacing: 6px;
      color: ${isPaid ? "rgba(16, 185, 129, 0.06)" : "rgba(239, 68, 68, 0.06)"};
      pointer-events: none;
      user-select: none;
      z-index: 0;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 24px;
      position: relative;
      z-index: 1;
    }
    .brand-title {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #047857;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-sub {
      font-size: 12px;
      color: #64748b;
      margin-top: 3px;
      font-weight: 500;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-paid {
      background-color: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .badge-pending {
      background-color: #fffbeb;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 24px 0;
      position: relative;
      z-index: 1;
    }
    .meta-item label {
      display: block;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .meta-item span {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      margin-bottom: 24px;
      position: relative;
      z-index: 1;
    }
    .party-box h4 {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #047857;
      margin-bottom: 8px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
    }
    .party-box p {
      font-size: 12px;
      line-height: 1.5;
      color: #334155;
    }
    .party-box strong {
      color: #0f172a;
    }
    .table-container {
      margin: 24px 0;
      position: relative;
      z-index: 1;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th {
      background: #f1f5f9;
      padding: 10px 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #334155;
      border-bottom: 2px solid #cbd5e1;
    }
    .totals-area {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 2px solid #e2e8f0;
      position: relative;
      z-index: 1;
    }
    .totals-box {
      width: 320px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 13px;
      color: #475569;
    }
    .totals-row.grand {
      border-top: 2px solid #0f172a;
      margin-top: 6px;
      padding-top: 8px;
      font-size: 16px;
      font-weight: 800;
      color: #047857;
    }
    .words-box {
      max-width: 420px;
      font-size: 12px;
      color: #475569;
      background: #f8fafc;
      padding: 12px 16px;
      border-radius: 6px;
      border-left: 3px solid #047857;
    }
    .signature-area {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 36px;
      padding-top: 24px;
      border-top: 1px dashed #cbd5e1;
      position: relative;
      z-index: 1;
    }
    .notes-list {
      font-size: 10px;
      color: #64748b;
      line-height: 1.6;
      max-width: 480px;
    }
    .stamp-box {
      text-align: center;
    }
    .stamp-badge {
      display: inline-block;
      padding: 8px 16px;
      border: 2px solid #047857;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 800;
      color: #047857;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: #f0fdf4;
    }
    .action-bar {
      max-width: 820px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn-print {
      background: #047857;
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background 0.15s ease;
    }
    .btn-print:hover {
      background: #065f46;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .invoice-card {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
      .action-bar {
        display: none !important;
      }
    }
  </style>
</head>
<body>

  <div class="action-bar">
    <div style="font-size: 13px; color: #64748b;">
      Official GST Tax Invoice • <strong>${data.invoiceNumber}</strong>
    </div>
    <button class="btn-print" onclick="window.print()">
      🖨️ Print / Save as PDF
    </button>
  </div>

  <div class="invoice-card">
    <div class="watermark">${isPaid ? "PAID" : "INVOICE"}</div>

    <!-- Header Bar -->
    <div class="header-bar">
      <div>
        <div class="brand-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #047857;"><path d="m18 2-4 8 4 4-6 8"/><path d="m6 2 4 8-4 4 6 8"/></svg>
          ${data.company.brandName}
        </div>
        <div class="brand-sub">${data.company.legalName}</div>
        <div style="font-size: 11px; color: #475569; margin-top: 4px;">
          ${data.company.addressLine1}, ${data.company.city}, ${data.company.state} - ${data.company.pincode}
        </div>
        <div style="font-size: 11px; color: #475569; margin-top: 2px;">
          GSTIN: <strong>${data.company.gstin}</strong> | PAN: <strong>${data.company.pan}</strong> | FSSAI: <strong>${data.company.fssaiNumber}</strong>
        </div>
      </div>
      <div style="text-align: right;">
        <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">TAX INVOICE</h2>
        <div style="margin-top: 8px;">
          <span class="badge ${isPaid ? "badge-paid" : "badge-pending"}">
            ${isPaid ? "✓ Payment Received" : "Payment Pending"}
          </span>
        </div>
      </div>
    </div>

    <!-- Meta Details Grid -->
    <div class="meta-grid">
      <div class="meta-item">
        <label>Invoice Number</label>
        <span style="font-family: monospace; color: #047857;">${data.invoiceNumber}</span>
      </div>
      <div class="meta-item">
        <label>Invoice Date</label>
        <span>${data.invoiceDate}</span>
      </div>
      <div class="meta-item">
        <label>Booking Ref</label>
        <span style="font-family: monospace;">${data.bookingId}</span>
      </div>
      <div class="meta-item">
        <label>Payment Ref</label>
        <span style="font-size: 11px; font-family: monospace; color: #475569;">${data.transactionId}</span>
      </div>
    </div>

    <!-- Parties Grid -->
    <div class="parties-grid">
      <div class="party-box">
        <h4>Billed To (Client / Organization)</h4>
        <p><strong>${data.customer.name}</strong></p>
        ${data.customer.companyName ? `<p>${data.customer.companyName}</p>` : ""}
        <p>${data.customer.address}</p>
        <p>Email: ${data.customer.email} | Phone: ${data.customer.phone}</p>
        ${data.customer.fssaiNumber && data.customer.fssaiNumber !== "N/A" ? `<p>FSSAI Lic No: <strong>${data.customer.fssaiNumber}</strong></p>` : ""}
      </div>

      <div class="party-box">
        <h4>Fulfilling Partner Facility</h4>
        <p><strong>${data.fulfillmentLab.labName}</strong></p>
        <p>Accreditation: <strong>${data.fulfillmentLab.nablNumber}</strong></p>
        <p>Location: ${data.fulfillmentLab.city}, ${data.fulfillmentLab.state}</p>
        <p>Service Protocol: <em>NABL / FSSAI Quality Assured Testing</em></p>
      </div>
    </div>

    <!-- Items Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">#</th>
            <th>Description of Analytical Service</th>
            <th style="width: 80px; text-align: center;">SAC</th>
            <th style="width: 100px; text-align: right;">Taxable (₹)</th>
            <th style="width: 100px; text-align: right;">CGST (9%)</th>
            <th style="width: 100px; text-align: right;">SGST (9%)</th>
            <th style="width: 110px; text-align: right;">Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
    </div>

    <!-- Totals & Words -->
    <div class="totals-area">
      <div class="words-box">
        <strong style="color: #0f172a; display: block; margin-bottom: 2px;">Total in Words:</strong>
        ${data.taxSummary.amountInWords}
      </div>

      <div class="totals-box">
        <div class="totals-row">
          <span>Taxable Value:</span>
          <span>₹${data.taxSummary.taxableSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="totals-row">
          <span>CGST (9%):</span>
          <span>₹${data.taxSummary.cgstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="totals-row">
          <span>SGST (9%):</span>
          <span>₹${data.taxSummary.sgstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="totals-row">
          <span>Total GST (18%):</span>
          <span>₹${data.taxSummary.totalGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="totals-row grand">
          <span>Grand Total:</span>
          <span>₹${data.taxSummary.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>

    <!-- Footer & Notes -->
    <div class="signature-area">
      <div class="notes-list">
        <strong>Terms & Conditions:</strong>
        <ul style="padding-left: 16px; margin-top: 4px;">
          ${data.notes.map(n => `<li>${n}</li>`).join("")}
        </ul>
      </div>

      <div class="stamp-box">
        <div class="stamp-badge">
          ✓ Digitally Certified<br>
          <span style="font-size: 9px; font-weight: 500; text-transform: none;">Litmus Diagnostics Authority</span>
        </div>
      </div>
    </div>

  </div>

</body>
</html>`;
}
