// ... (Previous setup and imports stay same) ...

app.post('/api/bookings/book', async (req, res) => {
    try {
        const { passengerName, age, contactEmail, phone, source, destination, date, transportType, travelClass, hotelStay, foodPref } = req.body;
        const pnr = 'VIK-' + Math.random().toString(36).substr(2, 6).toUpperCase();

        const doc = new PDFDocument({ margin: 50 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        
        // Header
        doc.rect(0, 0, 612, 120).fill('#2c3e50'); 
        doc.fillColor('white').fontSize(35).text('TRAVEL1', 50, 40);
        doc.fontSize(10).text('SECURE CLOUD BOARDING PASS | AWS VERIFIED', 50, 85);

        // Body
        doc.fillColor('black').fontSize(22).text('ELECTRONIC TICKET', 50, 150);
        doc.fontSize(12).text(`PNR: ${pnr}`, 480, 155);
        doc.moveTo(50, 180).lineTo(550, 180).stroke();

        doc.fontSize(11).text(`PASSENGER: ${passengerName.toUpperCase()} (Age: ${age})`, 50, 205);
        doc.text(`CONTACT: ${contactEmail} | ${phone}`, 50, 225);
        doc.text(`CLASS: ${travelClass}`, 400, 205);
        doc.text(`MEAL: ${foodPref}`, 400, 225);
        doc.text(`STAY: ${hotelStay}`, 400, 245);
        
        doc.fontSize(22).text(`${source}`, 50, 300);
        doc.fontSize(10).text('ORIGIN', 50, 325);
        doc.fontSize(18).text(`>>>`, 280, 300);
        doc.fontSize(22).text(`${destination}`, 450, 300);
        doc.fontSize(10).text('DESTINATION', 450, 325);

        doc.moveTo(50, 360).lineTo(550, 360).stroke();
        doc.fontSize(14).text(`DATE OF DEPARTURE: ${date}`, 50, 390);
        doc.text(`TRANSPORT MODE: ${transportType}`, 50, 420);

        // THE VIKING WATERMARK
        doc.fontSize(70).fillColor('#f5f5f5').text('VIKING', 180, 600);
        
        doc.fontSize(8).fillColor('grey').text('TRAVEL1 Systems | Customer Care: +91 98765 43210', 50, 730, {align: 'center'});
        doc.end();

        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);
            const fileName = `VIKING-TKT-${Date.now()}.pdf`;
            await s3Client.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: fileName, Body: pdfData, ContentType: 'application/pdf' }));
            const ticketUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
            const booking = new Booking({ ...req.body, ticketUrl });
            await booking.save();
            res.status(200).json({ ticketUrl });
        });
    } catch (err) { res.status(500).send("Cloud Sync Error"); }
});

app.listen(process.env.PORT || 5000);