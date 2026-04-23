const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const Booking = require('../models/Booking');

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

router.post('/book', async (req, res) => {
    try {
        const { userId, passengerName, destination, date } = req.body;

        // 1. Generate PDF Ticket in memory
        const doc = new PDFDocument();
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);
            const fileName = `ticket-${Date.now()}.pdf`;

            // 2. Upload to AWS S3 (STaaS)
            const uploadParams = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: fileName,
                Body: pdfData,
                ContentType: 'application/pdf',
                ACL: 'public-read' // Ensures the user can download it
            };

            await s3.send(new PutObjectCommand(uploadParams));
            const ticketUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

            // 3. Save to MongoDB (DBaaS)
            const newBooking = new Booking({ userId, destination, date, ticketUrl });
            await newBooking.save();

            res.status(200).json({ message: 'Booking confirmed!', ticketUrl });
        });

        // Design the PDF
        doc.fontSize(25).text('Flight E-Ticket', { align: 'center' });
        doc.moveDown();
        doc.fontSize(16).text(`Passenger: ${passengerName}`);
        doc.text(`Destination: ${destination}`);
        doc.text(`Date: ${date}`);
        doc.text(`Status: CONFIRMED`);
        doc.end();

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Booking process failed.' });
    }
});

module.exports = router;