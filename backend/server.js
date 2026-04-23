app.post('/api/bookings/book', async (req, res) => {
    try {
        const { passengers, contactEmail, phone, source, destination, date, transportType, hotelStay } = req.body;
        
        // Safety check to prevent "undefined" errors
        if (!passengers || passengers.length === 0) {
            return res.status(400).json({ error: "No passengers provided" });
        }

        const pnr = 'VIK-' + Math.random().toString(36).substr(2, 6).toUpperCase();

        const doc = new PDFDocument({ margin: 30 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));

        // Header Design
        doc.rect(0, 0, 612, 100).fill('#2c3e50');
        doc.fillColor('white').fontSize(25).text('TRAVEL1 EXECUTIVE PASS', 50, 40);
        doc.fontSize(10).text(`VERIFIED CLOUD TICKET | PNR: ${pnr}`, 50, 75);

        // Contact Info
        doc.fillColor('black').fontSize(10).text(`EMAIL: ${contactEmail}`, 50, 120);
        doc.text(`PHONE: ${phone}`, 350, 120);
        doc.text(`DATE: ${date}`, 50, 135);
        doc.text(`HOTEL: ${hotelStay}`, 350, 135);
        doc.moveTo(50, 150).lineTo(560, 150).stroke();

        // Dynamic Passenger List
        doc.fontSize(12).text('PASSENGER MANIFEST:', 50, 170);
        let y = 190;
        passengers.forEach((p, i) => {
            doc.fontSize(10).text(`${i+1}. ${p.name.toUpperCase()} (Age: ${p.age})`, 50, y);
            doc.text(`MEAL: ${p.meal}`, 250, y);
            doc.text(`SEAT: ${10+i}A`, 450, y);
            y += 20;
        });

        // Route details
        doc.moveTo(50, y+10).lineTo(560, y+10).stroke();
        doc.fontSize(20).text(`${source.toUpperCase()}`, 50, y+30);
        doc.fontSize(10).text('ORIGIN', 50, y+55);
        doc.fontSize(20).text(`>>>`, 280, y+30);
        doc.fontSize(20).text(`${destination.toUpperCase()}`, 450, y+30);
        doc.fontSize(10).text('DESTINATION', 450, y+55);

        // Watermark
        doc.fontSize(80).fillColor('#f2f2f2').text('VIKING', 150, 600);
        doc.end();

        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);
            const fileName = `VIK-${Date.now()}.pdf`;
            
            await s3Client.send(new PutObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: fileName,
                Body: pdfData,
                ContentType: 'application/pdf'
            }));

            const ticketUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
            const booking = new Booking({ ...req.body, ticketUrl });
            await booking.save();
            res.status(200).json({ ticketUrl });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});