/**
 * Invoice Service for Litmus Food Analytics LLP
 * Handles GST calculations, number-to-words conversion, structured invoice data generation,
 * and high-definition printable HTML document rendering matching the official Litmus invoice format.
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
  phone: string;
  email: string;
  gstin: string;
  pan: string;
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  accountHolderName: string;
}

export const COMPANY_DETAILS: InvoiceCompanyDetails = {
  legalName: "Litmus Food Analytics LLP",
  brandName: "Litmus Food Analytics LLP",
  addressLine1: "42/1667 B, Second Floor Kannanattumana Road Attaniyedath Road,",
  addressLine2: "Vennala Post, Ernakulam, Kochi",
  city: "Kochi",
  state: "32-Kerala",
  pincode: "682028",
  country: "India",
  phone: "7305018773",
  email: "litmusfoodanalytics@gmail.com",
  gstin: "32AALFL1802A1Z3",
  pan: "AALFL1802A",
  bankName: "HDFC BANK,THIRUVATHIRA NEAR STATE WARE HOUSE PUTHA",
  bankAccountNo: "50200095742462",
  bankIfsc: "HDFC0006930",
  accountHolderName: "LITMUS FOOD ANALYTICS LLP",
};

/**
 * Converts a number to Indian Currency words (e.g. 4130 -> "Four Thousand One Hundred and Thirty Rupees only")
 */
export function numberToWordsINR(num: number): string {
  if (!num || num === 0) return "Zero Rupees only";

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
      if (n > 0) str += "and ";
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

  return `${words.trim()} Rupees only`;
}

/**
 * Auto-generates a standardized invoice number matching Litmus sequence
 */
export function generateInvoiceNumber(bookingId: string, bookingDate?: Date): string {
  const d = bookingDate ? new Date(bookingDate) : new Date();
  const yearSuffix = `${String(d.getFullYear()).slice(-2)}/${String(d.getFullYear() + 1).slice(-2)}`;
  const seq = String(parseInt(bookingId.toString().slice(-4), 16) % 900 + 10);
  return `${yearSuffix}/${seq}`;
}

export interface InvoiceItem {
  slNo: number;
  itemName: string;
  itemSubtitle?: string;
  sacCode: string; // 998346 for Technical Testing and Analysis
  quantity: number;
  pricePerUnit: number;
  gstRate: number; // 18%
  gstAmount: number;
  totalAmount: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  invoiceTime: string;
  placeOfSupply: string;
  poDate: string;
  poNumber: string;
  bookingId: string;
  paymentStatus: string;
  paymentMode: string;
  transactionId: string;
  company: InvoiceCompanyDetails;
  customer: {
    name: string;
    companyName: string;
    address: string;
    phone: string;
    email: string;
    state: string;
    gstin?: string;
  };
  items: InvoiceItem[];
  totals: {
    subTotal: number;
    sgstRate: number;
    sgstAmount: number;
    cgstRate: number;
    cgstAmount: number;
    totalGstAmount: number;
    grandTotal: number;
    receivedAmount: number;
    balanceAmount: number;
    amountInWords: string;
  };
  termsAndConditions: string[];
}

/**
 * Builds structured invoice data with itemized SAC and GST breakdown
 */
