require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const app = express();
app.use(cors());
app.use(express.json()); 

// 1. AWS S3 Configuration
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

// 2. MongoDB Atlas Connection
mongoose.connect(process.env.MONGO_URI, { family: 4 })
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// 3. Database Schema
const BookingSchema = new mongoose.Schema({
    userId: String,
    passengerName: String,
    source: String,
    destination: String,
    transportType: String,
    hotelType: String,
    date: String,
    ticketUrl: String
});
const Booking = mongoose.model('Booking', BookingSchema);

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

// 4. API Endpoints
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        let user = await User.findOne({ email });
        if (!user) {
            user = new User({ email, password });
            await user.save();
        }
        res.status(200).json({ message: 'Login successful!', userId: user._id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/bookings/book', async (req, res) => {
    try {
        const { userId, passengerName, source, destination, date, transportType, hotelType } = req.body;

        const doc = new PDFDocument({ margin: 50 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        
        // --- Ticket UI Design ---
        doc.rect(0, 0, 612, 100).fill('#2c3e50'); 
        doc.fillColor('white').fontSize(30).text('TRAVEL1', 50, 40);
        doc.fontSize(10).text('Official E-Ticket | Cloud-Native System', 50, 75);

        doc.fillColor('black').fontSize(20).text('BOARDING PASS', 50, 130);
        doc.moveTo(50, 155).lineTo(550, 155).stroke();

        doc.fontSize(12).text(`PASSENGER: ${passengerName.toUpperCase()}`, 50, 180);
        doc.text(`TRANSPORT: ${transportType}`, 50, 205);
        doc.text(`ACCOMMODATION: ${hotelType}`, 300, 205);
        
        doc.fontSize(18).text(`${source.toUpperCase()}`, 50, 250);
        doc.fontSize(10).text('ORIGIN', 50, 270);
        
        doc.fontSize(18).text(`>>> TO >>>`, 250, 250);
        
        doc.fontSize(18).text(`${destination.toUpperCase()}`, 450, 250);
        doc.fontSize(10).text('DESTINATION', 450, 270);

        doc.moveTo(50, 310).lineTo(550, 310).stroke();
        doc.fontSize(12).text(`DATE OF TRAVEL: ${date}`, 50, 330);

        // Footer & Credits
        doc.fontSize(8).fillColor('grey').text('Prepared by Group Members:', 50, 680, {align: 'center'});
        doc.text('Varun Chiplunkar | Riya Amburle | Hadeel Baghdadi | Sanika Chougule', 50, 695, {align: 'center'});
        doc.end();

        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);
            const fileName = `T1-ticket-${Date.now()}.pdf`;

            const uploadParams = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: fileName,
                Body: pdfData,
                ContentType: 'application/pdf'
            };

            await s3Client.send(new PutObjectCommand(uploadParams));
            const ticketUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

            const newBooking = new Booking({ userId, passengerName, source, destination, date, transportType, hotelType, ticketUrl });
            await newBooking.save();

            res.status(200).json({ message: 'Success', ticketUrl });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to process booking' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 TRAVEL1 Engine Started on Port ${PORT}`));