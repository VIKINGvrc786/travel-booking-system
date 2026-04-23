// ... (Imports and DB setup same as before) ...

app.post('/api/bookings/book', async (req, res) => {
    try {
        const { passengers, contactEmail, phone, source, destination, date, transportType, hotelStay } = req.body;
        const pnr = 'VIK-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        
        // Dynamic Provider Logic
        let provider = "VIKING GLOBAL";
        let seatPrefix = "A";
        if (transportType === "Flight") { provider = "TRAVEL1 AIRLINES"; seatPrefix = "F"; }
        else if (transportType === "Train") { provider = "BHARAT EXPRESS"; seatPrefix = "B"; }
        else { provider = "GOLDEN SHUTTLE"; seatPrefix = "S"; }

        const doc = new PDFDocument({ margin: 30 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));

        // UI: Header
        doc.rect(0, 0, 612, 100).fill('#2c3e50');
        doc.fillColor('white').fontSize(25).text('TRAVEL1 EXECUTIVE PASS', 50, 40);
        doc.fontSize(10).text(`PROVIDER: ${provider} | VERIFIED BY AWS CLOUD`, 50, 75);

        // UI: Body
        doc.fillColor('black').fontSize(18).text('BOARDING DOCUMENT', 50, 120);
        doc.fontSize(12).text(`PNR: ${pnr}`, 480, 120);
        doc.moveTo(50, 140).lineTo(560, 140).stroke();

        // Contact Info
        doc.fontSize(10).text(`CONTACT EMAIL: ${contactEmail}`, 50, 155);
        doc.text(`PHONE: ${phone}`, 350, 155);
        doc.text(`DATE: ${date}`, 50, 170);
        doc.text(`STAY: ${hotelStay}`, 350, 170);

        // PASSENGER LIST
        doc.fontSize(12).text('PASSENGER MANIFEST:', 50, 200);
        doc.moveTo(50, 215).lineTo(560, 215).stroke();
        
        let yPos = 230;
        passengers.forEach((p, index) => {
            doc.fontSize(10).text(`${index + 1}. ${p.name.toUpperCase()} (Age: ${p.age})`, 50, yPos);
            doc.text(`MEAL: ${p.meal}`, 250, yPos);
            doc.text(`SEAT: ${seatPrefix}${10 + index}`, 450, yPos);
            yPos += 20;
        });

        // Route UI
        doc.fontSize(22).text(`${source}`, 50, yPos + 40);
        doc.fontSize(10).text('ORIGIN', 50, yPos + 65);
        doc.fontSize(22).text(`>>> TO >>>`, 220, yPos + 40);
        doc.fontSize(22).text(`${destination.toUpperCase()}`, 420, yPos + 40);
        doc.fontSize(10).text('DESTINATION', 420, yPos + 65);

        // THE VIKING WATERMARK
        doc.fontSize(70).fillColor('#f2f2f2').text('VIKING', 180, 650);

        doc.end();
        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);
            const fileName = `VIK-FINAL-${Date.now()}.pdf`;
            await s3Client.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: fileName, Body: pdfData, ContentType: 'application/pdf' }));
            const ticketUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
            
            const booking = new Booking({ ...req.body, ticketUrl });
            await booking.save();
            res.status(200).json({ ticketUrl });
        });
    } catch (err) { res.status(500).send("Sync Error"); }
});

app.listen(process.env.PORT || 5000);