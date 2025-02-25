import PDFDocument from "pdfkit";

export const generateOrderBillPDF = (order, product, user, deliveryAddress) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 30,
      size: "A4",
    });

    let buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", (err) => reject(err));

    // Brand Name and Logo
    // Centered Logo
    doc.image("public/logo.png", (doc.page.width - 180) / 2, 20, {
      width: 180,
      align: "center",
    });

    // Invoice Title Section
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor("#666666")
      .text("Complete Home Solutions Under One Roof", 40, 57, {
        align: "center",
      });

    // Right-aligned "INVOICE"
    doc
      .fontSize(18)
      .fillColor("#000000")
      .text("INVOICE", 0, 60, { align: "right", width: doc.page.width - 60 });

    doc.rect(30, 95, 530, 3).fill("#FF7700");

    // Invoice Details (adjusted positioning)
    const detailsStartY = 120;
    const leftColumn = 30;
    const rightColumn = 350;

    // Left side details
    doc
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .fontSize(10)
      .text("Invoice to:", leftColumn, detailsStartY)
      .font("Helvetica")
      .text(`${user.fname} ${user.lname}`, leftColumn, detailsStartY + 15)
      .text(deliveryAddress.address, leftColumn, detailsStartY + 30)
      .text(
        `${deliveryAddress.city}, ${deliveryAddress.pincode}`,
        leftColumn,
        detailsStartY + 45
      );

    // Right side details
    doc
      .font("Helvetica-Bold")
      .text("Invoice #:", rightColumn, detailsStartY)
      .font("Helvetica")
      .text(order._id, rightColumn + 60, detailsStartY)
      .font("Helvetica-Bold")
      .text("Date:", rightColumn, detailsStartY + 15)
      .fillColor("#000000")
      .font("Helvetica")
      .text(
        new Date().toLocaleDateString(),
        rightColumn + 60,
        detailsStartY + 15
      );

    // Table Headers
    const tableTop = 200;
    doc.rect(30, tableTop, 530, 25).fill("#333333");

    // Improved column layout
    const columns = {
      sl: { x: 40, width: 30 },
      desc: { x: 80, width: 270 },
      price: { x: 360, width: 60 },
      qty: { x: 430, width: 40 },
      total: { x: 480, width: 60 },
    };

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#ffffff")
      .text("SL.", columns.sl.x, tableTop + 8)
      .text("Item Description", columns.desc.x, tableTop + 8)
      .text("Price", columns.price.x, tableTop + 8)
      .text("Qty.", columns.qty.x, tableTop + 8)
      .text("Total", columns.total.x, tableTop + 8);

    // Table Rows
    let currentY = tableTop + 25;
    let rowCount = 0;

    [
      {
        name: product.name,
        price: product.price,
        quantity: order.product.quantity,
        total: order.totalAmount,
      },
    ].forEach((item, index) => {
      if (rowCount % 2 === 0) {
        doc.rect(30, currentY, 530, 25).fill("#f9f9f9");
      }

      doc
        .fillColor("#000000")
        .text((index + 1).toString(), columns.sl.x, currentY + 8)
        .text(item.name, columns.desc.x, currentY + 8, {
          width: columns.desc.width,
        })
        .text(`${item.price.toLocaleString()}`, columns.price.x, currentY + 8)
        .text(item.quantity.toString(), columns.qty.x, currentY + 8)
        .text(`${item.total.toLocaleString()}`, columns.total.x, currentY + 8);

      currentY += 25;
      rowCount++;
    });

    // Summary Section (adjusted positioning)
    currentY += 20;
    doc
      .font("Helvetica")
      .fontSize(10)
      .text("Thank you for Shopping, Visit Again", leftColumn, currentY);

    // Totals (right-aligned)
    const totalsX = 350;
    doc
      .text("Sub Total:", totalsX, currentY)
      .text(`${order.totalAmount.toLocaleString()}`, totalsX + 150, currentY, {
        align: "right",
      })
      .text("Tax:", totalsX, currentY + 15)
      .text("0.00%", totalsX + 150, currentY + 15, { align: "right" });

    // Total with Background
    doc.rect(totalsX, currentY + 35, 220, 25).fill("#FF7700");
    doc
      .fontSize(15)
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .text("Total:", totalsX + 10, currentY + 42)
      .text(
        `${order.totalAmount.toLocaleString()}`,
        totalsX + 150,
        currentY + 42,
        { align: "right" }
      );

    // Terms and Conditions
    currentY += 80;
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("Terms & Conditions", leftColumn, currentY)
      .font("Helvetica")
      .fontSize(8)
      .text(
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
        leftColumn,
        currentY + 15
      );

    // Payment Info
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("Payment Info:", rightColumn, currentY)
      .font("Helvetica")
      .fontSize(8)
      .text("Account #: XXXX-XXXX", rightColumn, currentY + 15)
      .text("A/C Name: XXXXX", rightColumn, currentY + 30)
      .text("Bank Details: XXXXX", rightColumn, currentY + 45)
      .text("UPI Number: XXXXX", rightColumn, currentY + 60)
      .image("public/logo.png", rightColumn, currentY + 75, { width: 80 });

    // Footer
    const bottomY = doc.page.height - 80;
    doc.rect(30, bottomY, 530, 2).fill("#FF7700");

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#666666")
      .text(
        "Phone: +91 75929 00050 | Address: Koduvally, Kozhikode - 673572 | Website: www.lamprosindia.com",
        30,
        bottomY + 15,
        {
          align: "center",
          width: 530,
        }
      );

    doc.end();
  });
};

