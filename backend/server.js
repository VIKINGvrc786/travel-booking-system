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

// Schemas
const UserSchema = new mongoose.Schema({ email: { type: String, required: true }, password: { type: String, required: true } });
const User = mongoose.model('User', UserSchema);

const BookingSchema = new mongoose.Schema({
    userId: String, passengerName: String, contactEmail: String, phone: String,
    source: String, destination: String, adults: Number, children: Number,
    transportType: String, foodPref: String, hotelStay: String, date: String, ticketUrl: String
});
const Booking = mongoose.model('Booking', BookingSchema);

// Auth
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = new User({ email, password });
        await user.save();
        res.status(200).json({ userId: user._id });
    } catch (err) { res.status(500).json({ error: "Failed" }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (user) res.status(200).json({ userId: user._id });
    else res.status(401).json({ error: "Invalid credentials" });
});

// The VIKING Ticket Engine
app.post('/api/bookings/book', async (req, res) => {
    try {
        const { passengerName, contactEmail, phone, source, destination, adults, children, transportType, foodPref, hotelStay, date } = req.body;
        const pnr = 'VIK-' + Math.random().toString(36).substr(2, 6).toUpperCase();

        const doc = new PDFDocument({ margin: 50 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));

        // UI: PDF Header
        doc.rect(0, 0, 612, 120).fill('#2c3e50');
        doc.fillColor('white').fontSize(35).text('TRAVEL1', 50, 40);
        doc.fontSize(10).text('OFFICIAL CLOUD BOARDING PASS | SECURED BY AWS S3', 50, 85);

        // UI: Ticket Details
        doc.fillColor('black').fontSize(22).text('ELECTRONIC TICKET', 50, 150);
        doc.fontSize(12).text(`PNR: ${pnr}`, 460, 155);
        doc.moveTo(50, 180).lineTo(550, 180).stroke();

        doc.fontSize(11).text(`PASSENGER: ${passengerName.toUpperCase()}`, 50, 200);
        doc.text(`CONTACT: ${contactEmail} | ${phone}`, 50, 220);
        doc.text(`MEMBERS: ${adults} Adult(s), ${children} Child(ren)`, 50, 240);
        
        doc.text(`MEAL: ${foodPref}`, 400, 200);
        doc.text(`ACCOMMODATION: ${hotelStay}`, 400, 220);

        doc.fontSize(22).text(`${source.toUpperCase()}`, 50, 300);
        doc.fontSize(10).text('ORIGIN CITY', 50, 325);
        doc.fontSize(18).text('TO', 280, 300);
        doc.fontSize(22).text(`${destination.toUpperCase()}`, 450, 300);
        doc.fontSize(10).text('DESTINATION CITY', 450, 325);

        doc.moveTo(50, 360).lineTo(550, 360).stroke();
        doc.fontSize(14).text(`DATE OF DEPARTURE: ${date}`, 50, 385);
        doc.text(`MODE: ${transportType}`, 50, 415);

        // THE VIKING WATERMARK
        doc.fontSize(65).fillColor('#f2f2f2').text('VIKING', 180, 600);

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
    } catch (err) { res.status(500).send("Error"); }
});

app.listen(process.env.PORT || 5000);