export function buildInvoiceData(booking: any, payment?: any): InvoiceData {
  const d = booking.invoiceDate || booking.createdAt || new Date();
  const dateObj = new Date(d);

  const formattedDate = dateObj.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).replace(/\//g, "-");

  const formattedTime = dateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const bkgDateObj = new Date(booking.bookingDate || booking.createdAt || new Date());
  const formattedPoDate = bkgDateObj.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).replace(/\//g, "-");

  const invoiceNum = booking.invoiceNumber || generateInvoiceNumber(booking._id, dateObj);
  const poNum = booking.poNumber || `LFALLP/${String(dateObj.getFullYear()).slice(-2)}-${String(dateObj.getFullYear() + 1).slice(-2)}/${booking._id.toString().slice(-4).toUpperCase()}`;

  const user = booking.userId || {};
  const customerName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.name || "Customer";
  const customerCompanyName = user.companyName || customerName.toUpperCase();

  const customerState = user.address?.state ? `32-${user.address.state}` : "32-Kerala";
  const customerAddress = user.address?.street 
    ? `${user.address.street}, ${user.address.city || ""}, ${user.address.state || ""} - ${user.address.zipCode || ""}`.trim()
    : "KRA-149, Chittilappilly House, Krishna puram, P.O.Ollukkara, Thrissur - 680 655";

  // Calculate items with standard 18% GST (9% CGST + 9% SGST)
  const items: InvoiceItem[] = (booking.items || []).map((item: any, index: number) => {
    const gross = Number(item.price) || 0;
    // Base price before 18% GST
    const basePrice = Math.round((gross / 1.18) * 100) / 100;
    const gstAmt = Math.round((gross - basePrice) * 100) / 100;

    let mainTitle = "Food Testing";
    let subTitle = "";

    if (item.testId?.testName) {
      mainTitle = "Food Testing";
      subTitle = `(${item.testId.testName})`;
    } else if (item.packageId?.name) {
      mainTitle = "Food Testing";
      subTitle = `(${item.packageId.name})`;
    }

    if (item.samples && item.samples.length > 0 && item.samples[0].productName) {
      subTitle = `(${subTitle ? subTitle.replace(/[()]/g, '') + ' - ' : ''}${item.samples[0].productName})`;
    }

    return {
      slNo: index + 1,
      itemName: mainTitle,
      itemSubtitle: subTitle || undefined,
      sacCode: "998346",
      quantity: 1,
      pricePerUnit: basePrice > 0 ? basePrice : gross,
      gstRate: 18.0,
      gstAmount: gstAmt > 0 ? gstAmt : Math.round(gross * 0.18 * 100) / 100,
      totalAmount: gross > 0 ? gross : Math.round((basePrice + gstAmt) * 100) / 100,
    };
  });

  // If no items, generate sample placeholder item
  if (items.length === 0) {
    const gross = Number(booking.totalAmount) || 4130;
    const basePrice = Math.round((gross / 1.18) * 100) / 100;
    const gstAmt = Math.round((gross - basePrice) * 100) / 100;

    items.push({
      slNo: 1,
      itemName: "Food Testing",
      itemSubtitle: "(Nutritional Testing- Protein Bar)",
      sacCode: "998346",
      quantity: 1,
      pricePerUnit: basePrice,
      gstRate: 18.0,
      gstAmount: gstAmt,
      totalAmount: gross,
    });
  }

  const subTotal = items.reduce((sum, it) => sum + it.pricePerUnit * it.quantity, 0);
  const totalGstAmount = items.reduce((sum, it) => sum + it.gstAmount, 0);
  const grandTotal = items.reduce((sum, it) => sum + it.totalAmount, 0);
  const sgstAmount = Math.round((totalGstAmount / 2) * 100) / 100;
  const cgstAmount = Math.round((totalGstAmount - sgstAmount) * 100) / 100;

  const isPaid = booking.paymentStatus === "SUCCESS" || booking.paymentStatus === "PAID" || payment?.status === "SUCCESS";
  const receivedAmount = isPaid ? grandTotal : 0;
  const balanceAmount = grandTotal - receivedAmount;

  return {
    invoiceNumber: invoiceNum,
    invoiceDate: formattedDate,
    invoiceTime: formattedTime,
    placeOfSupply: "32-Kerala",
    poDate: formattedPoDate,
    poNumber: poNum,
    bookingId: `BKG-${booking._id.toString().slice(-6).toUpperCase()}`,
    paymentStatus: isPaid ? "PAID" : "PENDING",
    paymentMode: "LITMUS FOOD ANALYTICS LLP",
    transactionId: payment?.transactionId || `TXN-${booking._id.toString().slice(-8).toUpperCase()}`,
    company: COMPANY_DETAILS,
    customer: {
      name: customerName,
      companyName: customerCompanyName,
      address: customerAddress,
      phone: user.phone || "8089547854",
      email: user.email || "litmusfoodanalytics@gmail.com",
      state: customerState,
      gstin: user.gstin || undefined,
    },
    items,
    totals: {
      subTotal,
      sgstRate: 9.0,
      sgstAmount,
      cgstRate: 9.0,
      cgstAmount,
      totalGstAmount,
      grandTotal,
      receivedAmount,
      balanceAmount,
      amountInWords: numberToWordsINR(grandTotal),
    },
    termsAndConditions: [
      "Thanks for doing business with us!",
      "If you are deducting TDS, please deduct at the rate of 2% under Section 194 J",
    ],
  };
}

/**
 * Generates an ultra-crisp, printable HTML Tax Invoice document
 * that is pixel-perfect and exactly matches the official Litmus template.
 */