export const generateSubscriptionBillPDF = (order, user, subscriptionPlan) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 30, size: "A4" });

    let buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", (err) => reject(err));

    // Logo and Company Info

    doc.image("public/logo.png", (doc.page.width - 180) / 2, 20, {
      width: 180,
      align: "center",
    });

    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor("#666666")
      .text("Complete Home Solutions Under One Roof", 40, 57, {
        align: "center",
      });

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#000000")
      .text("Lampros Subscription Invoice", 40, 80, { align: "center" });

    doc.rect(30, 100, 530, 3).fill("#FFD700");

    // Company Details (Fetched from user.companyDetails)
    const company = user.companyDetails || {};
    const companyAddress = company.companyAddress || {};

    doc
      .fontSize(10)
      .fillColor("#444444")
      .text(`Company: ${company.companyName || "Lampros Pvt Ltd"}`, 40, 120)
      .text(`GSTIN: ${company.companyGstNumber || "N/A"}`, 40, 135)
      .text(`Email: ${company.companyEmail || "support@lampros.com"}`, 40, 150)
      .text(`Phone: ${company.companyPhone || "1800-123-456"}`, 40, 165)
      .text(
        `Address: ${companyAddress.place || "Corporate Office"}, ${
          companyAddress.pincode || "000000"
        }`,
        40,
        180
      );

    // Invoice Details
    const detailsStartY = 210;
    doc
      .fontSize(10)
      .text("Invoice #:", 40, detailsStartY)
      .text(order._id, 150, detailsStartY)
      .text("Date:", 40, detailsStartY + 15)
      .text(new Date().toLocaleDateString(), 150, detailsStartY + 15)
      .text("Customer Name:", 40, detailsStartY + 30)
      .text(`${user.fname} ${user.lname}`, 150, detailsStartY + 30)
      .text("Email:", 40, detailsStartY + 45)
      .text(user.email, 150, detailsStartY + 45);

    // Subscription Plan Details
    doc.rect(30, 260, 530, 25).fill("#333333");
    doc
      .fillColor("#ffffff")
      .text("Plan Name", 40, 270)
      .text("Duration", 300, 270)
      .text("Amount", 450, 270);

    doc
      .fillColor("#000000")
      .text(subscriptionPlan.description || "Premium Subscription", 40, 300)
      .text(subscriptionPlan.duration || "N/A", 300, 300)
      .text(`₹${order.totalAmount}`, 450, 300);

    // Total Amount
    doc.rect(350, 330, 180, 30).fill("#FFD700");
    doc
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("Total Amount:", 360, 340)
      .text(`₹${order.totalAmount}`, 500, 340, { align: "right" });

    // Thank You Note
    doc
      .fontSize(10)
      .text("Thank you for subscribing to Lampros!", 40, 390)
      .text("For any support, contact us at support@lampros.com", 40, 405);

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("Terms & Conditions")
      .font("Helvetica")
      .fontSize(8)
      .text("Lorem ipsum dolor sit amet, consectetur adipiscing elit.");

    const bottomY = doc.page.height - 80;
    doc.rect(30, bottomY, 530, 2).fill("#FFD700");

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#666666")
      .text(
        "Phone: +91 75929 00050 | Address: Koduvally, Kozhikode - 673572 | Website: www.lamprosindia.com",
        30,
        bottomY + 15,
        {
          align: "center",
          width: 530,
        }
      );

    doc.end();
  });
};
