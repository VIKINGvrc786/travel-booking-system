require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const app = express();
app.use(cors());
app.use(express.json());

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }
});

mongoose.connect(process.env.MONGO_URI, { family: 4 });

const BookingSchema = new mongoose.Schema({
    passengers: Array, contactEmail: String, phone: String,
    source: String, destination: String, transportType: String,
    hotelStay: String, date: String, ticketUrl: String
});
const Booking = mongoose.model('Booking', BookingSchema);

app.post('/api/bookings/book', async (req, res) => {
    try {
        const { passengers, contactEmail, phone, source, destination, date, transportType, hotelStay } = req.body;
        const pnr = 'VIK-' + Math.random().toString(36).substr(2, 6).toUpperCase();

        const doc = new PDFDocument({ margin: 30 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));

        // Header
        doc.rect(0, 0, 612, 100).fill('#2c3e50');
        doc.fillColor('white').fontSize(25).text('TRAVEL1 EXECUTIVE PASS', 50, 40);
        doc.fontSize(10).text('VERIFIED CLOUD DOCUMENT | AWS S3 SECURED', 50, 75);

        // Body
        doc.fillColor('black').fontSize(18).text('BOARDING PASS / E-TICKET', 50, 120);
        doc.fontSize(12).text(`PNR: ${pnr}`, 480, 120);
        doc.moveTo(50, 140).lineTo(560, 140).stroke();

        doc.fontSize(10).text(`CONTACT: ${contactEmail} | ${phone}`, 50, 155);
        doc.text(`DATE: ${date} | STAY: ${hotelStay}`, 350, 155);

        // Passenger Table
        doc.fontSize(12).text('PASSENGER MANIFEST:', 50, 190);
        let y = 210;
        passengers.forEach((p, i) => {
            doc.fontSize(10).text(`${i+1}. ${p.name.toUpperCase()} (Age: ${p.age})`, 50, y);
            doc.text(`MEAL: ${p.meal}`, 280, y);
            doc.text(`SEAT: ${11+i}B`, 480, y);
            y += 20;
        });

        // Route UI
        doc.moveTo(50, y+20).lineTo(560, y+20).stroke();
        doc.fontSize(22).text(`${source.toUpperCase()}`, 50, y+40);
        doc.fontSize(18).text('>>> TO >>>', 230, y+40);
        doc.fontSize(22).text(`${destination.toUpperCase()}`, 430, y+40);
        doc.fontSize(12).text(`MODE: ${transportType}`, 50, y+80);

        // THE VIKING WATERMARK
        doc.fontSize(70).fillColor('#f5f5f5').text('VIKING', 180, 650);
        doc.end();

        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);
            const fileName = `VIK-CLOUD-${Date.now()}.pdf`;
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
        res.status(500).json({ error: "Cloud Sync Failed" });
    }
});

app.listen(process.env.PORT || 5000);