const OFFICIAL_SIGNATURE_B64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADoAAAAjCAYAAADFYhl7AAACVUlEQVR4nO2Y22rUUBSGv4nxSNWpBhGraC8UBSuKioKX4gP4EuLzeOU7+AQiCl4IFk8IMhWPBU9DOx7QIoLakQV/IMQ902Qn0yadfLAvsrNPf/Zaa69saGioJS1XZRRFPmPtB95TAXq93n91QYnjh1SYoKRxjgHzjIHQDVScoIQx2sACYyD04rgInaAGBAX7nwbuMCZC37HOhU4DD6gJQYG+u4Bv1ISwwJFi5VEJa9gIHE489x1pamethO4DPhScO0rkx50M85kFLfuKDv3WyCbgM/6cAx5b/p2x/UcV45QCYNa+3j5qQehPgWhrImeB3579n2hnt49a6GYJ9eGsRBbli8x+5Ka77NHH/Oyh53zJMXYDf/P6aphzokOa5CX5aSf8LGav6p0XAKKlSGzzvnCMMRKhW1ZYlKv9tCLmjkS9Lfwr0FUZOWHO9i192ZijQ/y8r6NjDjgC3EuNkz4v11zoceAgMCNTu6t+Ft6fe8x5BvguM6yM0MvAJ/2hvFb7rnbVTC8r8e5dUsR8xSoTrnAP9BO4r2dL024Bv4CTGYWaX07pL8fKU5kyVRLaB24Ce4ALwAEFlpir2pk4FZySePs4J4CdwBu1WQTerra5ZhUaJwUL2plrqfeTOhrmEsn5kiLtjdRZOy/fjDkvP93mOFtnEgHPsq8fqfVaYGNIMFt0pYeDLrCTl9GT2q1njqZxdtIe8J4BIjqOukC/fclL8K06u+O1duXjuS+wW66GURRNyASNK8B1akTPIXSQ6S4p+Tbzus06IBjyblYJvE+619DQQCn8A6BBfTghOX5JAAAAAElFTkSuQmCC";

