// ... (Imports and AWS config stay same) ...

app.post('/api/bookings/book', async (req, res) => {
    try {
        const { passengerName, p2Name, contactEmail, phone, source, destination, date, transportType, hotelStay, meal } = req.body;
        const pnr = 'VIK-' + Math.random().toString(36).substr(2, 6).toUpperCase();

        const doc = new PDFDocument({ margin: 50 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));

        // Header
        doc.rect(0, 0, 612, 120).fill('#2c3e50');
        doc.fillColor('white').fontSize(35).text('TRAVEL1', 50, 40);
        doc.fontSize(10).text('OFFICIAL CLOUD BOARDING PASS | AWS S3 SECURED', 50, 85);

        // Body
        doc.fillColor('black').fontSize(22).text('ELECTRONIC TICKET', 50, 150);
        doc.fontSize(12).text(`PNR: ${pnr}`, 460, 155);
        doc.moveTo(50, 180).lineTo(550, 180).stroke();

        doc.fontSize(11).text(`PAX 1: ${passengerName.toUpperCase()}`, 50, 205);
        doc.text(`PAX 2: ${p2Name.toUpperCase()}`, 50, 225);
        doc.text(`CONTACT: ${contactEmail} | ${phone}`, 50, 245);
        
        doc.text(`CLASS: Business`, 400, 205);
        doc.text(`MEAL: ${meal}`, 400, 225);
        doc.text(`STAY: ${hotelStay}`, 400, 245);

        doc.fontSize(22).text(`${source}`, 50, 300);
        doc.fontSize(10).text('ORIGIN CITY', 50, 325);
        doc.fontSize(18).text('TO', 280, 300);
        doc.fontSize(22).text(`${destination.toUpperCase()}`, 450, 300);
        doc.fontSize(10).text('DESTINATION CITY', 450, 325);

        doc.moveTo(50, 370).lineTo(550, 370).stroke();
        doc.fontSize(14).text(`DEPARTURE DATE: ${date}`, 50, 395);
        doc.text(`TRANSPORT: ${transportType}`, 50, 420);

        // THE VIKING WATERMARK
        doc.fontSize(60).fillColor('#f8f8f8').text('VIKING', 180, 650);

        doc.end();
        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);
            const fileName = `VIK-CLOUD-${Date.now()}.pdf`;
            await s3Client.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: fileName, Body: pdfData, ContentType: 'application/pdf' }));
            const ticketUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
            const booking = new Booking({ ...req.body, ticketUrl });
            await booking.save();
            res.status(200).json({ ticketUrl });
        });
    } catch (err) { res.status(500).send("Sync Error"); }
});

app.listen(process.env.PORT || 5000);