export function generateInvoiceHtml(data: InvoiceData): string {
  const itemRowsHtml = data.items.map((it) => `
    <tr>
      <td style="padding: 10px 6px; font-size: 13px; text-align: center; vertical-align: top; color: #000;">${it.slNo}</td>
      <td style="padding: 10px 6px; font-size: 13px; vertical-align: top; color: #000;">
        <div style="font-weight: bold;">${it.itemName}</div>
        ${it.itemSubtitle ? `<div style="font-size: 12px; margin-top: 2px;">${it.itemSubtitle}</div>` : ""}
      </td>
      <td style="padding: 10px 6px; font-size: 13px; text-align: center; vertical-align: top; color: #000;">${it.sacCode}</td>
      <td style="padding: 10px 6px; font-size: 13px; text-align: center; vertical-align: top; color: #000;">${it.quantity}</td>
      <td style="padding: 10px 6px; font-size: 13px; text-align: right; vertical-align: top; color: #000;">₹ ${it.pricePerUnit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="padding: 10px 6px; font-size: 13px; text-align: right; vertical-align: top; color: #000;">₹ ${it.gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${it.gstRate.toFixed(1)}%)</td>
      <td style="padding: 10px 6px; font-size: 13px; text-align: right; vertical-align: top; color: #000;">₹ ${it.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${data.invoiceNumber}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 18mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: "Times New Roman", Times, Georgia, serif;
      background-color: #f8fafc;
      color: #000000;
      padding: 24px;
      -webkit-font-smoothing: antialiased;
    }
    .invoice-wrapper {
      max-width: 760px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px 45px;
      border: 1px solid #e2e8f0;
      font-family: "Times New Roman", Times, Georgia, serif;
      color: #000000;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .company-name {
      font-size: 18px;
      font-weight: bold;
      color: #000000;
      margin-bottom: 3px;
    }
    .company-details {
      font-size: 11.5px;
      color: #000000;
      line-height: 1.35;
    }
    .logo-container {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .logo-img {
      height: 48px;
      object-fit: contain;
    }
    .logo-fallback {
      text-align: right;
      font-family: sans-serif;
    }
    .logo-fallback-brand {
      font-size: 26px;
      font-weight: 800;
      color: #15803d;
      letter-spacing: -0.5px;
    }
    .logo-fallback-sub {
      font-size: 9px;
      font-weight: 700;
      color: #dc2626;
      display: block;
      margin-top: -2px;
    }
    .top-blue-line {
      border-top: 2px solid #0077b6;
      margin-top: 16px;
    }
    .invoice-title-bar {
      text-align: center;
      margin: 8px 0 16px 0;
    }
    .invoice-title {
      font-size: 20px;
      color: #0077b6;
      font-weight: normal;
      letter-spacing: 0.5px;
    }
    .details-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 22px;
      font-size: 12px;
      line-height: 1.45;
    }
    .bill-to {
      max-width: 52%;
    }
    .bill-to h3 {
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .customer-name {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 12px;
      margin-bottom: 2px;
    }
    .invoice-details {
      text-align: right;
    }
    .invoice-details h3 {
      font-size: 13px;
      font-weight: normal;
      margin-bottom: 4px;
    }
    .invoice-details table {
      margin-left: auto;
      border-collapse: collapse;
    }
    .invoice-details td {
      padding: 1.5px 0;
      font-size: 12px;
    }
    .invoice-details td:first-child {
      padding-right: 6px;
      text-align: right;
      font-weight: normal;
    }
    .invoice-details td:last-child {
      text-align: right;
      font-weight: normal;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 18px 0 10px 0;
    }
    .items-table th {
      background-color: #007799;
      color: #ffffff;
      font-size: 12px;
      font-weight: normal;
      padding: 7px 6px;
      text-align: left;
      border: none;
    }
    .items-table th.center { text-align: center; }
    .items-table th.right { text-align: right; }
    .items-total-row td {
      border-top: 1px solid #000000;
      border-bottom: 1px solid #000000;
      padding: 6px 6px;
      font-size: 13px;
      font-weight: bold;
      color: #000000;
    }
    .middle-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 16px;
      gap: 20px;
    }
    .words-and-terms {
      flex: 1;
      font-size: 12px;
    }
    .section-label {
      font-size: 12.5px;
      font-weight: bold;
      margin-bottom: 3px;
    }
    .words-text {
      margin-bottom: 16px;
    }
    .terms-text {
      font-size: 11.5px;
      line-height: 1.4;
    }
    .summary-box {
      width: 290px;
      font-size: 12px;
    }
    .summary-table {
      width: 100%;
      border-collapse: collapse;
    }
    .summary-table td {
      padding: 2.5px 0;
      font-size: 12px;
    }
    .summary-table td:last-child {
      text-align: right;
    }
    .total-highlight-row td {
      background-color: #007799;
      color: #ffffff !important;
      font-weight: bold;
      padding: 4px 6px !important;
    }
    .bottom-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 28px;
      padding-top: 12px;
      font-size: 11.5px;
      line-height: 1.45;
    }
    .pay-to {
      max-width: 55%;
    }
    .signatory {
      text-align: right;
      width: 240px;
    }
    .signature-box {
      margin: 4px 0 2px auto;
      text-align: right;
      display: flex;
      justify-content: flex-end;
    }
    .action-bar {
      max-width: 760px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: sans-serif;
    }
    .btn-download {
      background-color: #007799;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: bold;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-download:hover {
      background-color: #00607c;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .invoice-wrapper {
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
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <script>
    function downloadInvoicePdf() {
      var element = document.querySelector('.invoice-wrapper');
      var safeName = ('Invoice-' + '${data.invoiceNumber}').replace(/[/\\\\?%*:|"<>]/g, '-');
      var opt = {
        margin: [10, 12, 10, 12],
        filename: safeName + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      html2pdf().set(opt).from(element).save();
    }
  </script>
</head>
<body>

  <div class="action-bar">
    <div style="font-size: 13px; color: #475569;">
      Litmus Official Invoice • <strong>${data.invoiceNumber}</strong>
    </div>
    <button class="btn-download" onclick="downloadInvoicePdf()">
      📥 Download PDF
    </button>
  </div>

  <div class="invoice-wrapper">
    <!-- Header Top -->
    <div class="header-top">
      <div class="company-info">
        <div class="company-name">${data.company.legalName}</div>
        <div class="company-details">
          <div>${data.company.addressLine1}</div>
          <div>${data.company.addressLine2}</div>
          <div>Phone no.: ${data.company.phone}</div>
          <div>Email: ${data.company.email}</div>
          <div>GSTIN: ${data.company.gstin}</div>
          <div>State: ${data.company.state}</div>
        </div>
      </div>
      <div class="logo-container">
        <img src="/logo.png" alt="Litmus Logo" class="logo-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
        <div class="logo-fallback" style="display: none;">
          <span class="logo-fallback-brand">litmus</span>
          <span class="logo-fallback-sub">Food Analytics LLP.</span>
        </div>
      </div>
    </div>

    <!-- Blue Top Divider Line -->
    <div class="top-blue-line"></div>

    <!-- Centered Title Banner -->
    <div class="invoice-title-bar">
      <div class="invoice-title">Invoice</div>
    </div>

    <!-- Details Grid (Bill To & Invoice Details) -->
    <div class="details-grid">
      <div class="bill-to">
        <div style="margin-bottom: 8px;">Bill To</div>
        <div style="text-transform: uppercase; margin-bottom: 6px;">${data.customer.companyName || data.customer.name}</div>
        <div style="margin-bottom: 8px;">${data.customer.address}</div>
        <div style="margin-bottom: 6px;">Contact No.: ${data.customer.phone}</div>
        <div>State: ${data.customer.state}</div>
      </div>

      <div class="invoice-details">
        <div style="margin-bottom: 8px;">Invoice Details</div>
        <div>Invoice No.: ${data.invoiceNumber}</div>
        <div>Date: ${data.invoiceDate}</div>
        <div>Time: ${data.invoiceTime}</div>
        <div>Place of Supply: ${data.placeOfSupply}</div>
        <div>PO date: ${data.poDate}</div>
        <div>PO number: ${data.poNumber}</div>
      </div>
    </div>

    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="center" style="width: 30px;">#</th>
          <th>Item name</th>
          <th class="center" style="width: 80px;">HSN/ SAC</th>
          <th class="center" style="width: 65px;">Quantity</th>
          <th class="right" style="width: 95px;">Price/ unit</th>
          <th class="right" style="width: 125px;">GST</th>
          <th class="right" style="width: 95px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRowsHtml}
        <tr class="items-total-row">
          <td style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 7px 6px;"></td>
          <td style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 7px 6px; font-weight: bold; font-size: 13px;">Total</td>
          <td style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 7px 6px;"></td>
          <td style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 7px 6px;"></td>
          <td style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 7px 6px;"></td>
          <td style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 7px 6px; text-align: right; font-weight: bold; font-size: 13px;">₹ ${data.totals.totalGstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 7px 6px; text-align: right; font-weight: bold; font-size: 13px;">₹ ${data.totals.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>

    <!-- Middle Section: Words, Terms & Right Summary -->
    <div class="middle-section">
      <div class="words-and-terms">
        <div class="section-label">Invoice Amount In Words</div>
        <div class="words-text">${data.totals.amountInWords}</div>

        <div class="section-label">Terms And Conditions</div>
        <div class="terms-text">
          ${data.termsAndConditions.map((t) => `<div style="margin-bottom: 3px;">${t}</div>`).join("")}
        </div>
      </div>

      <div class="summary-box">
        <table class="summary-table">
          <tr>
            <td>Sub Total</td>
            <td>₹ ${data.totals.subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td>SGST@${data.totals.sgstRate.toFixed(1)}%</td>
            <td>₹ ${data.totals.sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td>CGST@${data.totals.cgstRate.toFixed(1)}%</td>
            <td>₹ ${data.totals.cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr class="total-highlight-row">
            <td>Total</td>
            <td>₹ ${data.totals.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td>Received</td>
            <td>₹ ${data.totals.receivedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td>Balance</td>
            <td>₹ ${data.totals.balanceAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td>Payment Mode</td>
            <td>${data.paymentMode}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Bottom Section: Pay To & Signatory -->
    <div class="bottom-section">
      <div class="pay-to">
        <div class="section-label" style="margin-bottom: 2px;">Pay To:</div>
        <div>Bank Name: ${data.company.bankName}</div>
        <div>Bank Account No.: ${data.company.bankAccountNo}</div>
        <div>Bank IFSC code: ${data.company.bankIfsc}</div>
        <div>Account Holder's Name: ${data.company.accountHolderName}</div>
      </div>

      <div class="signatory">
        <div style="font-weight: bold; margin-bottom: 4px;">
          For: ${data.company.legalName}
        </div>
        <div class="signature-box">
          <img src="/signature.png" alt="Signature" style="height: 38px; object-fit: contain;" onerror="this.src='${OFFICIAL_SIGNATURE_B64}'" />
        </div>
        <div style="font-size: 11.5px;">Authorized Signatory</div>
      </div>
    </div>

  </div>

</body>
</html>`;
}


